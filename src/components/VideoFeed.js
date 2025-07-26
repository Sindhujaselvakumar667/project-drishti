import React, { useRef, useEffect, useState } from "react";
import VideoProcessingService from "../services/videoProcessingService";
import "./VideoFeed.css";

const VideoFeed = ({
  onCrowdDataUpdate,
  onError,
  onStatusChange,
  cameraLocation = null,
  autoStart = true,
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const serviceRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    totalPeople: 0,
    averageDensity: 0,
    hotspots: 0,
    coverage: 0,
  });
  const [feedSource, setFeedSource] = useState("camera"); // 'camera' or 'upload'

  useEffect(() => {
    // Initialize video processing service
    serviceRef.current = new VideoProcessingService();

    if (autoStart) {
      startVideoFeed();
    }

    return () => {
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Set camera location if provided
    if (cameraLocation && serviceRef.current) {
      serviceRef.current.setCameraLocation(
        cameraLocation.lat,
        cameraLocation.lng,
      );
    }
  }, [cameraLocation]);

  const startVideoFeed = async () => {
    try {
      setError(null);

      if (feedSource === "camera") {
        await startCameraFeed();
      }

      setIsActive(true);
    } catch (error) {
      handleError("Failed to start video feed", error);
    }
  };

  const startCameraFeed = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Use rear camera on mobile
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Wait for video to load metadata
        videoRef.current.onloadedmetadata = () => {
          initializeProcessing();
        };
      }
    } catch (error) {
      throw new Error(`Camera access denied: ${error.message}`);
    }
  };

  const initializeProcessing = async () => {
    if (!serviceRef.current || !videoRef.current) return;

    const success = await serviceRef.current.initialize(videoRef.current, {
      onCrowdDataUpdate: (data) => {
        if (onCrowdDataUpdate) {
          onCrowdDataUpdate(data);
        }
        updateStatistics();
      },
      onError: handleError,
      onStatusChange: (status) => {
        setIsProcessing(status === "processing");
        if (onStatusChange) {
          onStatusChange(status);
        }
      },
    });

    if (success) {
      serviceRef.current.startProcessing();
    }
  };

  const stopVideoFeed = () => {
    if (serviceRef.current) {
      serviceRef.current.stopProcessing();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setIsProcessing(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.onloadedmetadata = () => {
        initializeProcessing();
        setIsActive(true);
      };
    }
  };

  const updateStatistics = () => {
    if (serviceRef.current) {
      const stats = serviceRef.current.getCrowdStatistics();
      setStatistics(stats);
    }
  };

  const handleError = (message, error) => {
    console.error("VideoFeed Error:", message, error);
    setError(`${message}: ${error?.message || "Unknown error"}`);

    if (onError) {
      onError(message, error);
    }
  };

  const cleanup = () => {
    stopVideoFeed();

    if (serviceRef.current) {
      serviceRef.current.destroy();
      serviceRef.current = null;
    }
  };

  const toggleProcessing = () => {
    if (!serviceRef.current) return;

    if (isProcessing) {
      serviceRef.current.stopProcessing();
    } else {
      serviceRef.current.startProcessing();
    }
  };

  return (
    <div className="video-feed-container">
      {/* Video Feed Header */}
      <div className="video-feed-header">
        <h3>📹 Live Video Feed</h3>
        <div className="feed-controls">
          <select
            value={feedSource}
            onChange={(e) => setFeedSource(e.target.value)}
            disabled={isActive}
          >
            <option value="camera">Camera Feed</option>
            <option value="upload">Upload Video</option>
          </select>

          {!isActive ? (
            <button className="btn btn-primary" onClick={startVideoFeed}>
              Start Feed
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stopVideoFeed}>
              Stop Feed
            </button>
          )}

          {isActive && (
            <button
              className={`btn ${isProcessing ? "btn-warning" : "btn-success"}`}
              onClick={toggleProcessing}
            >
              {isProcessing ? "Pause AI" : "Start AI"}
            </button>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="feed-status">
        <div className={`status-indicator ${isActive ? "active" : "inactive"}`}>
          <span className="status-dot"></span>
          {isActive ? "LIVE" : "OFFLINE"}
        </div>

        {isProcessing && (
          <div className="processing-indicator">
            <span className="processing-spinner"></span>
            AI Processing
          </div>
        )}
      </div>

      {/* Video Display */}
      <div className="video-display">
        <video
          ref={videoRef}
          className="video-element"
          muted
          playsInline
          controls={feedSource === "upload"}
        />

        {feedSource === "upload" && !isActive && (
          <div className="upload-overlay">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="file-input"
              id="video-upload"
            />
            <label htmlFor="video-upload" className="upload-label">
              📁 Select Video File
            </label>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <div className="error-message">⚠️ {error}</div>
            <button className="btn btn-primary" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Real-time Statistics */}
      {isActive && (
        <div className="feed-statistics">
          <h4>📊 Live Analysis</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">People Detected:</span>
              <span className="stat-value">{statistics.totalPeople}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Density:</span>
              <span className="stat-value">{statistics.averageDensity}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Hotspots:</span>
              <span className="stat-value critical">{statistics.hotspots}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Coverage:</span>
              <span className="stat-value">{statistics.coverage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera Permission Help */}
      {!isActive && feedSource === "camera" && (
        <div className="permission-help">
          <h4>📱 Camera Setup</h4>
          <p>To use live camera feed:</p>
          <ul>
            <li>Allow camera access when prompted</li>
            <li>Ensure good lighting for better detection</li>
            <li>Position camera to capture crowd areas</li>
            <li>For mobile: Use landscape orientation</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;
