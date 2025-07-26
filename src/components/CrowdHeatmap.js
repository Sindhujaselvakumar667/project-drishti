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

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loader = new Loader({
          apiKey:
            process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE",
          version: "weekly",
          libraries: ["visualization", "geometry"],
        });

        const google = await loader.load();

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
        setError(
          "Failed to load map. Please check your API key and internet connection.",
        );
        setIsLoading(false);
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
    if (!map || !window.google) return;

    // Clear existing heatmap
    if (heatmap) {
      heatmap.setMap(null);
    }

    if (showHeatmap && crowdData.length > 0) {
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
    }
  }, [map, crowdData, showHeatmap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update zone overlays
  useEffect(() => {
    if (!map || !window.google) return;

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
    if (!map || !window.google) return;

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
    return (
      <div className={`crowd-heatmap-error ${className}`} style={style}>
        <div className="error-content">
          <h3>⚠️ Map Loading Error</h3>
          <p>{error}</p>
          <button
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
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
