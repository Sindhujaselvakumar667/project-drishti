import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = () => {
    try {
      const savedUser = localStorage.getItem('responder-user');
      const loginTime = localStorage.getItem('responder-login-time');

      if (savedUser && loginTime) {
        const user = JSON.parse(savedUser);
        const loginTimestamp = parseInt(loginTime);
        const currentTime = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

        // Check if session is still valid
        if (currentTime - loginTimestamp < sessionDuration) {
          setUser(user);
          setIsAuthenticated(true);
          console.log('Restored user session:', user.name);
        } else {
          // Session expired, clear storage
          clearSession();
          console.log('Session expired, please login again');
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      setIsLoading(true);

      // Simulate authentication API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const userWithSession = {
        ...userData,
        sessionId: generateSessionId(),
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem('responder-user', JSON.stringify(userWithSession));
      localStorage.setItem('responder-login-time', Date.now().toString());

      setUser(userWithSession);
      setIsAuthenticated(true);

      console.log('User logged in successfully:', userWithSession.name);
      return { success: true, user: userWithSession };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Simulate logout API call
      await new Promise(resolve => setTimeout(resolve, 300));

      clearSession();
      console.log('User logged out successfully');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('responder-user');
    localStorage.removeItem('responder-login-time');
    localStorage.removeItem('fcm-token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updates) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updates,
      lastActivity: new Date().toISOString()
    };

    setUser(updatedUser);
    localStorage.setItem('responder-user', JSON.stringify(updatedUser));
    console.log('User updated:', updates);
  };

  const updateUserStatus = (status) => {
    updateUser({ status });
  };

  const updateUserLocation = (location) => {
    updateUser({ location });
  };

  const refreshSession = () => {
    if (user) {
      localStorage.setItem('responder-login-time', Date.now().toString());
      updateUser({ lastActivity: new Date().toISOString() });
    }
  };

  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const getSessionInfo = () => {
    if (!user) return null;

    const loginTime = localStorage.getItem('responder-login-time');
    if (!loginTime) return null;

    const loginTimestamp = parseInt(loginTime);
    const currentTime = Date.now();
    const sessionDuration = currentTime - loginTimestamp;
    const remainingTime = (24 * 60 * 60 * 1000) - sessionDuration; // 24 hours - elapsed

    return {
      loginTime: new Date(loginTimestamp),
      sessionDuration,
      remainingTime: Math.max(0, remainingTime),
      isExpired: remainingTime <= 0
    };
  };

  const isSessionValid = () => {
    const sessionInfo = getSessionInfo();
    return sessionInfo && !sessionInfo.isExpired;
  };

  // Auto-refresh session activity
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        if (isSessionValid()) {
          refreshSession();
        } else {
          logout();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const value = {
    // State
    user,
    isLoading,
    isAuthenticated,

    // Methods
    login,
    logout,
    updateUser,
    updateUserStatus,
    updateUserLocation,
    refreshSession,
    clearSession,

    // Session info
    getSessionInfo,
    isSessionValid,

    // User data helpers
    getUserName: () => user?.name || 'Unknown User',
    getUserBadge: () => user?.badge || 'Unknown',
    getUserStatus: () => user?.status || 'Unknown',
    getUserLocation: () => user?.location || 'Unknown Location'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
