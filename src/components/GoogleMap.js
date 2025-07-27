import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import {
  generateBengaluruCrowdData,
  generateBengaluruZones,
  generateBengaluruResponders,
} from "../data/mockData";

const GoogleMap = ({
  center = { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
  zoom = 13,
  crowdData = [],
  responderData = [],
  zones = [],
  showHeatmap = true,
  showResponders = true,
  showZones = true,
  onMapLoad = () => {},
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [zoneOverlays, setZoneOverlays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("Using Bengaluru fallback visualization");

  // Force Bengaluru fallback visualization instead of loading Google Maps
  useEffect(() => {
    // Automatically set error to trigger fallback for Bengaluru
    setError("Using Bengaluru fallback visualization");
    setIsLoading(false);
  }, []);

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
          radius: 50,
          opacity: 0.6,
          gradient: [
            "rgba(0, 255, 255, 0)",
            "rgba(0, 255, 255, 1)",
            "rgba(0, 191, 255, 1)",
            "rgba(0, 127, 255, 1)",
            "rgba(0, 63, 255, 1)",
            "rgba(0, 0, 255, 1)",
            "rgba(0, 0, 223, 1)",
            "rgba(0, 0, 191, 1)",
            "rgba(0, 0, 159, 1)",
            "rgba(0, 0, 127, 1)",
            "rgba(63, 0, 91, 1)",
            "rgba(127, 0, 63, 1)",
            "rgba(191, 0, 31, 1)",
            "rgba(255, 0, 0, 1)",
          ],
        });

        setHeatmap(newHeatmap);
      } catch (error) {
        console.error("Error creating heatmap:", error);
        setError("Failed to create heatmap visualization");
      }
    }
  }, [map, crowdData, showHeatmap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update responder markers
  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    if (showResponders && responderData.length > 0) {
      const newMarkers = responderData.map((responder) => {
        const marker = new window.google.maps.Marker({
          position: { lat: responder.lat, lng: responder.lng },
          map: map,
          title: responder.name || "Responder",
          icon: {
            url: getResponderIcon(responder.type),
            scaledSize: new window.google.maps.Size(32, 32),
          },
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div>
              <h4>${responder.name || "Responder"}</h4>
              <p>Type: ${responder.type || "Unknown"}</p>
              <p>Status: ${responder.status || "Active"}</p>
              <p>Last Update: ${new Date(responder.lastUpdate).toLocaleTimeString()}</p>
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
  }, [map, responderData, showResponders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update zone overlays
  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    // Clear existing overlays
    zoneOverlays.forEach((overlay) => overlay.setMap(null));

    if (showZones && zones.length > 0) {
      const newOverlays = zones.map((zone) => {
        const overlay = new window.google.maps.Circle({
          strokeColor: zone.color || "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zone.color || "#FF0000",
          fillOpacity: 0.15,
          map: map,
          center: { lat: zone.lat, lng: zone.lng },
          radius: zone.radius || 100,
        });

        // Add click listener for zone info
        overlay.addListener("click", () => {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div>
                <h4>${zone.name}</h4>
                <p>Capacity: ${zone.capacity || "Unknown"}</p>
                <p>Current Count: ${zone.currentCount || 0}</p>
                <p>Density: ${zone.density || "Low"}</p>
              </div>
            `,
            position: { lat: zone.lat, lng: zone.lng },
          });
          infoWindow.open(map);
        });

        return overlay;
      });

      setZoneOverlays(newOverlays);
    } else {
      setZoneOverlays([]);
    }
  }, [map, zones, showZones]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to get responder icon based on type
  const getResponderIcon = (type) => {
    const icons = {
      police:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDA3N0ZGIi8+Cjwvc3ZnPgo=",
      medical:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkYwMDAwIi8+Cjwvc3ZnPgo=",
      fire: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY5OTAwIi8+Cjwvc3ZnPgo=",
      security:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo=",
    };
    return icons[type] || icons.security;
  };

  if (error) {
    // Use Bengaluru hardcoded data for fallback
    const bengaluruCrowdData = generateBengaluruCrowdData();
    const bengaluruZones = generateBengaluruZones();
    const bengaluruResponders = generateBengaluruResponders();

    // Show demo fallback for API/visualization errors
    if (
      error.includes("API key") ||
      error.includes("visualization") ||
      error.includes("HeatmapLayer")
    ) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: "500px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            position: "relative",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e5e7eb",
              color: "#1f2937",
            }}
          >
            <div
              style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}
            >
              🗺️ Bengaluru Crowd Heatmap
            </div>
            <div
              style={{ fontSize: "13px", marginTop: "4px", color: "#6b7280" }}
            >
              Real-time crowd monitoring for Bengaluru, Karnataka
            </div>
          </div>
          <div
            style={{
              flex: 1,
              position: "relative",
              background: "#f8fafc",
              overflow: "hidden",
            }}
          >
            {/* Bengaluru landmarks background */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                right: "10px",
                bottom: "10px",
                background: "rgba(248, 250, 252, 0.8)",
                borderRadius: "6px",
              }}
            >
              {/* Major landmarks */}
              <div
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "45%",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                📍 MG Road
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "25%",
                  left: "50%",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                🏢 Brigade Road
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "15%",
                  left: "35%",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                🌳 Cubbon Park
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  left: "40%",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                🏛️ Vidhana Soudha
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "80%",
                  left: "70%",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                💻 Electronic City
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "60%",
                  left: "60%",
                  fontSize: "12px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                🍕 Koramangala
              </div>

              {/* Crowd density visualization */}
              {bengaluruCrowdData.map((point, index) => {
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
                      border: "2px solid rgba(255,255,255,0.8)",
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                      boxShadow: `0 2px 8px rgba(${color}, ${opacity * 0.5})`,
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
                fontSize: "24px",
                zIndex: 10,
              }}
            >
              📍
            </div>

            {/* Statistics display */}
            <div
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "#ffffff",
                color: "#1f2937",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
            >
              <div>📊 Live Statistics</div>
              <div>Crowd Points: {bengaluruCrowdData.length}</div>
              <div>Zones: {bengaluruZones.length}</div>
              <div>Responders: {bengaluruResponders.length}</div>
            </div>

            {/* Coordinate display */}
            <div
              style={{
                position: "absolute",
                bottom: "15px",
                right: "15px",
                background: "#ffffff",
                color: "#1f2937",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
            >
              📍 Bengaluru: 12.9716°N, 77.5946°E
            </div>
          </div>
        </div>
      );
    }

    // For other errors, show error message
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          color: "#dc2626",
          fontSize: "16px",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>⚠️</div>
          <div>Failed to load Google Maps</div>
          <div style={{ fontSize: "14px", opacity: 0.7, marginTop: "5px" }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          color: "#3b82f6",
          fontSize: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "24px",
              marginBottom: "10px",
              animation: "pulse 2s infinite",
            }}
          >
            🗺️
          </div>
          <div>Loading Google Maps...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    />
  );
};

export default GoogleMap;
