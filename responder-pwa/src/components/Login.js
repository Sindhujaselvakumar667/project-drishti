import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin, isLoading }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Predefined user credentials (for demo purposes)
  const validCredentials = {
    'john.smith': { password: 'responder123', name: 'Officer John Smith', badge: 'ID-4567' },
    'ID-4567': { password: 'responder123', name: 'Officer John Smith', badge: 'ID-4567' },
    'jsmith': { password: 'emergency2024', name: 'Officer John Smith', badge: 'ID-4567' }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username or User ID is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const username = formData.username.toLowerCase().trim();
    const password = formData.password;

    // Check credentials
    if (validCredentials[username] && validCredentials[username].password === password) {
      const user = {
        username: username,
        name: validCredentials[username].name,
        badge: validCredentials[username].badge,
        location: 'Zone A - Sector 12',
        status: 'Available',
        loginTime: new Date().toISOString()
      };

      // Store user data in localStorage
      localStorage.setItem('responder-user', JSON.stringify(user));
      localStorage.setItem('responder-login-time', Date.now().toString());

      // Call parent login handler
      onLogin(user);
    } else {
      setErrors({
        form: 'Invalid username or password. Please try again.'
      });
    }

    setIsSubmitting(false);
  };

  const handleDemoLogin = () => {
    setFormData({
      username: 'john.smith',
      password: 'responder123'
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="emergency-pattern"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="emergency-icon">🚨</span>
          </div>
          <h1>Emergency Responder</h1>
          <p>Drishti Emergency Response System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username or User ID</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username or badge ID"
                className={errors.username ? 'error' : ''}
                autoComplete="username"
                disabled={isSubmitting}
              />
              <span className="input-icon">👤</span>
            </div>
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className={errors.password ? 'error' : ''}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {errors.form && (
            <div className="form-error">
              <span className="error-icon">⚠️</span>
              {errors.form}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner"></span>
                Signing In...
              </>
            ) : (
              <>
                <span className="login-icon">🔐</span>
                Sign In
              </>
            )}
          </button>

          <div className="demo-section">
            <p className="demo-text">Demo Credentials:</p>
            <button
              type="button"
              className="demo-button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
            >
              Use Demo Login (John Smith)
            </button>
          </div>
        </form>

        <div className="login-footer">
          <div className="security-info">
            <span className="security-icon">🔒</span>
            <span>Secure Login</span>
          </div>
          <div className="help-info">
            <p>Need help? Contact your supervisor</p>
          </div>
        </div>
      </div>

      <div className="login-info">
        <div className="credentials-card">
          <h3>Valid Test Credentials</h3>
          <div className="credential-item">
            <strong>Username:</strong> john.smith<br />
            <strong>Password:</strong> responder123
          </div>
          <div className="credential-item">
            <strong>User ID:</strong> ID-4567<br />
            <strong>Password:</strong> responder123
          </div>
          <div className="credential-item">
            <strong>Short Name:</strong> jsmith<br />
            <strong>Password:</strong> emergency2024
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
