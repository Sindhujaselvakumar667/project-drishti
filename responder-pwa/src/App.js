import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  requestNotificationPermission,
  onMessageListener,
  isNotificationSupported,
  getStoredFCMToken,
  saveFCMTokenToBackend,
  triggerEmergencyVibration,
  playEmergencySound,
} from "./firebase";

function AppContent() {
  const { user, isAuthenticated, isLoading, login, logout, updateUserStatus } =
    useAuth();
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fcmToken, setFcmToken] = useState(null);

  // Handle PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize FCM
  useEffect(() => {
    const initializeFCM = async () => {
      if (isNotificationSupported() && isAuthenticated && user) {
        try {
          const token = await requestNotificationPermission();
          if (token) {
            setFcmToken(token);
            await saveFCMTokenToBackend(token, user);
          }
        } catch (error) {
          console.error("Error initializing FCM:", error);
        }
      }
    };

    initializeFCM();
  }, [isAuthenticated, user]);

  // Listen for foreground messages
  useEffect(() => {
    if (isNotificationSupported()) {
      onMessageListener()
        .then((payload) => {
          console.log("Received foreground message:", payload);
          handleEmergencyNotification(payload);
        })
        .catch((err) => console.log("Failed to receive message:", err));
    }
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, payload, data } = event.data;

        switch (type) {
          case "EMERGENCY_NOTIFICATION":
            handleEmergencyNotification(payload || data);
            break;
          case "EMERGENCY_RESPONSE_ACTION":
            if (data.action === "respond") {
              handleEmergencyResponse(data.data);
            }
            break;
          case "EMERGENCY_ACKNOWLEDGED":
            handleEmergencyAcknowledgment(data);
            break;
          case "EMERGENCY_FOCUS":
            showEmergencyAlert(data);
            break;
          default:
            console.log("Unknown service worker message:", event.data);
        }
      });
    }
  }, []);

  const handleEmergencyNotification = useCallback((payload) => {
    const notificationData = payload.data || payload;

    // Check if this is an emergency type
    if (notificationData.type === "emergency") {
      // Trigger vibration
      triggerEmergencyVibration();

      // Play emergency sound
      playEmergencySound();

      // Show emergency alert overlay
      showEmergencyAlert({
        title: payload.notification?.title || "🚨 Emergency Alert",
        body: payload.notification?.body || "Emergency in your area",
        ...notificationData,
      });
    }
  }, []);

  const showEmergencyAlert = useCallback((alertData) => {
    setEmergencyAlert({
      ...alertData,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now(),
    });

    // Auto-hide after 30 seconds if not dismissed
    setTimeout(() => {
      setEmergencyAlert(null);
    }, 30000);
  }, []);

  const handleEmergencyResponse = useCallback(
    (data) => {
      console.log("Responding to emergency:", data);
      // Here you would typically navigate to emergency details or show response UI
      alert("Emergency response initiated. Dispatching...");
      updateUserStatus("Responding");
      setEmergencyAlert(null);
    },
    [updateUserStatus],
  );

  const handleEmergencyAcknowledgment = useCallback((data) => {
    console.log("Emergency acknowledged:", data);
    setEmergencyAlert(null);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleLogin = async (userData) => {
    const result = await login(userData);
    if (result.success) {
      console.log("Login successful");
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("Logout successful");
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Emergency Responder...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} isLoading={isLoading} />;
  }

  const dismissEmergencyAlert = () => {
    setEmergencyAlert(null);
  };

  const simulateEmergency = () => {
    // For testing purposes
    const testEmergency = {
      type: "emergency",
      title: "🚨 Emergency in Zone A",
      body: "Fire reported at Building 42. Multiple units needed.",
      location: "Zone A - Building 42",
      priority: "high",
      responders_needed: 3,
    };

    handleEmergencyNotification({
      notification: {
        title: testEmergency.title,
        body: testEmergency.body,
      },
      data: testEmergency,
    });
  };

  return (
    <div className="App">
      {/* Emergency Alert Overlay */}
      {emergencyAlert && (
        <div className="emergency-overlay">
          <div className="emergency-alert">
            <div className="emergency-header">
              <span className="emergency-icon">🚨</span>
              <h2>{emergencyAlert.title}</h2>
              <button
                className="close-btn"
                onClick={dismissEmergencyAlert}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>
            <div className="emergency-content">
              <p className="emergency-message">{emergencyAlert.body}</p>
              <div className="emergency-details">
                <p>
                  <strong>Time:</strong> {emergencyAlert.timestamp}
                </p>
                {emergencyAlert.location && (
                  <p>
                    <strong>Location:</strong> {emergencyAlert.location}
                  </p>
                )}
                {emergencyAlert.priority && (
                  <p>
                    <strong>Priority:</strong>
                    <span className={`priority ${emergencyAlert.priority}`}>
                      {emergencyAlert.priority.toUpperCase()}
                    </span>
                  </p>
                )}
              </div>
              <div className="emergency-actions">
                <button
                  className="respond-btn"
                  onClick={() => handleEmergencyResponse(emergencyAlert)}
                >
                  🚨 Respond Now
                </button>
                <button
                  className="acknowledge-btn"
                  onClick={() => handleEmergencyAcknowledgment(emergencyAlert)}
                >
                  ✓ Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main App Content */}
      <header className="app-header">
        <div className="header-content">
          <div className="responder-info">
            <h1>Emergency Responder</h1>
            <div className="responder-details">
              <p className="responder-name">{user.name}</p>
              <p className="responder-badge">Badge: {user.badge}</p>
              <p className="responder-location">📍 {user.location}</p>
            </div>
          </div>
          <div className="status-indicators">
            <div className={`status ${user.status.toLowerCase()}`}>
              <span className="status-dot"></span>
              {user.status}
            </div>
            <div
              className={`connection-status ${isOnline ? "online" : "offline"}`}
            >
              <span className="connection-dot"></span>
              {isOnline ? "Online" : "Offline"}
            </div>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard">
          <div className="welcome-section">
            <h2>Welcome, {user.name.split(" ")[1]}</h2>
            <p>Ready to respond to emergencies in your area.</p>
            <div className="session-info">
              <p className="session-text">
                Logged in as <strong>{user.name}</strong> • Session active
              </p>
            </div>
          </div>

          <div className="notification-status">
            <h3>Notification Status</h3>
            <div className="notification-info">
              {isNotificationSupported() ? (
                <div className="status-item">
                  <span className="status-icon">🔔</span>
                  <span>Push notifications enabled</span>
                  {fcmToken && <span className="status-ok">✓</span>}
                </div>
              ) : (
                <div className="status-item">
                  <span className="status-icon">🔕</span>
                  <span>Push notifications not supported</span>
                </div>
              )}

              <div className="status-item">
                <span className="status-icon">📳</span>
                <span>Vibration alerts enabled</span>
                {"vibrate" in navigator ? (
                  <span className="status-ok">✓</span>
                ) : (
                  <span className="status-error">✗</span>
                )}
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button
                className="action-btn test-btn"
                onClick={simulateEmergency}
              >
                🧪 Test Emergency Alert
              </button>

              {isInstallable && (
                <button
                  className="action-btn install-btn"
                  onClick={handleInstallPWA}
                  id="install-button"
                >
                  📱 Install App
                </button>
              )}
            </div>
          </div>

          <div className="app-info">
            <h3>App Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Version:</strong> 1.0.0
              </div>
              <div className="info-item">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </div>
              <div className="info-item">
                <strong>PWA Status:</strong>
                <span className="pwa-status">Active</span>
              </div>
              <div className="info-item">
                <strong>Service Worker:</strong>
                <span className="sw-status">Registered</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 Drishti Emergency Response System</p>
        <p>Emergency Responder PWA v1.0.0</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
