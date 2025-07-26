import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      path: '/',
      label: 'Live Dashboard',
      icon: '🎯',
      description: 'Real-time crowd monitoring'
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: '📊',
      description: 'Data insights and reports'
    },
    {
      path: '/predictions',
      label: 'AI Predictions',
      icon: '🔮',
      description: 'Crowd surge forecasting'
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'System configuration'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <nav className="dashboard-navigation">
      <div className="nav-header">
        <h2>🎯 Drishti</h2>
        <p>Crowd Intelligence Platform</p>
      </div>
      
      <div className="nav-items">
        {navigationItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
            title={item.description}
          >
            <span className="nav-icon">{item.icon}</span>
            <div className="nav-content">
              <span className="nav-label">{item.label}</span>
              <span className="nav-description">{item.description}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <div className="system-status">
          <div className="status-indicator">
            <span className="status-dot live"></span>
            <span>System Online</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
