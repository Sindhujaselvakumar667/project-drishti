import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTestCredentials, setShowTestCredentials] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/event-setup');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = (testUsername, testPassword) => {
    setUsername(testUsername);
    setPassword(testPassword);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🔥 Drishti AI</h1>
          <p>AI-Powered Event Safety Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="test-credentials-section">
          <button
            type="button"
            className="show-credentials-btn"
            onClick={() => setShowTestCredentials(!showTestCredentials)}
          >
            {showTestCredentials ? 'Hide' : 'Show'} Test Credentials
          </button>

          {showTestCredentials && (
            <div className="test-credentials">
              <h3>Demo Accounts</h3>
              <div className="credentials-grid">
                <div className="credential-card">
                  <div className="credential-header">
                    <span className="role-badge admin">Admin</span>
                    <h4>Admin User</h4>
                  </div>
                  <div className="credential-details">
                    <p><strong>Username:</strong> admin</p>
                    <p><strong>Password:</strong> admin123</p>
                  </div>
                  <button
                    type="button"
                    className="use-credential-btn"
                    onClick={() => handleTestLogin('admin', 'admin123')}
                  >
                    Use These Credentials
                  </button>
                </div>

                <div className="credential-card">
                  <div className="credential-header">
                    <span className="role-badge user">User</span>
                    <h4>Demo User</h4>
                  </div>
                  <div className="credential-details">
                    <p><strong>Username:</strong> demo</p>
                    <p><strong>Password:</strong> demo123</p>
                  </div>
                  <button
                    type="button"
                    className="use-credential-btn"
                    onClick={() => handleTestLogin('demo', 'demo123')}
                  >
                    Use These Credentials
                  </button>
                </div>

                <div className="credential-card">
                  <div className="credential-header">
                    <span className="role-badge user">User</span>
                    <h4>Test User</h4>
                  </div>
                  <div className="credential-details">
                    <p><strong>Username:</strong> test</p>
                    <p><strong>Password:</strong> test123</p>
                  </div>
                  <button
                    type="button"
                    className="use-credential-btn"
                    onClick={() => handleTestLogin('test', 'test123')}
                  >
                    Use These Credentials
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>© 2024 Drishti AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
