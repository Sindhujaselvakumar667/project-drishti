import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { useEvent } from "../contexts/EventContext";
import GoogleMap from "./GoogleMap";
import VideoFeed from "./VideoFeed";
import CrowdHeatmap from "./CrowdHeatmap";
import PredictionDashboard from "./PredictionDashboard";
import DataInsightsDashboard from "./DataInsightsDashboard";
import DataIngestionPipeline from "../services/prediction/dataIngestionPipeline";
import VertexAIForecastingService from "../services/prediction/vertexAIForecasting";
import AlertManagementSystem from "../services/prediction/alertManagement";
import AIOrchestrationService from "../services/aiOrchestrationService";
import {
  mockCrowdData,
  mockResponderData,
  mockZones,
  mockAlerts,
  generateRandomCrowdUpdate,
  generateRandomResponderUpdate,
  generateZoneUpdate,
  generateCrowdDataAroundLocation,
  generateRespondersAroundLocation,
  generateZonesAroundLocation,
  generateBengaluruCrowdData,
  generateBengaluruResponders,
  generateBengaluruZones,
} from "../data/mockData";
import "./LiveDashboard.css";

const LiveDashboard = () => {
  // Get event data from context
  const {
    eventData,
    getEventName,
    getEventCenter,
    getEventLocation,
    updateEvent,
  } = useEvent();

  // State for map data
  const [crowdData, setCrowdData] = useState([]);
  const [responderData, setResponderData] = useState([]);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState(mockAlerts);

  // State for map controls
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showMapControls, setShowMapControls] = useState(false);
  const mapControlsRef = useRef(null);

  // Video feed state
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoCrowdData, setVideoCrowdData] = useState([]);
  const [videoStatus, setVideoStatus] = useState("stopped");
  const [useVideoData, setUseVideoData] = useState(false);

  // Layout state for video and heatmap
  const [layoutMode, setLayoutMode] = useState("vertical"); // 'vertical', 'compact', 'expanded'
  const [activeTab, setActiveTab] = useState("video"); // 'video' or 'heatmap'

  // Prediction state
  const [predictionEnabled, setPredictionEnabled] = useState(false);
  const [predictionData, setPredictionData] = useState({
    predictions: [6.2, 6.8, 7.1, 7.5, 8.2, 8.7, 9.1, 8.9, 8.5, 8.0],
    upperBound: [7.2, 7.8, 8.1, 8.5, 9.2, 9.7, 10.1, 9.9, 9.5, 9.0],
    lowerBound: [5.2, 5.8, 6.1, 6.5, 7.2, 7.7, 8.1, 7.9, 7.5, 7.0],
    forecastHorizon: 10,
    confidence: 0.85,
    timestamp: new Date().toISOString(),
    alert: {
      level: "WARNING",
      message: "Crowd surge predicted in 15 minutes",
      zone: "MG Road Commercial Hub",
    },
  });
  const [predictionAlerts, setPredictionAlerts] = useState([]);

  // Prediction services
  const [dataIngestionPipeline, setDataIngestionPipeline] = useState(null);
  const [forecastingService, setForecastingService] = useState(null);
  const [alertManagement, setAlertManagement] = useState(null);
  const [aiOrchestration, setAiOrchestration] = useState(null);

  // AI Intelligence state
  const [aiAlerts, setAiAlerts] = useState([]);
  const [lostAndFoundCases, setLostAndFoundCases] = useState([]);
  const [showInsightsDashboard, setShowInsightsDashboard] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Initialize crowd data, responders, and zones - using hardcoded Bengaluru data
  useEffect(() => {
    // Set event location to Bengaluru
    const bengaluruEvent = {
      id: "bengaluru_event_001",
      name: "Bengaluru Crowd Monitoring",
      location: {
        name: "Bengaluru",
        address: "Bengaluru, Karnataka, India",
        coordinates: {
          lat: 12.9716,
          lng: 77.5946,
        },
      },
      createdAt: new Date().toISOString(),
      status: "active",
    };

    // Update the event context
    updateEvent(bengaluruEvent);

    // Use hardcoded Bengaluru crowd data
    const bengaluruCrowdData = generateBengaluruCrowdData();
    setCrowdData(bengaluruCrowdData);

    // Generate responders and zones for Bengaluru
    const bengaluruResponders = generateBengaluruResponders();
    const bengaluruZones = generateBengaluruZones();

    setResponderData(bengaluruResponders || []);
    setZones(bengaluruZones || []);
  }, []);

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
        const forecaster = new VertexAIForecastingService();
        await forecaster.initialize({
          modelPath: "crowd-forecasting-model",
          confidenceThreshold: 0.8,
        });
        setForecastingService(forecaster);

        // Initialize alert management
        const alertManager = new AlertManagementSystem();
        await alertManager.initialize({
          thresholds: {
            crowd_surge: 8.5,
            evacuation_risk: 9.0,
            capacity_limit: 0.9,
          },
        });
        setAlertManagement(alertManager);

        // Initialize AI orchestration
        const aiService = new AIOrchestrationService();
        await aiService.initialize();
        setAiOrchestration(aiService);
      } catch (error) {
        console.error("Error initializing prediction services:", error);
      }
    };

    if (predictionEnabled) {
      initializePredictionServices();
    }

    return () => {
      if (dataIngestionPipeline) {
        dataIngestionPipeline.stop();
      }
    };
  }, [predictionEnabled]);

  // Real-time data simulation
  useEffect(() => {
    if (!predictionEnabled) return;

    const interval = setInterval(() => {
      // Update crowd data
      setCrowdData((prev) =>
        prev.map((point) => ({
          ...point,
          ...generateRandomCrowdUpdate(),
        })),
      );

      // Update responder data
      setResponderData((prev) =>
        prev.map((responder) => ({
          ...responder,
          ...generateRandomResponderUpdate(),
        })),
      );

      // Update zone data
      setZones((prev) => generateZoneUpdate());

      // Generate new predictions every 30 seconds
      if (Math.random() > 0.7) {
        makePrediction();
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [predictionEnabled]);

  // Close map controls when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mapControlsRef.current &&
        !mapControlsRef.current.contains(event.target)
      ) {
        setShowMapControls(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleVideoCrowdData = (data) => {
    setVideoCrowdData(data);

    // Feed data to prediction system if enabled
    if (predictionEnabled && dataIngestionPipeline) {
      dataIngestionPipeline.ingestCrowdData(data);
    }

    // Feed data to AI orchestration
    if (aiOrchestration) {
      aiOrchestration.processCrowdData(data);
    }
  };

  const handleVideoStatusChange = (status) => {
    setVideoStatus(status);
  };

  const handleVideoError = (error) => {
    console.error("Video feed error:", error);
    setVideoStatus("error");
  };

  const handleZoneClick = (zone) => {
    console.log("Zone clicked:", zone);
  };

  const handleAlertAcknowledge = (alertId) => {
    setPredictionAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert,
      ),
    );
  };

  const handleAlertResolve = (alertId) => {
    setPredictionAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const makePrediction = async () => {
    if (!forecastingService) return;

    try {
      const currentData = useVideoData ? videoCrowdData : crowdData;
      const prediction = await forecastingService.generateForecast({
        crowdData: currentData,
        zones: zones,
        timeHorizon: 30, // 30 minutes
        confidence: 0.8,
      });

      setPredictionData(prediction);

      // Check for alerts
      if (alertManagement && prediction.alert) {
        const newAlert = await alertManagement.processAlert(prediction.alert);
        if (newAlert) {
          setPredictionAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
        }
      }
    } catch (error) {
      console.error("Error making prediction:", error);
    }
  };

  // Get current crowd data based on selected source
  const getCurrentCrowdData = () => {
    if (useVideoData && videoCrowdData.length > 0) {
      // Filter out summary points to avoid double counting
      return videoCrowdData.filter((point) => !point.isTotal);
    }
    return crowdData;
  };

  // Calculate statistics
  const calculateStats = () => {
    const currentData = getCurrentCrowdData();
    const safeZones = zones || [];
    const totalCapacity = safeZones.reduce(
      (sum, zone) => sum + (zone.capacity || 0),
      0,
    );
    const totalCurrent = safeZones.reduce(
      (sum, zone) => sum + (zone.currentCount || 0),
      0,
    );
    const occupancyRate =
      totalCapacity > 0 ? (totalCurrent / totalCapacity) * 100 : 0;
    const criticalZones = safeZones.filter(
      (zone) => zone.alertLevel === "Critical",
    ).length;
    const warningZones = safeZones.filter(
      (zone) => zone.alertLevel === "Warning",
    ).length;
    const normalZones = safeZones.filter(
      (zone) => zone.alertLevel === "Normal",
    ).length;

    return {
      totalCapacity,
      totalCurrent,
      occupancyRate: occupancyRate.toFixed(1),
      criticalZones,
      warningZones,
      normalZones,
    };
  };

  const stats = calculateStats();
  const totalCapacity = stats.totalCapacity || 0;
  const currentCount = stats.totalCurrent || 0;
  const criticalZones = stats.criticalZones || 0;
  const warningZones = stats.warningZones || 0;
  const normalZones = stats.normalZones || 0;

  const getTotalPeopleCount = () => {
    return (videoCrowdData || []).reduce((total, point) => {
      return total + (point.personCount || 0);
    }, 0);
  };

  return (
    <div className="live-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>🎯 Live Dashboard</h1>
          <p>Real-time crowd monitoring and intelligence</p>
        </div>

        <div className="header-controls">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>LIVE</span>
          </div>

          <button
            className={`control-btn ${predictionEnabled ? "active" : ""}`}
            onClick={() => setPredictionEnabled(!predictionEnabled)}
          >
            🔮 AI Predictions {predictionEnabled ? "ON" : "OFF"}
          </button>

          <button
            className={`control-btn ${videoEnabled ? "active" : ""}`}
            onClick={() => setVideoEnabled(!videoEnabled)}
          >
            📹 Video {videoEnabled ? "ON" : "OFF"}
          </button>

          <button
            className="control-btn secondary"
            onClick={() => window.location.reload()}
          >
            🔄 Refresh
          </button>

          <button
            className="control-btn"
            onClick={() => setShowInsightsDashboard(!showInsightsDashboard)}
          >
            📊 Data Insights
          </button>

          {videoEnabled && (
            <div className="layout-controls">
              <select
                className="layout-selector"
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value)}
                title="Choose video and heatmap layout"
              >
                <option value="vertical">📱 Video Above Heatmap</option>
                <option value="compact">📋 Compact View</option>
                <option value="expanded">📺 Expanded View</option>
                <option value="tabbed">📑 Tabbed View</option>
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Primary Section - Map */}
        <div className="primary-section">
          <div className="map-container">
            {/* Map Controls */}
            <div className="map-controls-menu" ref={mapControlsRef}>
              <button
                className={`map-controls-toggle ${showMapControls ? "active" : ""}`}
                onClick={() => setShowMapControls(!showMapControls)}
                title="Map Controls"
              >
                ⋯
              </button>

              {showMapControls && (
                <div className="map-controls-dropdown">
                  <div className="map-controls-header">
                    <h4>🎛️ Map Controls</h4>
                    <button
                      className="close-controls"
                      onClick={() => setShowMapControls(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="control-item">
                    <input
                      type="checkbox"
                      id="heatmap"
                      checked={showHeatmap}
                      onChange={(e) => setShowHeatmap(e.target.checked)}
                    />
                    <label htmlFor="heatmap">🔥 Crowd Heatmap</label>
                  </div>

                  <div className="control-item">
                    <input
                      type="checkbox"
                      id="responders"
                      checked={showResponders}
                      onChange={(e) => setShowResponders(e.target.checked)}
                    />
                    <label htmlFor="responders">👮 Responders</label>
                  </div>

                  <div className="control-item">
                    <input
                      type="checkbox"
                      id="zones"
                      checked={showZones}
                      onChange={(e) => setShowZones(e.target.checked)}
                    />
                    <label htmlFor="zones">🏛️ Zones</label>
                  </div>

                  <div className="control-item">
                    <button
                      className="refresh-map-btn"
                      onClick={() => setMapKey((prev) => prev + 1)}
                      style={{
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        width: "100%",
                      }}
                    >
                      🔄 Force Refresh Heatmap
                    </button>
                  </div>

                  <div className="control-item">
                    <input
                      type="checkbox"
                      id="aidata"
                      checked={useVideoData && videoCrowdData.length > 0}
                      disabled={!useVideoData}
                      readOnly
                    />
                    <label htmlFor="aidata">
                      📊 AI Data Status: {videoCrowdData.length} points
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Main Map Component */}
            {predictionEnabled ? (
              <div className="dashboard-split">
                <div className="map-prediction-split">
                  {videoEnabled ? (
                    <div
                      className={`video-heatmap-container layout-${layoutMode}`}
                    >
                      {layoutMode === "tabbed" ? (
                        <div className="tabbed-layout">
                          <div className="tab-controls">
                            <button
                              className={`tab-btn ${activeTab === "video" ? "active" : ""}`}
                              onClick={() => setActiveTab("video")}
                            >
                              📹 Video Feed
                            </button>
                            <button
                              className={`tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
                              onClick={() => setActiveTab("heatmap")}
                            >
                              🔥 Heatmap
                            </button>
                          </div>
                          <div className="tab-content">
                            {activeTab === "video" ? (
                              <div className="video-section-full">
                                <VideoFeed
                                  onCrowdDataUpdate={handleVideoCrowdData}
                                  onStatusChange={handleVideoStatusChange}
                                  onError={handleVideoError}
                                  cameraLocation={{
                                    lat: 12.9716,
                                    lng: 77.5946,
                                  }}
                                  autoStart={false}
                                />
                              </div>
                            ) : (
                              <div className="map-section-full">
                                <GoogleMap
                                  key={mapKey}
                                  center={{
                                    lat: 12.9716,
                                    lng: 77.5946,
                                  }}
                                  zoom={15}
                                  crowdData={getCurrentCrowdData()}
                                  responderData={responderData}
                                  zones={zones}
                                  showHeatmap={showHeatmap}
                                  showResponders={showResponders}
                                  showZones={showZones}
                                  onMapLoad={(map) =>
                                    console.log("Map loaded:", map)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="vertical-video-heatmap">
                          <div className="video-section-top">
                            <VideoFeed
                              onCrowdDataUpdate={handleVideoCrowdData}
                              onStatusChange={handleVideoStatusChange}
                              onError={handleVideoError}
                              cameraLocation={{
                                lat: 12.9716,
                                lng: 77.5946,
                              }}
                              autoStart={false}
                            />
                          </div>
                          <div className="section-divider">
                            <div className="divider-line"></div>
                            <div className="divider-text">
                              📊 CROWD MONITORING DATA
                            </div>
                            <div className="divider-line"></div>
                          </div>
                          <div className="heatmap-section-below">
                            <div className="heatmap-header">
                              <h3>🗺️ Bengaluru Crowd Heatmap</h3>
                              <div className="heatmap-stats">
                                <span>
                                  Real-time crowd monitoring for Bengaluru,
                                  Karnataka
                                </span>
                              </div>
                              <div className="heatmap-data-table">
                                <div className="heatmap-data-item">
                                  <div className="heatmap-data-label">
                                    Data Points
                                  </div>
                                  <div className="heatmap-data-value">40</div>
                                </div>
                                <div className="heatmap-data-item">
                                  <div className="heatmap-data-label">
                                    Avg Density
                                  </div>
                                  <div className="heatmap-data-value">6.2</div>
                                </div>
                                <div className="heatmap-data-item">
                                  <div className="heatmap-data-label">
                                    Max Density
                                  </div>
                                  <div className="heatmap-data-value">9.0</div>
                                </div>
                                <div className="heatmap-data-item">
                                  <div className="heatmap-data-label">
                                    Critical Areas
                                  </div>
                                  <div className="heatmap-data-value critical">
                                    10
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="heatmap-content">
                              <GoogleMap
                                key={mapKey}
                                center={{
                                  lat: 12.9716,
                                  lng: 77.5946,
                                }}
                                zoom={15}
                                crowdData={getCurrentCrowdData()}
                                responderData={responderData}
                                zones={zones}
                                showHeatmap={showHeatmap}
                                showResponders={showResponders}
                                showZones={showZones}
                                onMapLoad={(map) =>
                                  console.log("Map loaded:", map)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="map-section">
                      <GoogleMap
                        key={mapKey}
                        center={{
                          lat: 12.9716,
                          lng: 77.5946,
                        }}
                        zoom={15}
                        crowdData={getCurrentCrowdData()}
                        responderData={responderData}
                        zones={zones}
                        showHeatmap={showHeatmap}
                        showResponders={showResponders}
                        showZones={showZones}
                        onMapLoad={(map) => console.log("Map loaded:", map)}
                      />
                    </div>
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
            ) : (
              <div className="single-map-container">
                {videoEnabled ? (
                  <div
                    className={`video-heatmap-container layout-${layoutMode}`}
                  >
                    {layoutMode === "tabbed" ? (
                      <div className="tabbed-layout">
                        <div className="tab-controls">
                          <button
                            className={`tab-btn ${activeTab === "video" ? "active" : ""}`}
                            onClick={() => setActiveTab("video")}
                          >
                            📹 Video Feed
                          </button>
                          <button
                            className={`tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
                            onClick={() => setActiveTab("heatmap")}
                          >
                            🔥 Heatmap
                          </button>
                        </div>
                        <div className="tab-content">
                          {activeTab === "video" ? (
                            <div className="video-section-full">
                              <VideoFeed
                                onCrowdDataUpdate={handleVideoCrowdData}
                                onStatusChange={handleVideoStatusChange}
                                onError={handleVideoError}
                                cameraLocation={{
                                  lat: 12.9716,
                                  lng: 77.5946,
                                }}
                                autoStart={false}
                              />
                            </div>
                          ) : (
                            <div className="map-section-full">
                              <CrowdHeatmap
                                center={{
                                  lat: 12.9716,
                                  lng: 77.5946,
                                }}
                                zoom={15}
                                crowdData={getCurrentCrowdData()}
                                zones={zones}
                                showHeatmap={showHeatmap}
                                showZones={showZones}
                                onMapLoad={(map) =>
                                  console.log("Map loaded:", map)
                                }
                                onZoneClick={handleZoneClick}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="vertical-video-heatmap">
                        <div className="video-section-top">
                          <VideoFeed
                            onCrowdDataUpdate={handleVideoCrowdData}
                            onStatusChange={handleVideoStatusChange}
                            onError={handleVideoError}
                            cameraLocation={{
                              lat: 12.9716,
                              lng: 77.5946,
                            }}
                            autoStart={false}
                          />
                        </div>
                        <div className="section-divider">
                          <div className="divider-line"></div>
                          <div className="divider-text">
                            📊 CROWD MONITORING DATA
                          </div>
                          <div className="divider-line"></div>
                        </div>
                        <div className="heatmap-section-below">
                          <div className="heatmap-header">
                            <h3>🗺️ Bengaluru Crowd Heatmap</h3>
                            <div className="heatmap-stats">
                              <span>
                                Real-time crowd monitoring for Bengaluru,
                                Karnataka
                              </span>
                            </div>
                            <div className="heatmap-data-table">
                              <div className="heatmap-data-item">
                                <div className="heatmap-data-label">
                                  Data Points
                                </div>
                                <div className="heatmap-data-value">40</div>
                              </div>
                              <div className="heatmap-data-item">
                                <div className="heatmap-data-label">
                                  Avg Density
                                </div>
                                <div className="heatmap-data-value">6.2</div>
                              </div>
                              <div className="heatmap-data-item">
                                <div className="heatmap-data-label">
                                  Max Density
                                </div>
                                <div className="heatmap-data-value">9.0</div>
                              </div>
                              <div className="heatmap-data-item">
                                <div className="heatmap-data-label">
                                  Critical Areas
                                </div>
                                <div className="heatmap-data-value critical">
                                  10
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="heatmap-content">
                            <CrowdHeatmap
                              center={{
                                lat: 12.9716,
                                lng: 77.5946,
                              }}
                              zoom={15}
                              crowdData={getCurrentCrowdData()}
                              zones={zones}
                              showHeatmap={showHeatmap}
                              showZones={showZones}
                              onMapLoad={(map) =>
                                console.log("Map loaded:", map)
                              }
                              onZoneClick={handleZoneClick}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="map-section">
                    <CrowdHeatmap
                      center={{
                        lat: 12.9716,
                        lng: 77.5946,
                      }}
                      zoom={15}
                      crowdData={getCurrentCrowdData()}
                      zones={zones}
                      showHeatmap={showHeatmap}
                      showZones={showZones}
                      onMapLoad={(map) => console.log("Map loaded:", map)}
                      onZoneClick={handleZoneClick}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Section - Information Panels */}
        <aside className="secondary-section">
          {/* Live Statistics */}
          <div className="panel stats-panel">
            <div className="panel-header">
              <h3 className="panel-title">📊 Live Statistics</h3>
            </div>
            <div className="panel-content">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Total Capacity</div>
                  <div className="stat-value">
                    {totalCapacity.toLocaleString()}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Current Count</div>
                  <div className="stat-value">
                    {(useVideoData
                      ? getTotalPeopleCount()
                      : currentCount
                    ).toLocaleString()}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Occupancy Rate</div>
                  <div className="stat-value">
                    {totalCapacity > 0
                      ? ((currentCount / totalCapacity) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Critical Zones</div>
                  <div className="stat-value critical">{criticalZones}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Warning Zones</div>
                  <div className="stat-value warning">{warningZones}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Normal Zones</div>
                  <div className="stat-value normal">{normalZones}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="panel alerts-panel">
            <div className="panel-header">
              <h3 className="panel-title">🚨 Active Alerts</h3>
              <span className="alert-count">{(alerts || []).length}</span>
            </div>
            <div className="panel-content">
              <div className="alerts-list">
                {(alerts || []).length > 0 ? (
                  (alerts || []).map((alert) => (
                    <div
                      key={alert.id}
                      className={`alert-item ${alert.severity.toLowerCase()}`}
                    >
                      <div className="alert-header">
                        <span className="alert-type">{alert.type}</span>
                        <span className="alert-time">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-zone">📍 {alert.zone}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-alerts">
                    <div className="no-alerts-icon">✅</div>
                    <div className="no-alerts-text">All systems normal</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Intelligence Center */}
          <div className="panel ai-panel">
            <div className="panel-header">
              <h3 className="panel-title">🧠 AI Intelligence Center</h3>
            </div>
            <div className="panel-content">
              <div className="ai-status">
                <div className="ai-item">
                  <span className="ai-label">Threat Level:</span>
                  <span className="ai-value low">LOW</span>
                </div>
                <div className="ai-item">
                  <span className="ai-label">Prediction Accuracy:</span>
                  <span className="ai-value">85%</span>
                </div>
                <div className="ai-item">
                  <span className="ai-label">Active Models:</span>
                  <span className="ai-value">3</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Insights Dashboard - Full Width Overlay */}
      {showInsightsDashboard && (
        <div className="insights-overlay">
          <div className="insights-container">
            <div className="insights-header">
              <h2>📊 Data Insights Dashboard</h2>
              <button
                className="close-insights"
                onClick={() => setShowInsightsDashboard(false)}
              >
                ✕
              </button>
            </div>
            <DataInsightsDashboard
              crowdData={getCurrentCrowdData()}
              zones={zones}
              alerts={alerts}
              responderData={responderData}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;
