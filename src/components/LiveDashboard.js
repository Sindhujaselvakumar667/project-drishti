import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import GoogleMap from "./GoogleMap";
import VideoFeed from "./VideoFeed";
import CrowdHeatmap from "./CrowdHeatmap";
import {
  mockEventCenter,
  mockCrowdData,
  mockResponderData,
  mockZones,
  mockAlerts,
  generateRandomCrowdUpdate,
  generateRandomResponderUpdate,
  generateZoneUpdate,
} from "../data/mockData";
import "./LiveDashboard.css";

const LiveDashboard = () => {
  // State for map data
  const [crowdData, setCrowdData] = useState(mockCrowdData);
  const [responderData, setResponderData] = useState(mockResponderData);
  const [zones, setZones] = useState(mockZones);
  const [alerts, setAlerts] = useState(mockAlerts);

  // State for dashboard controls
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(true);

  // Video feed state
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoCrowdData, setVideoCrowdData] = useState([]);
  const [videoStatus, setVideoStatus] = useState("stopped");
  const [useVideoData, setUseVideoData] = useState(false);

  // Real-time Firestore listeners
  useEffect(() => {
    if (!isLiveMode) return;

    const unsubscribeAlerts = onSnapshot(
      collection(db, "SecurityAlerts"),
      (snapshot) => {
        const alertsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAlerts(alertsData);
      },
      (error) => {
        console.error("Error fetching alerts:", error);
      },
    );

    return () => {
      unsubscribeAlerts();
    };
  }, [isLiveMode]);

  // Simulate live data updates when not connected to real Firestore data
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setCrowdData(generateRandomCrowdUpdate());
      setResponderData(generateRandomResponderUpdate());
      setZones(generateZoneUpdate());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLiveMode]);

  // Handle zone selection
  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
  };

  // Handle video crowd data updates
  const handleVideoCrowdData = (data) => {
    setVideoCrowdData(data);

    // Store video data to Firestore for persistence
    if (data && data.length > 0) {
      try {
        data.forEach(async (point) => {
          await addDoc(collection(db, "CrowdDensity"), {
            ...point,
            source: "video_ai",
            eventId: "current_event",
          });
        });
      } catch (error) {
        console.error("Error storing video crowd data:", error);
      }
    }
  };

  // Handle video status changes
  const handleVideoStatusChange = (status) => {
    setVideoStatus(status);
  };

  // Handle video errors
  const handleVideoError = (message, error) => {
    console.error("Video Feed Error:", message, error);
    // Could show a toast notification here
  };

  // Add test alert to Firestore
  const addTestAlert = async () => {
    try {
      await addDoc(collection(db, "SecurityAlerts"), {
        zone: "Test Zone",
        type: "Crowd Density",
        severity: "High",
        message: "Test alert from dashboard",
        timestamp: new Date().toISOString(),
        status: "Active",
      });
    } catch (error) {
      console.error("Error adding alert:", error);
    }
  };

  // Get zone statistics
  const getZoneStats = () => {
    const totalCapacity = zones.reduce((sum, zone) => sum + zone.capacity, 0);
    const totalCurrent = zones.reduce(
      (sum, zone) => sum + zone.currentCount,
      0,
    );
    const criticalZones = zones.filter(
      (zone) => zone.alertLevel === "Critical",
    ).length;
    const warningZones = zones.filter(
      (zone) => zone.alertLevel === "Warning",
    ).length;

    return {
      totalCapacity,
      totalCurrent,
      occupancyRate: ((totalCurrent / totalCapacity) * 100).toFixed(1),
      criticalZones,
      warningZones,
    };
  };

  const stats = getZoneStats();

  // Get current crowd data based on selected source
  const getCurrentCrowdData = () => {
    if (useVideoData && videoCrowdData.length > 0) {
      return videoCrowdData;
    }
    return crowdData;
  };

  return (
    <div className="live-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>🔥 Drishti Live Event Dashboard</h1>
        <div className="header-controls">
          <div className="status-indicator">
            <span
              className={`status-dot ${isLiveMode ? "live" : "offline"}`}
            ></span>
            {isLiveMode ? "LIVE" : "OFFLINE"}
          </div>
          <button
            className="toggle-btn"
            onClick={() => setIsLiveMode(!isLiveMode)}
          >
            {isLiveMode ? "Pause Live" : "Resume Live"}
          </button>
          <button
            className="toggle-btn video-btn"
            onClick={() => setVideoEnabled(!videoEnabled)}
          >
            {videoEnabled ? "📹 Hide Video" : "📹 Show Video"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Left Sidebar - Controls & Stats */}
        <aside className="dashboard-sidebar">
          {/* Event Info */}
          <div className="info-panel">
            <h3>📍 Event Location</h3>
            <p>{mockEventCenter.name}</p>
            <p>{mockEventCenter.address}</p>
          </div>

          {/* Statistics */}
          <div className="stats-panel">
            <h3>📊 Live Statistics</h3>
            <div className="stat-item">
              <span className="stat-label">Total Capacity:</span>
              <span className="stat-value">
                {stats.totalCapacity.toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Count:</span>
              <span className="stat-value">
                {stats.totalCurrent.toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Occupancy Rate:</span>
              <span className="stat-value">{stats.occupancyRate}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Critical Zones:</span>
              <span className="stat-value critical">{stats.criticalZones}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Warning Zones:</span>
              <span className="stat-value warning">{stats.warningZones}</span>
            </div>
          </div>

          {/* Map Controls */}
          <div className="controls-panel">
            <h3>🎛️ Map Controls</h3>
            <label className="control-item">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
              />
              🔥 Show Crowd Heatmap
            </label>
            <label className="control-item">
              <input
                type="checkbox"
                checked={showResponders}
                onChange={(e) => setShowResponders(e.target.checked)}
              />
              👮 Show Responders
            </label>
            <label className="control-item">
              <input
                type="checkbox"
                checked={showZones}
                onChange={(e) => setShowZones(e.target.checked)}
              />
              🏛️ Show Zones
            </label>
            <label className="control-item">
              <input
                type="checkbox"
                checked={videoEnabled}
                onChange={(e) => setVideoEnabled(e.target.checked)}
              />
              📹 Video Feed
            </label>
            <label className="control-item">
              <input
                type="checkbox"
                checked={useVideoData}
                onChange={(e) => setUseVideoData(e.target.checked)}
                disabled={!videoEnabled || videoCrowdData.length === 0}
              />
              🤖 Use AI Data
            </label>
          </div>

          {/* Zone List */}
          <div className="zones-panel">
            <h3>🏛️ Event Zones</h3>
            <div className="zones-list">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`zone-item ${zone.alertLevel.toLowerCase()}`}
                  onClick={() => handleZoneClick(zone)}
                >
                  <div className="zone-name">{zone.name}</div>
                  <div className="zone-stats">
                    <span>
                      {zone.currentCount}/{zone.capacity}
                    </span>
                    <span
                      className={`alert-level ${zone.alertLevel.toLowerCase()}`}
                    >
                      {zone.alertLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Controls */}
          <div className="test-panel">
            <h3>🧪 Test Controls</h3>
            <button className="test-btn" onClick={addTestAlert}>
              Add Test Alert
            </button>
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="map-container">
          {videoEnabled ? (
            <div className="map-video-split">
              <div className="video-section">
                <VideoFeed
                  onCrowdDataUpdate={handleVideoCrowdData}
                  onStatusChange={handleVideoStatusChange}
                  onError={handleVideoError}
                  cameraLocation={mockEventCenter}
                  autoStart={false}
                />
              </div>
              <div className="map-section">
                <CrowdHeatmap
                  center={mockEventCenter}
                  zoom={15}
                  crowdData={getCurrentCrowdData()}
                  zones={zones}
                  showHeatmap={showHeatmap}
                  showZones={showZones}
                  onMapLoad={(map) => console.log("Map loaded:", map)}
                  onZoneClick={handleZoneClick}
                />
              </div>
            </div>
          ) : (
            <GoogleMap
              center={mockEventCenter}
              zoom={15}
              crowdData={getCurrentCrowdData()}
              responderData={responderData}
              zones={zones}
              showHeatmap={showHeatmap}
              showResponders={showResponders}
              showZones={showZones}
              onMapLoad={(map) => console.log("Map loaded:", map)}
            />
          )}
        </main>

        {/* Right Sidebar - Alerts & Activity */}
        <aside className="alerts-sidebar">
          {/* Video Status Panel */}
          {videoEnabled && (
            <div className="video-status-panel">
              <h3>🤖 AI Video Analysis</h3>
              <div className="video-status">
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className={`status-value ${videoStatus}`}>
                    {videoStatus}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">AI Data Points:</span>
                  <span className="status-value">{videoCrowdData.length}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Data Source:</span>
                  <span className="status-value">
                    {useVideoData ? "AI Camera" : "Mock Data"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Active Alerts */}
          <div className="alerts-panel">
            <h3>🚨 Active Alerts</h3>
            <div className="alerts-list">
              {alerts
                .filter((alert) => alert.status === "Active")
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={`alert-item ${alert.severity?.toLowerCase()}`}
                  >
                    <div className="alert-header">
                      <span className="alert-type">{alert.type}</span>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="alert-zone">{alert.zone}</div>
                    <div className="alert-message">
                      {alert.message || alert.summary}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Responder Status */}
          <div className="responders-panel">
            <h3>👮 Responder Status</h3>
            <div className="responders-list">
              {responderData.map((responder) => (
                <div key={responder.id} className="responder-item">
                  <div className="responder-header">
                    <span className="responder-name">{responder.name}</span>
                    <span
                      className={`responder-status ${responder.status.toLowerCase()}`}
                    >
                      {responder.status}
                    </span>
                  </div>
                  <div className="responder-type">{responder.type}</div>
                  <div className="responder-time">
                    Last update:{" "}
                    {new Date(responder.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Zone Details */}
          {selectedZone && (
            <div className="zone-details-panel">
              <h3>🏛️ Zone Details</h3>
              <div className="zone-details">
                <h4>{selectedZone.name}</h4>
                <div className="detail-item">
                  <span>Capacity:</span>
                  <span>{selectedZone.capacity}</span>
                </div>
                <div className="detail-item">
                  <span>Current:</span>
                  <span>{selectedZone.currentCount}</span>
                </div>
                <div className="detail-item">
                  <span>Density:</span>
                  <span>{selectedZone.density}</span>
                </div>
                <div className="detail-item">
                  <span>Alert Level:</span>
                  <span
                    className={`alert-level ${selectedZone.alertLevel.toLowerCase()}`}
                  >
                    {selectedZone.alertLevel}
                  </span>
                </div>
                <button
                  className="close-details"
                  onClick={() => setSelectedZone(null)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default LiveDashboard;
