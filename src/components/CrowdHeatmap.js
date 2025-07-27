import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import "./CrowdHeatmap.css";

const CrowdHeatmap = ({
  center = { lat: 37.7749, lng: -122.4194 },
  zoom = 15,
  crowdData = [],
  zones = [],
  showZones = true,
  showHeatmap = true,
  onMapLoad = () => {},
  onZoneClick = () => {},
  className = "",
  style = {},
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [zoneOverlays, setZoneOverlays] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapMode, setMapMode] = useState("hybrid"); // 'roadmap', 'satellite', 'hybrid', 'terrain'
  const [useFallback, setUseFallback] = useState(false);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const apiKey = "AIzaSyBqvZbeCQTuBNVqD6DtpiLY_mlecmF8HYE";

        if (!apiKey || apiKey === "your_google_maps_api_key_here") {
          throw new Error(
            "Google Maps API key is not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your .env.local file.",
          );
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: "weekly",
          libraries: ["visualization", "geometry"],
        });

        const google = await loader.load();

        // Ensure visualization library is fully loaded
        if (
          !google.maps.visualization ||
          !google.maps.visualization.HeatmapLayer
        ) {
          throw new Error("Google Maps visualization library failed to load");
        }

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: mapMode,
          styles: getMapStyles(),
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_CENTER,
          },
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setMap(mapInstance);
        onMapLoad(mapInstance);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading Google Maps:", error);

        // Use fallback visualization instead of showing error
        console.log(
          "Switching to fallback heatmap visualization for Bengaluru",
        );
        setUseFallback(true);
        setIsLoading(false);
        setError(null);
      }
    };

    if (mapRef.current) {
      initMap();
    }
  }, [center, zoom, mapMode, onMapLoad]);

  // Helper functions defined before useEffect
  const getHeatmapRadius = () => {
    // Adjust radius based on zoom level
    const baseRadius = 50;
    const zoomFactor = Math.pow(2, (zoom - 15) * 0.5);
    return Math.max(20, Math.min(100, baseRadius * zoomFactor));
  };

  const getHeatmapGradient = () => {
    return [
      "rgba(0, 255, 255, 0)", // Transparent cyan
      "rgba(0, 255, 255, 0.2)", // Light cyan
      "rgba(0, 191, 255, 0.4)", // Light blue
      "rgba(0, 127, 255, 0.6)", // Blue
      "rgba(0, 63, 255, 0.8)", // Dark blue
      "rgba(0, 0, 255, 1)", // Pure blue
      "rgba(0, 0, 223, 1)", // Blue-purple
      "rgba(0, 0, 191, 1)", // Purple
      "rgba(63, 0, 159, 1)", // Dark purple
      "rgba(127, 0, 127, 1)", // Purple-red
      "rgba(191, 0, 63, 1)", // Red-purple
      "rgba(255, 0, 0, 1)", // Pure red
    ];
  };

  const getMapStyles = () => {
    return [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "transit",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
    ];
  };

  const getZoneColor = (alertLevel) => {
    switch (alertLevel?.toLowerCase()) {
      case "critical":
        return "#FF4444";
      case "warning":
        return "#FFAA44";
      case "normal":
      default:
        return "#44AA44";
    }
  };

  const getZoneStatusColor = (alertLevel) => {
    switch (alertLevel?.toLowerCase()) {
      case "critical":
        return "#dc3545";
      case "warning":
        return "#ffc107";
      case "normal":
      default:
        return "#28a745";
    }
  };

  const showZoneInfoWindow = (zone, position) => {
    if (!map || !window.google) return;

    const occupancyRate = zone.capacity
      ? ((zone.currentCount / zone.capacity) * 100).toFixed(1)
      : "N/A";
    const statusColor = getZoneStatusColor(zone.alertLevel);

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div class="zone-info">
          <h4>🏛️ ${zone.name}</h4>
          <div class="zone-stats">
            <p><strong>Capacity:</strong> ${zone.capacity?.toLocaleString() || "Unknown"}</p>
            <p><strong>Current Count:</strong> ${zone.currentCount?.toLocaleString() || 0}</p>
            <p><strong>Occupancy:</strong> ${occupancyRate}%</p>
            <p><strong>Density:</strong> ${zone.density || "Low"}</p>
            <p><strong>Status:</strong> <span class="status-${zone.alertLevel?.toLowerCase()}" style="color: ${statusColor}">${zone.alertLevel || "Normal"}</span></p>
          </div>
          <div class="occupancy-bar">
            <div class="occupancy-fill" style="width: ${occupancyRate}%; background-color: ${statusColor}"></div>
          </div>
        </div>
      `,
      position: position,
    });

    infoWindow.open(map);
  };

  // Update heatmap when crowd data changes
  useEffect(() => {
    if (
      !map ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.visualization
    )
      return;

    // Clear existing heatmap
    if (heatmap) {
      heatmap.setMap(null);
    }

    if (showHeatmap && crowdData.length > 0) {
      try {
        const heatmapData = crowdData.map((point) => ({
          location: new window.google.maps.LatLng(point.lat, point.lng),
          weight: point.density || 1,
        }));

        const newHeatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: map,
          radius: getHeatmapRadius(),
          opacity: 0.7,
          gradient: getHeatmapGradient(),
        });

        setHeatmap(newHeatmap);
      } catch (error) {
        console.error("Error creating heatmap:", error);
        setError("Failed to create heatmap visualization");
      }
    }
  }, [map, crowdData, showHeatmap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update zone overlays
  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    // Clear existing overlays
    zoneOverlays.forEach((overlay) => overlay.setMap(null));

    if (showZones && zones.length > 0) {
      const newOverlays = zones.map((zone) => {
        const overlay = new window.google.maps.Circle({
          strokeColor: getZoneColor(zone.alertLevel),
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: getZoneColor(zone.alertLevel),
          fillOpacity: 0.15,
          map: map,
          center: { lat: zone.lat, lng: zone.lng },
          radius: zone.radius || 100,
        });

        // Add click listener for zone info
        overlay.addListener("click", () => {
          showZoneInfoWindow(zone, overlay.getCenter());
          onZoneClick(zone);
        });

        return overlay;
      });

      setZoneOverlays(newOverlays);
    } else {
      setZoneOverlays([]);
    }
  }, [map, zones, showZones, onZoneClick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add crowd density markers for high-density areas
  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    if (crowdData.length > 0) {
      const highDensityPoints = crowdData.filter((point) => point.density > 7);

      const newMarkers = highDensityPoints.map((point) => {
        const marker = new window.google.maps.Marker({
          position: { lat: point.lat, lng: point.lng },
          map: map,
          title: `High Density Area (${point.density.toFixed(1)})`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#FF4444",
            fillOpacity: 0.8,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },
        });

        // Add info window for high-density areas
        try {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="density-info">
                <h4>⚠️ High Density Alert</h4>
                <p><strong>Density Level:</strong> ${point.density.toFixed(1)}/10</p>
                <p><strong>People Count:</strong> ~${point.personCount || "Unknown"}</p>
                <p><strong>Status:</strong> <span class="status-critical">Critical</span></p>
                <p><strong>Time:</strong> ${new Date(point.timestamp).toLocaleTimeString()}</p>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });
        } catch (error) {
          console.error("Error creating info window:", error);
        }

        return marker;
      });

      setMarkers(newMarkers);
    } else {
      setMarkers([]);
    }
  }, [map, crowdData]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCrowdStats = () => {
    if (!crowdData.length) {
      return {
        totalPoints: 0,
        averageDensity: 0,
        maxDensity: 0,
        criticalAreas: 0,
      };
    }

    const totalPoints = crowdData.length;
    const averageDensity =
      crowdData.reduce((sum, point) => sum + point.density, 0) / totalPoints;
    const maxDensity = Math.max(...crowdData.map((point) => point.density));
    const criticalAreas = crowdData.filter((point) => point.density > 7).length;

    return {
      totalPoints,
      averageDensity: averageDensity.toFixed(1),
      maxDensity: maxDensity.toFixed(1),
      criticalAreas,
    };
  };

  const stats = getCrowdStats();

  if (error) {
    // If it's an API key error or visualization error, show a demo fallback instead of error
    if (
      error.includes("API key") ||
      error.includes("visualization") ||
      error.includes("HeatmapLayer")
    ) {
      return (
        <div className={`crowd-heatmap-container ${className}`} style={style}>
          <div className="demo-map-notice">
            <h4>🗺️ Demo Mode - Crowd Heatmap Visualization</h4>
            <p>
              {error.includes("API key")
                ? "Google Maps API key not configured. Showing demo visualization."
                : "Maps visualization temporarily unavailable. Showing demo visualization."}
            </p>
          </div>

          {/* Demo Heatmap Visualization */}
          <div className="demo-heatmap">
            <div className="demo-map-background">
              <div className="demo-grid">
                {crowdData.map((point, index) => (
                  <div
                    key={index}
                    className="demo-heat-point"
                    style={{
                      left: `${Math.abs(((point.lng + 122.4194) * 1000) % 100)}%`,
                      top: `${Math.abs(((point.lat - 37.7749) * 1000) % 100)}%`,
                      backgroundColor: `rgba(255, ${Math.max(0, 255 - point.density * 20)}, 0, ${Math.min(1, 0.3 + point.density * 0.07)})`,
                      width: `${Math.max(8, Math.min(30, point.density * 3))}px`,
                      height: `${Math.max(8, Math.min(30, point.density * 3))}px`,
                    }}
                    title={`Density: ${point.density}`}
                  />
                ))}
              </div>
              <div className="demo-map-overlay">
                <div className="demo-location-marker">📍 Event Center</div>
              </div>
            </div>
          </div>

          {/* Heatmap Legend */}
          {showHeatmap && crowdData.length > 0 && (
            <div className="heatmap-legend">
              <h4>Crowd Density</h4>
              <div className="legend-gradient">
                <span className="legend-label">Low</span>
                <div className="gradient-bar"></div>
                <span className="legend-label">High</span>
              </div>
              <div className="legend-scale">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="heatmap-stats">
            <div className="stat">
              <span className="stat-label">Data Points:</span>
              <span className="stat-value">{stats.totalPoints}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Avg Density:</span>
              <span className="stat-value">{stats.averageDensity}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Max Density:</span>
              <span className="stat-value">{stats.maxDensity}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Critical Areas:</span>
              <span className="stat-value critical">{stats.criticalAreas}</span>
            </div>
          </div>
        </div>
      );
    }

    // For other errors, show the error message
    return (
      <div className={`crowd-heatmap-error ${className}`} style={style}>
        <div className="error-content">
          <h3>⚠️ Map Loading Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button
              className="retry-btn"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Retry initialization
                setTimeout(() => {
                  if (mapRef.current) {
                    window.location.reload();
                  }
                }, 100);
              }}
            >
              Retry
            </button>
            <button
              className="demo-btn"
              onClick={() => {
                setError("API key not configured");
              }}
            >
              Show Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback visualization when Google Maps fails to load
  if (useFallback) {
    return (
      <div className={`crowd-heatmap-container ${className}`} style={style}>
        {/* Fallback Map Controls */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
              }}
            >
              🗺️ Bengaluru Crowd Heatmap
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Real-time crowd monitoring for Bengaluru, Karnataka
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "2px",
                }}
              >
                Data Points
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1f2937",
                }}
              >
                {stats.totalPoints}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "2px",
                }}
              >
                Avg Density
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1f2937",
                }}
              >
                {stats.averageDensity}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "2px",
                }}
              >
                Max Density
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1f2937",
                }}
              >
                {stats.maxDensity}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "2px",
                }}
              >
                Critical Areas
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#dc2626",
                }}
              >
                {stats.criticalAreas}
              </div>
            </div>
          </div>
        </div>

        {/* Fallback Heatmap Visualization */}
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={{
              width: "100%",
              height: "500px",
              background: "#f8fafc",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Bengaluru landmarks background */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                background: "#f8fafc",
              }}
            >
              {/* Major landmarks */}
              <div
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "45%",
                  fontSize: "13px",
                  color: "#374151",
                  fontWeight: "500",
                  background: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                📍 MG Road
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "25%",
                  left: "50%",
                  fontSize: "13px",
                  color: "#374151",
                  fontWeight: "500",
                  background: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                🏢 Brigade Road
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "15%",
                  left: "35%",
                  fontSize: "13px",
                  color: "#374151",
                  fontWeight: "500",
                  background: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                🌳 Cubbon Park
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  left: "40%",
                  fontSize: "13px",
                  color: "#374151",
                  fontWeight: "500",
                  background: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                🏛️ Vidhana Soudha
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "80%",
                  left: "70%",
                  fontSize: "13px",
                  color: "#374151",
                  fontWeight: "500",
                  background: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                💻 Electronic City
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "60%",
                  left: "60%",
                  fontSize: "13px",
                  color: "#374151",
                  fontWeight: "500",
                  background: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                🍕 Koramangala
              </div>

              {/* Crowd density visualization */}
              {crowdData.map((point, index) => {
                // Convert Bengaluru coordinates to percentage positions
                const normalizedLat = ((point.lat - 12.8) / 0.4) * 100; // Bengaluru lat range ~12.8-13.2
                const normalizedLng = ((point.lng - 77.4) / 0.4) * 100; // Bengaluru lng range ~77.4-77.8

                const left = Math.max(5, Math.min(95, normalizedLng));
                const top = Math.max(5, Math.min(95, 100 - normalizedLat)); // Invert Y axis

                const size = Math.max(10, Math.min(40, point.density * 4));
                const opacity = Math.max(0.3, Math.min(1, point.density / 10));

                let color;
                if (point.density >= 8)
                  color = "255, 0, 0"; // Red for high density
                else if (point.density >= 6)
                  color = "255, 165, 0"; // Orange for medium-high
                else if (point.density >= 4)
                  color = "255, 255, 0"; // Yellow for medium
                else color = "0, 255, 0"; // Green for low density

                return (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: `rgba(${color}, ${opacity})`,
                      borderRadius: "50%",
                      border: "3px solid rgba(255,255,255,0.9)",
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                      boxShadow: `0 4px 12px rgba(${color}, ${opacity * 0.4})`,
                    }}
                    title={`Density: ${point.density}/10, People: ${point.personCount || "N/A"}`}
                  />
                );
              })}
            </div>

            {/* Center marker for Bengaluru */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "32px",
                zIndex: 10,
                background: "#ffffff",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              📍
            </div>

            {/* Coordinate display */}
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                background: "#ffffff",
                color: "#1f2937",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              📍 Bengaluru: 12.9716°N, 77.5946°E
            </div>
          </div>

          {/* Heatmap Legend */}
          {showHeatmap && crowdData.length > 0 && (
            <div className="heatmap-legend">
              <h4>Crowd Density</h4>
              <div className="legend-gradient">
                <span className="legend-label">Low</span>
                <div className="gradient-bar"></div>
                <span className="legend-label">High</span>
              </div>
              <div className="legend-scale">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          )}

          {/* Zone Legend */}
          {showZones && zones.length > 0 && (
            <div className="zone-legend">
              <h4>Zone Status</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-color normal"></div>
                  <span>Normal</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color warning"></div>
                  <span>Warning</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color critical"></div>
                  <span>Critical</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`crowd-heatmap-container ${className}`} style={style}>
      {/* Map Controls */}
      <div className="map-controls">
        <div className="control-group">
          <label>Map Type:</label>
          <select
            value={mapMode}
            onChange={(e) => setMapMode(e.target.value)}
            className="map-type-select"
          >
            <option value="roadmap">Road Map</option>
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>

        <div className="heatmap-stats">
          <div className="stat">
            <span className="stat-label">Data Points:</span>
            <span className="stat-value">{stats.totalPoints}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Avg Density:</span>
            <span className="stat-value">{stats.averageDensity}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Max Density:</span>
            <span className="stat-value">{stats.maxDensity}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Critical Areas:</span>
            <span className="stat-value critical">{stats.criticalAreas}</span>
          </div>
        </div>
      </div>

      {/* Map Display */}
      <div className="map-wrapper">
        {isLoading && (
          <div className="map-loading">
            <div className="loading-spinner"></div>
            <p>Loading map...</p>
          </div>
        )}

        <div
          ref={mapRef}
          className="map-element"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "500px",
            opacity: isLoading ? 0.3 : 1,
          }}
        />

        {/* Heatmap Legend */}
        {showHeatmap && crowdData.length > 0 && (
          <div className="heatmap-legend">
            <h4>Crowd Density</h4>
            <div className="legend-gradient">
              <span className="legend-label">Low</span>
              <div className="gradient-bar"></div>
              <span className="legend-label">High</span>
            </div>
            <div className="legend-scale">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        )}

        {/* Zone Legend */}
        {showZones && zones.length > 0 && (
          <div className="zone-legend">
            <h4>Zone Status</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color normal"></div>
                <span>Normal</span>
              </div>
              <div className="legend-item">
                <div className="legend-color warning"></div>
                <span>Warning</span>
              </div>
              <div className="legend-item">
                <div className="legend-color critical"></div>
                <span>Critical</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrowdHeatmap;
