import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

type PerfCallback = (metric: Metric) => void;

const reportWebVitals = (onPerfEntry?: PerfCallback) => {
    if (onPerfEntry && typeof onPerfEntry === 'function') {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
    }
};

export default reportWebVitals;
