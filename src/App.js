import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EventProvider, useEvent } from "./contexts/EventContext";
import Navigation from "./components/Navigation";
import LoginPage from "./pages/LoginPage";
import EventSetupPage from "./pages/EventSetupPage";
import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PredictionsPage from "./pages/PredictionsPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner-large"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

// Event Setup Route Component
const EventSetupRoute = ({ children }) => {
  const { isEventSetup } = useEvent();

  return isEventSetup ? <Navigate to="/dashboard" replace /> : children;
};

// Dashboard Route Component
const DashboardRoute = ({ children }) => {
  const { isEventSetup } = useEvent();

  return isEventSetup ? children : <Navigate to="/event-setup" replace />;
};

// Main App Content
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Determine if we're on a full-page route (login, event-setup)
  const isFullPageRoute = ["/login", "/event-setup"].includes(
    location.pathname,
  );

  return (
    <div
      className={`App ${isFullPageRoute ? "app-full-page" : "app-dashboard"}`}
    >
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/event-setup"
          element={
            <ProtectedRoute>
              <EventSetupRoute>
                <EventSetupPage />
              </EventSetupRoute>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Routes with Navigation */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="app-main">
                    <DashboardPage />
                  </main>
                </div>
              </DashboardRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <DashboardRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="app-main">
                    <AnalyticsPage />
                  </main>
                </div>
              </DashboardRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/predictions"
          element={
            <ProtectedRoute>
              <DashboardRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="app-main">
                    <PredictionsPage />
                  </main>
                </div>
              </DashboardRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="app-main">
                    <SettingsPage />
                  </main>
                </div>
              </DashboardRoute>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <Router>
          <AppContent />
        </Router>
      </EventProvider>
    </AuthProvider>
  );
}

export default App;
