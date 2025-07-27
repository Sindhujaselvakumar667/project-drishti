import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Test credentials for demo purposes
const TEST_CREDENTIALS = {
  admin: { password: 'admin123', name: 'admin', role: 'admin' },
  demo: { password: 'demo123', name: 'demo', role: 'user' },
  test: { password: 'test123', name: 'test', role: 'user' }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('drishti_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('drishti_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const testUser = TEST_CREDENTIALS[username.toLowerCase()];

      if (!testUser || testUser.password !== password) {
        throw new Error('Invalid username or password');
      }

      const userData = {
        id: username,
        username: username,
        name: testUser.name,
        role: testUser.role,
        loginTime: new Date().toISOString()
      };

      setUser(userData);
      localStorage.setItem('drishti_user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('drishti_user');
    localStorage.removeItem('drishti_event');
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
