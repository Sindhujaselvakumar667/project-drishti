import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEvent } from "../contexts/EventContext";
import "./Navigation.css";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { getEventName, getEventCenter, getEventLocation } = useEvent();

  const navigationItems = [
    {
      path: "/dashboard",
      label: "Live Dashboard",
      icon: "🎯",
      description: "Real-time crowd monitoring",
    },
    {
      path: "/analytics",
      label: "Analytics",
      icon: "📊",
      description: "Data insights and reports",
    },
    {
      path: "/predictions",
      label: "AI Predictions",
      icon: "🔮",
      description: "Crowd surge forecasting",
    },
    {
      path: "/settings",
      label: "Settings",
      icon: "⚙️",
      description: "System configuration",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="dashboard-navigation">
      <div className="nav-header">
        <h2>🎯 Drishti</h2>
        <p>Crowd Intelligence Platform</p>

        {/* User Info */}
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>

        {/* Event Info */}
        <div className="event-info">
          <h3>Current Event</h3>
          <div className="event-details">
            <div className="event-name">{getEventName()}</div>
            <div className="event-location">
              <div className="location-display">
                <span className="location-icon">📍</span>
                <div className="location-text">
                  <div className="location-main">{getEventCenter()}</div>
                  {getEventLocation()?.coordinates && (
                    <div className="location-coordinates">
                      {getEventLocation().coordinates.lat.toFixed(6)},{" "}
                      {getEventLocation().coordinates.lng.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-items">
        {navigationItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
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

        <button
          className="logout-button"
          onClick={handleLogout}
          title="Sign out"
        >
          <span className="logout-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
