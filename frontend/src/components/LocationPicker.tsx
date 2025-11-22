import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

// Load AMap JavaScript API
const loadAMapScript = () => {
    return new Promise<void>((resolve, reject) => {
        if ((window as any).AMap) {
            resolve();
            return;
        }

        // Get AMap API key from environment variables
        const amapKey = process.env.REACT_APP_AMAP_KEY || process.env.VITE_AMAP_KEY;

        if (!amapKey || amapKey === 'your_amap_api_key_here') {
            reject(new Error('AMap API key not configured. Please set REACT_APP_AMAP_KEY or VITE_AMAP_KEY environment variable.'));
            return;
        }

        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geolocation,AMap.Geocoder`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load AMap script'));
        document.head.appendChild(script);
    });
};

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface LocationPickerProps {
    value: Location | null;
    onChange: (location: Location | null) => void;
    placeholder?: string;
    className?: string;
}

// Helper function to check geolocation permission status
const checkGeolocationPermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    if (!navigator.permissions) {
        return 'unknown';
    }
    
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
        console.warn('Permission check failed:', error);
        return 'unknown';
    }
};

// Helper function to request location using AMap's geolocation service
const requestLocationAMap = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        // Try to use AMap's geolocation if available
        if ((window as any).AMap && (window as any).AMap.Geolocation) {
            const geolocation = new (window as any).AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
                convert: true,
                showButton: false,
                showMarker: false,
                showCircle: false,
                panToLocation: false,
                zoomToAccuracy: false
            });

            geolocation.getCurrentPosition((status: string, result: any) => {
                if (status === 'complete' && result && result.position) {
                    // Convert AMap position to GeolocationPosition format
                    const position = {
                        coords: {
                            latitude: result.position.lat,
                            longitude: result.position.lng,
                            accuracy: result.accuracy || 100,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null
                        },
                        timestamp: Date.now()
                    };
                    resolve(position as GeolocationPosition);
                } else {
                    reject(new Error('AMap geolocation failed'));
                }
            });
        } else {
            // Fallback to browser geolocation
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            };

            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        }
    });
};

// Helper function to get location from IP address (using Chinese services that work in China)
const getLocationFromIP = async (): Promise<Location | null> => {
    try {
        // Try Chinese IP location services that work in China without VPN
        const services = [
            {
                name: 'ip.cn',
                url: 'https://ip.cn/api/index?ip=&type=0',
                parse: (data: any) => {
                    if (data.address && data.ip) {
                        return {
                            ip: data.ip,
                            city: data.address.split(' ')[0] || 'Unknown',
                            country: 'China',
                            lat: 39.9042, // Beijing default
                            lng: 116.4074
                        };
                    }
                    return null;
                }
            },
            {
                name: 'Baidu IP Location',
                url: 'https://api.map.baidu.com/location/ip?ak=your_baidu_key&coor=bd09ll',
                parse: (data: any) => {
                    // Baidu IP location response format
                    if (data.status === 0 && data.content && data.content.point) {
                        return {
                            ip: data.content.address || 'unknown',
                            city: data.content.address_detail?.city || 'Unknown',
                            country: 'China',
                            lat: parseFloat(data.content.point.y),
                            lng: parseFloat(data.content.point.x)
                        };
                    }
                    return null;
                }
            },
            {
                name: 'ipapi.co',
                url: 'https://ipapi.co/json/',
                parse: (data: any) => {
                    if (data.latitude && data.longitude) {
                        return {
                            ip: data.ip,
                            city: data.city,
                            country: data.country_name,
                            lat: data.latitude,
                            lng: data.longitude
                        };
                    }
                    return null;
                }
            },
            {
                name: 'ip.sb',
                url: 'https://ip.sb/jsonip',
                parse: async (data: any, originalUrl: string) => {
                    if (data.ip) {
                        // Get detailed location info
                        try {
                            const detailResponse = await fetch(`https://ip.sb/geoip/${data.ip}`, {
                                headers: {
                                    'Accept': 'application/json',
                                    'User-Agent': 'ActivityPass/1.0'
                                }
                            });
                            if (detailResponse.ok) {
                                const detailData = await detailResponse.json();
                                return {
                                    ip: data.ip,
                                    city: detailData.city,
                                    country: detailData.country,
                                    lat: detailData.latitude,
                                    lng: detailData.longitude
                                };
                            }
                        } catch (e) {
                            // Return basic info
                            return {
                                ip: data.ip,
                                city: 'Unknown',
                                country: 'Unknown',
                                lat: 39.9042, // Beijing fallback
                                lng: 116.4074
                            };
                        }
                    }
                    return null;
                }
            }
        ];

        for (const service of services) {
            try {
                // Skip Baidu if no API key
                if (service.name === 'Baidu IP Location' && service.url.includes('your_baidu_key')) {
                    continue;
                }

                const response = await fetch(service.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'ActivityPass/1.0'
                    }
                });

                if (!response.ok) continue;

                const data = await response.json();
                let locationData;

                if (service.name === 'ip.sb') {
                    locationData = await service.parse(data, service.url);
                } else {
                    locationData = service.parse(data);
                }

                if (locationData && locationData.lat && locationData.lng) {
                    return {
                        lat: locationData.lat,
                        lng: locationData.lng,
                        address: locationData.city && locationData.country ?
                            `${locationData.city}, ${locationData.country}` :
                            (locationData.city || locationData.country || undefined)
                    };
                }
            } catch (serviceError) {
                console.warn(`${service.name} failed:`, serviceError);
                continue;
            }
        }

        // If all services fail, return Beijing as default for China
        console.warn('All IP geolocation services failed, using Beijing default');
        return {
            lat: 39.9042,
            lng: 116.4074,
            address: '北京市, China' // Use Chinese name
        };
    } catch (error) {
        console.warn('IP geolocation failed:', error);
        // Return Beijing as final fallback
        return {
            lat: 39.9042,
            lng: 116.4074,
            address: '北京市, China'
        };
    }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    placeholder = '',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempLocation, setTempLocation] = useState<Location | null>(value);
    const [userLocation, setUserLocation] = useState<Location | null>(null);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [isUsingIPLocation, setIsUsingIPLocation] = useState(false);
    const [isInitializingLocation, setIsInitializingLocation] = useState(false);
    const { t, i18n } = useTranslation();
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        setTempLocation(value);
    }, [value]);

    // Initialize location detection - prioritize AMap GPS like the official website
    useEffect(() => {
        const initializeLocation = async () => {
            if (userLocation || isInitializingLocation) return;

            setIsInitializingLocation(true);

            try {
                // Load AMap script first
                try {
                    await loadAMapScript();
                    console.log('AMap script loaded successfully');
                } catch (scriptError) {
                    console.warn('Failed to load AMap script, falling back to browser geolocation:', scriptError);
                }

                // Try AMap/browser GPS location first (like AMap website does)
                try {
                    console.log('Trying GPS location...');
                    const position = await requestLocationAMap();
                    const gpsLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    console.log('GPS location obtained:', gpsLocation);

                    // Check for VPN by comparing with IP location
                    const ipLocation = await getLocationFromIP();
                    if (ipLocation) {
                        const distance = calculateDistance(gpsLocation.lat, gpsLocation.lng, ipLocation.lat, ipLocation.lng);

                        // If distance is very large (>300km), likely VPN
                        if (distance > 300) {
                            console.log(`VPN detected: GPS-IP distance = ${distance.toFixed(1)}km, using IP location`);
                            setUserLocation(ipLocation);
                            setIsUsingIPLocation(true);
                        } else {
                            console.log(`Using GPS location: distance from IP = ${distance.toFixed(1)}km`);
                            setUserLocation(gpsLocation);
                            setIsUsingIPLocation(false);
                        }
                    } else {
                        // No IP location available, use GPS
                        setUserLocation(gpsLocation);
                        setIsUsingIPLocation(false);
                    }
                } catch (gpsError) {
                    console.warn('GPS location failed, falling back to IP:', gpsError);

                    // GPS failed, fall back to IP location
                    const ipLocation = await getLocationFromIP();
                    if (ipLocation) {
                        setUserLocation(ipLocation);
                        setIsUsingIPLocation(true);
                    } else {
                        // Final fallback to Beijing
                        setUserLocation({ lat: 39.9042, lng: 116.4074 });
                        setIsUsingIPLocation(true);
                    }
                }
            }
            catch (error) {
                console.warn('Location initialization failed:', error);
                // Final fallback
                const ipLocation = await getLocationFromIP();
                setUserLocation(ipLocation || { lat: 39.9042, lng: 116.4074 });
                setIsUsingIPLocation(!!ipLocation);
            } finally {
                setIsInitializingLocation(false);
            }
        };

        initializeLocation();
    }, []);

    // Reverse geocoding function using services that work in China
    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        // Try multiple geocoding services, prioritizing ones that work in China

        // First try: AMap JavaScript API (works in China, returns Chinese addresses)
        if ((window as any).AMap && (window as any).AMap.Geocoder) {
            try {
                const geocoder = new (window as any).AMap.Geocoder({
                    radius: 1000,
                    extensions: 'all',
                    lang: 'zh_cn' // Ensure Chinese language
                });

                return new Promise((resolve) => {
                    geocoder.getAddress([lng, lat], (status: string, result: any) => {
                        if (status === 'complete' && result && result.regeocode && result.regeocode.formattedAddress) {
                            // AMap returns proper Chinese addresses
                            resolve(result.regeocode.formattedAddress);
                        } else {
                            resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                        }
                    });
                });
            } catch (error) {
                console.warn('AMap JavaScript geocoding failed:', error);
            }
        }

        // Second try: AMap REST API (requires API key, works in China, returns Chinese addresses)
        try {
            // Get AMap API key from environment variables
            const amapKey = process.env.REACT_APP_AMAP_KEY || process.env.VITE_AMAP_KEY;

            if (amapKey && amapKey !== 'your_amap_api_key_here') {
                const response = await fetch(
                    `https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${lng},${lat}&extensions=base&batch=false&roadlevel=0`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === '1' && data.regeocode && data.regeocode.formatted_address) {
                        return data.regeocode.formatted_address;
                    }
                }
            }
        } catch (error) {
            console.warn('AMap REST geocoding failed:', error);
        }

        // Third try: Baidu Maps API (works in China, returns Chinese addresses)
        try {
            // Get Baidu API key from environment variables
            const baiduKey = process.env.REACT_APP_BAIDU_MAP_KEY || process.env.VITE_BAIDU_MAP_KEY;

            if (baiduKey && baiduKey !== 'your_baidu_api_key_here') {
                const response = await fetch(
                    `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${baiduKey}&output=json&coordtype=wgs84ll&location=${lat},${lng}`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 0 && data.result && data.result.formatted_address) {
                        return data.result.formatted_address;
                    }
                }
            }
        } catch (error) {
            console.warn('Baidu geocoding failed:', error);
        }

        // Fourth try: Nominatim with Chinese language preference
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN,zh,en`,
                {
                    headers: {
                        'User-Agent': 'ActivityPass/1.0',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                    return data.display_name;
                }
            }
        } catch (error) {
            console.warn('Nominatim geocoding failed:', error);
        }

        // Fifth try: Alternative Nominatim instance
        try {
            const response = await fetch(
                `https://nominatim.openstreetmaps.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN,zh,en`,
                {
                    headers: {
                        'User-Agent': 'ActivityPass/1.0',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                    return data.display_name;
                }
            }
        } catch (error) {
            console.warn('Alternative Nominatim geocoding failed:', error);
        }

        // Final fallback: return coordinates only
        console.warn('All geocoding services failed, returning coordinates');
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    const handleLocationSelect = async (lat: number, lng: number) => {
        setIsLoadingAddress(true);
        try {
            const address = await reverseGeocode(lat, lng);
            const location = { lat, lng, address };
            setTempLocation(location);
        } catch (error) {
            console.warn('Failed to get address:', error);
            const location = { lat, lng };
            setTempLocation(location);
        } finally {
            setIsLoadingAddress(false);
        }
    };

    const handleConfirm = () => {
        onChange(tempLocation);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setTempLocation(value);
        setIsOpen(false);
    };

    const formatLocationDisplay = (location: Location | null) => {
        if (!location) return '';
        if (location.address) return location.address;
        return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    };

    // Component to handle map clicks and show markers
    const LocationMarker = () => {
        const map = useMap();

        // Only center on user location initially, not when selecting points
        useEffect(() => {
            if (userLocation && map && !tempLocation) {
                // Only center if no location is selected yet
                map.setView([userLocation.lat, userLocation.lng], 13);
            }
        }, [userLocation, map, tempLocation]);

        useMapEvents({
            click(e) {
                handleLocationSelect(e.latlng.lat, e.latlng.lng);
            },
        });

        return (
            <>
                {/* User's current location marker */}
                {userLocation && (
                    <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={L.divIcon({
                            className: 'user-location-marker',
                            html: `<div style="
                                width: 20px;
                                height: 20px;
                                background-color: #3b82f6;
                                border: 3px solid white;
                                border-radius: 50%;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            "></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })}
                    >
                        <Popup>
                            <div className="text-center">
                                <div className="mb-1 font-semibold text-blue-600">
                                    {t('location.yourLocation')}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {isUsingIPLocation ?
                                        t('location.approximateLocation') :
                                        t('location.preciseLocation')
                                    }
                                </div>
                                {userLocation.address && (
                                    <div className="mt-1 text-xs text-gray-500">
                                        {userLocation.address}
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Selected location marker */}
                {tempLocation && (
                    <Marker position={[tempLocation.lat, tempLocation.lng]}>
                        <Popup>
                            <div className="text-center">
                                <div className="mb-1 font-semibold text-gray-900 dark:text-white">
                                    {t('location.selectedLocation')}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {isLoadingAddress ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-2 -ml-1 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('location.loadingAddress', { defaultValue: 'Loading address...' })}
                                        </span>
                                    ) : (
                                        formatLocationDisplay(tempLocation)
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </>
        );
    };

    // Component to set map language and customize controls
    const MapController = () => {
        const map = useMap();
        mapRef.current = map;

        useEffect(() => {
            if (map) {
                // Remove attribution
                map.attributionControl.setPrefix('');

                // Customize zoom control styling
                const zoomControl = map.zoomControl;
                if (zoomControl) {
                    const container = zoomControl.getContainer();
                    if (container) {
                        container.className = container.className.replace('leaflet-control-zoom', 'leaflet-control-zoom custom-zoom-control');
                    }
                }

                // Set map language based on i18n
                const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
                // Note: Leaflet doesn't have built-in language switching, but we can customize tooltips
                const zoomInBtn = document.querySelector('.leaflet-control-zoom-in') as HTMLElement;
                const zoomOutBtn = document.querySelector('.leaflet-control-zoom-out') as HTMLElement;

                if (zoomInBtn) {
                    zoomInBtn.title = lang === 'zh' ? '放大' : 'Zoom in';
                }
                if (zoomOutBtn) {
                    zoomOutBtn.title = lang === 'zh' ? '缩小' : 'Zoom out';
                }
            }
        }, [map, i18n.language]);

        return null;
    };

    const getInitialCenter = () => {
        if (userLocation) return [userLocation.lat, userLocation.lng];
        if (tempLocation) return [tempLocation.lat, tempLocation.lng];
        return [39.9042, 116.4074]; // Beijing, China as fallback
    };

    return (
        <div className={`relative ${className}`}>

            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between min-h-[2.5rem]"
            >
                <span className={value ? '' : 'text-gray-500 dark:text-gray-400'}>
                    {value ? formatLocationDisplay(value) : placeholder}
                </span>
                <svg
                    className="flex-shrink-0 w-4 h-4 ml-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-5xl overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {t('location.selectLocation', { defaultValue: 'Select Location' })}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('location.chooseLocation', { defaultValue: 'Choose Activity Location' })}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-2 text-gray-400 transition-colors rounded-lg hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label={t('common.close')}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                {t('location.clickToSelect', { defaultValue: 'Click on the map to select the activity location' })}
                            </p>

                            {isUsingIPLocation && (
                                <div className="p-3 mb-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                                    <div className="flex items-start">
                                        <div>
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                {t('location.vpnDetected', { defaultValue: 'VPN Detected' })}
                                            </p>
                                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                                                {t('location.vpnMessage', { defaultValue: 'We detected you might be using a VPN. The map is showing your approximate location based on your IP address.' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tempLocation && (
                                <div className="p-3 mb-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {t('location.selectedCoordinates', { defaultValue: 'Selected:' })}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                {isLoadingAddress ? (
                                                    <span>Loading address...</span>
                                                ) : (
                                                    formatLocationDisplay(tempLocation)
                                                )}
                                            </p>
                                        </div>
                                        {tempLocation.address && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {tempLocation.lat.toFixed(6)}, {tempLocation.lng.toFixed(6)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="h-[500px] rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                <MapContainer
                                    center={getInitialCenter() as [number, number]}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                    className="rounded-lg"
                                >
                                    <TileLayer
                                        url="https://webst01.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}"
                                        attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
                                    />
                                    <LocationMarker />
                                    <MapController />
                                </MapContainer>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!tempLocation}
                                    className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    {t('location.confirmLocation', { defaultValue: 'Confirm Location' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationPicker;