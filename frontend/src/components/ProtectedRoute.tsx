import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { tokens, me } = useAuth();
    const loc = useLocation();
    if (!tokens) return <Navigate to="/auth" replace />;
    // Only require profile completion for students without recorded name
    const needsProfile = me?.role === 'student' && !me.first_name?.trim();
    if (needsProfile && loc.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
