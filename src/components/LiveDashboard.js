import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import GoogleMap from "./GoogleMap";
import VideoFeed from "./VideoFeed";
import CrowdHeatmap from "./CrowdHeatmap";
import PredictionDashboard from "./PredictionDashboard";
import DataIngestionPipeline from "../services/prediction/dataIngestionPipeline";
import VertexAIForecastingService from "../services/prediction/vertexAIForecasting";
import AlertManagementSystem from "../services/prediction/alertManagement";
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

  // Prediction system state
  const [predictionEnabled, setPredictionEnabled] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [predictionAlerts, setPredictionAlerts] = useState([]);
  const [modelStatus, setModelStatus] = useState("offline");
  const [dataIngestionPipeline, setDataIngestionPipeline] = useState(null);
  const [forecastingService, setForecastingService] = useState(null);
  const [alertSystem, setAlertSystem] = useState(null);

  // Initialize prediction services
  useEffect(() => {
    const initializePredictionServices = async () => {
      try {
        // Initialize data ingestion pipeline
        const pipeline = new DataIngestionPipeline();
        await pipeline.start({
          onDataCollected: () => console.log("Data collected"),
          onBatchProcessed: (batchData) => {
            console.log("Batch processed:", batchData);
            // Trigger predictions when new data is available
            if (forecastingService) {
              makePrediction();
            }
          },
          onError: (message, error) =>
            console.error("Pipeline error:", message, error),
        });
        setDataIngestionPipeline(pipeline);

        // Initialize forecasting service
        const forecasting = new VertexAIForecastingService();
        await forecasting.initialize({
          onPredictionUpdate: (prediction) => {
            setPredictionData(prediction);
            console.log("New prediction:", prediction);
          },
          onSurgeAlert: (alert) => {
            console.log("Surge alert:", alert);
            if (alertSystem) {
              alertSystem.createSurgeAlert(alert);
            }
          },
          onError: (message, error) =>
            console.error("Forecasting error:", message, error),
          onModelStatusChange: (status) => {
            setModelStatus(status);
            console.log("Model status:", status);
          },
        });
        setForecastingService(forecasting);

        // Initialize alert management system
        const alerts = new AlertManagementSystem();
        await alerts.initialize({
          onAlertCreated: (alert) => {
            setPredictionAlerts((prev) => [...prev, alert]);
            console.log("Alert created:", alert);
          },
          onAlertEscalated: (alert) => {
            console.log("Alert escalated:", alert);
          },
          onAlertResolved: (alert) => {
            setPredictionAlerts((prev) =>
              prev.filter((a) => a.id !== alert.id),
            );
            console.log("Alert resolved:", alert);
          },
          onError: (message, error) =>
            console.error("Alert system error:", message, error),
        });

        // Request notification permissions
        alerts.requestNotificationPermissions();
        setAlertSystem(alerts);

        console.log("Prediction services initialized");
      } catch (error) {
        console.error("Failed to initialize prediction services:", error);
      }
    };

    initializePredictionServices();

    return () => {
      // Cleanup services
      if (dataIngestionPipeline) {
        dataIngestionPipeline.destroy();
      }
      if (forecastingService) {
        forecastingService.destroy();
      }
      if (alertSystem) {
        alertSystem.destroy();
      }
    };
  }, []);

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
      const newCrowdData = generateRandomCrowdUpdate();
      const newZones = generateZoneUpdate();

      setCrowdData(newCrowdData);
      setResponderData(generateRandomResponderUpdate());
      setZones(newZones);

      // Feed data to prediction pipeline
      if (dataIngestionPipeline && predictionEnabled) {
        dataIngestionPipeline.ingestCrowdData(getCurrentCrowdData());
      }

      // Check for capacity alerts
      newZones.forEach((zone) => {
        if (zone.alertLevel === "Critical" && alertSystem) {
          alertSystem.createCapacityAlert(zone);
        }
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLiveMode, dataIngestionPipeline, predictionEnabled, alertSystem]);

  // Handle zone selection
  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
  };

  // Handle video crowd data updates
  const handleVideoCrowdData = (data) => {
    setVideoCrowdData(data);

    // Feed real-time data to prediction pipeline
    if (dataIngestionPipeline && predictionEnabled && data && data.length > 0) {
      const realTimeData = {
        totalPeople:
          data
            .filter((point) => point.isTotal)
            .reduce((sum, point) => sum + point.personCount, 0) ||
          data.reduce((sum, point) => sum + point.personCount, 0),
        avgDensity:
          data.reduce((sum, point) => sum + point.density, 0) / data.length,
        timestamp: new Date().toISOString(),
        source: "video_ai",
        confidence:
          data.reduce((sum, point) => sum + (point.confidence || 0), 0) /
          data.length,
      };

      dataIngestionPipeline.ingestCrowdData([realTimeData]);
    }

    // Store video data to Firestore for persistence (batch operations for performance)
    if (data && data.length > 0) {
      try {
        // Only store significant data points to avoid overwhelming Firestore
        const significantPoints = data.filter(
          (point) =>
            point.personCount > 0 || point.isTotal || point.density > 3,
        );

        if (significantPoints.length > 0) {
          significantPoints.forEach(async (point) => {
            await addDoc(collection(db, "CrowdDensity"), {
              ...point,
              source: "video_ai",
              eventId: "current_event",
              processingTime: Date.now(),
            });
          });
        }
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

  // Make AI prediction
  const makePrediction = async () => {
    if (!forecastingService || !predictionEnabled) return;

    try {
      const currentData = {
        totalPeople: getCurrentCrowdData().reduce(
          (sum, point) => sum + (point.personCount || 1),
          0,
        ),
        avgDensity:
          getCurrentCrowdData().reduce((sum, point) => sum + point.density, 0) /
            getCurrentCrowdData().length || 0,
        avgVelocity: 1.2, // Mock velocity data
        congestionScore:
          zones.filter((z) => z.alertLevel === "Critical").length * 2,
        hotspotCount: getCurrentCrowdData().filter((point) => point.density > 7)
          .length,
      };

      const prediction =
        await forecastingService.predictCrowdSurge(currentData);
      setPredictionData(prediction);
    } catch (error) {
      console.error("Prediction failed:", error);
    }
  };

  // Toggle prediction system
  const togglePredictionSystem = async () => {
    setPredictionEnabled(!predictionEnabled);

    if (!predictionEnabled) {
      // Start prediction system
      if (dataIngestionPipeline) {
        await makePrediction();
      }
    }
  };

  // Handle prediction alert actions
  const handleAlertAcknowledge = async (alertId) => {
    if (alertSystem) {
      await alertSystem.acknowledgeAlert(alertId, "Dashboard User");
    }
  };

  const handleAlertResolve = async (alertId) => {
    if (alertSystem) {
      await alertSystem.resolveAlert(
        alertId,
        "Dashboard User",
        "Resolved from dashboard",
      );
    }
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
      // Filter out summary points to avoid double counting
      return videoCrowdData.filter((point) => !point.isTotal);
    }
    return crowdData;
  };

  // Get total people count from video data
  const getTotalPeopleCount = () => {
    if (useVideoData && videoCrowdData.length > 0) {
      const totalPoint = videoCrowdData.find((point) => point.isTotal);
      return totalPoint
        ? totalPoint.personCount
        : videoCrowdData.reduce((sum, point) => sum + point.personCount, 0);
    }
    return crowdData.reduce((sum, point) => sum + (point.personCount || 1), 0);
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
          <button
            className={`toggle-btn prediction-btn ${predictionEnabled ? "active" : ""}`}
            onClick={togglePredictionSystem}
          >
            {predictionEnabled
              ? "🔮 AI Predictions ON"
              : "🔮 AI Predictions OFF"}
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
                {useVideoData
                  ? getTotalPeopleCount().toLocaleString()
                  : stats.totalCurrent.toLocaleString()}
              </span>
              {useVideoData && (
                <span className="stat-source">🤖 AI Detection</span>
              )}
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
              <div className="data-controls">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useVideoData}
                    onChange={(e) => setUseVideoData(e.target.checked)}
                  />
                  🤖 Use AI Data for Map
                </label>
                {useVideoData && videoCrowdData.length > 0 && (
                  <div className="ai-status">
                    <span className="ai-indicator">
                      🎯 Live AI: {getTotalPeopleCount()} people detected
                    </span>
                  </div>
                )}
              </div>
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
          {predictionEnabled ? (
            <div className="dashboard-split">
              <div className="map-prediction-split">
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
              </div>
              <div className="prediction-section">
                <PredictionDashboard
                  predictionData={predictionData}
                  alertData={predictionAlerts}
                  onAlertAcknowledge={handleAlertAcknowledge}
                  onAlertResolve={handleAlertResolve}
                  isVisible={predictionEnabled}
                />
              </div>
            </div>
          ) : videoEnabled ? (
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
          {/* AI Prediction Status Panel */}
          {predictionEnabled && (
            <div className="prediction-status-panel">
              <h3>🔮 AI Prediction System</h3>
              <div className="prediction-status">
                <div className="status-item">
                  <span className="status-label">Model Status:</span>
                  <span className={`status-value ${modelStatus}`}>
                    {modelStatus}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Last Prediction:</span>
                  <span className="status-value">
                    {predictionData?.timestamp
                      ? new Date(predictionData.timestamp).toLocaleTimeString()
                      : "No prediction"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Surge Risk:</span>
                  <span
                    className={`status-value ${predictionData?.alertLevel || "normal"}`}
                  >
                    {predictionData?.surgeRisk?.percentage || 0}%
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Active Alerts:</span>
                  <span className="status-value">
                    {predictionAlerts.length}
                  </span>
                </div>
              </div>
            </div>
          )}

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
