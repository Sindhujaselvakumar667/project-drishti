import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey:
          process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBqvZbeCQTuBNVqD6DtpiLY_mlecmF8HYE",
        version: "weekly",
        libraries: ["visualization", "geometry"],
      });

      try {
        setIsLoading(true);
        setError(null);
        const google = await loader.load();

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: "roadmap",
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        setMap(mapInstance);
        setIsLoading(false);
        onMapLoad(mapInstance);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        setError(error.message || "Failed to load Google Maps");
        setIsLoading(false);
      }
    };

    if (mapRef.current) {
      initMap();
    }
  }, [center, zoom, onMapLoad]);

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
    }
  }, [map, crowdData, showHeatmap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update responder markers
  useEffect(() => {
    if (!map || !window.google) return;

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
    if (!map || !window.google) return;

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
          backgroundColor: "#1a1a1a",
          color: "#ff6b6b",
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
          backgroundColor: "#1a1a1a",
          color: "#78dbff",
          fontSize: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>🗺️</div>
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
