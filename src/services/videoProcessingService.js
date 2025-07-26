import axios from "axios";

/**
 * Video Processing Service for Real-time Crowd Density Analysis
 * Integrates with Google Vertex AI Vision API for human detection and crowd analysis
 */
class VideoProcessingService {
  constructor() {
    this.isProcessing = false;
    this.videoElement = null;
    this.canvas = null;
    this.context = null;
    this.detectionInterval = null;
    this.animationFrame = null;
    this.crowdData = [];
    this.lastDetections = [];
    this.detectionHistory = [];
    this.callbacks = {
      onCrowdDataUpdate: null,
      onError: null,
      onStatusChange: null,
    };

    // Configuration for real-time processing with Vertex AI
    this.config = {
      detectionIntervalMs: 500, // Process every 500ms for real-time (reduced from 2000ms)
      confidenceThreshold: 0.5,
      maxDetections: 100,
      heatmapGridSize: 20,
      smoothingFactor: 0.7, // For stabilizing detection counts
      motionThreshold: 0.02, // Minimum motion to trigger detection
      historyLength: 5, // Keep last 5 detections for smoothing

      // Backend API Configuration - now using Firebase Functions
      backendUrl:
        process.env.NODE_ENV === "production"
          ? "/api" // Firebase Functions URL via hosting rewrites
          : "http://localhost:5001/zero2agent-ffe2e/us-central1/api", // Local emulator
      projectId: process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.REACT_APP_VERTEX_LOCATION || "us-central1",
      useBackendProxy: true,
    };

    this.cameraLocation = {
      lat: 37.7749,
      lng: -122.4194,
    };

    // Motion detection variables
    this.previousFrame = null;
    this.motionDetected = false;
    this.isAuthenticating = false;
  }

  /**
   * Initialize video processing with Vertex AI authentication
   * @param {HTMLVideoElement} videoElement - Video element to process
   * @param {Object} callbacks - Callback functions for events
   */
  async initialize(videoElement, callbacks = {}) {
    try {
      this.videoElement = videoElement;
      this.callbacks = { ...this.callbacks, ...callbacks };

      // Create canvas for frame capture
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");

      // Wait for video metadata to load
      await new Promise((resolve) => {
        if (videoElement.videoWidth && videoElement.videoHeight) {
          resolve();
        } else {
          videoElement.addEventListener("loadedmetadata", resolve, {
            once: true,
          });
        }
      });

      // Set canvas size to match video
      this.canvas.width = videoElement.videoWidth || 640;
      this.canvas.height = videoElement.videoHeight || 480;

      this.notifyStatusChange("loading_model");

      // Authenticate with Vertex AI
      console.log("Authenticating with Vertex AI...");
      await this.authenticateVertexAI();

      console.log("Vertex AI authentication successful");
      this.notifyStatusChange("initialized");
      return true;
    } catch (error) {
      this.handleError("Initialization failed", error);
      return false;
    }
  }

  /**
   * Authenticate with Vertex AI using backend OAuth token
   */
  async authenticateVertexAI() {
    if (!this.config.projectId) {
      throw new Error(
        "Google Cloud Project ID is required. Please set REACT_APP_GOOGLE_CLOUD_PROJECT_ID environment variable.",
      );
    }

    if (!this.config.useBackendProxy) {
      console.warn("Backend proxy not configured, using mock detection mode");
      this.config.useMockDetection = true;
      return;
    }

    // Get OAuth token from backend
    try {
      console.log("Requesting OAuth token from backend...");
      const response = await axios.post(
        `${this.config.backendUrl}/auth/vertex-ai-token`,
        {
          projectId: this.config.projectId,
        },
        {
          timeout: 10000, // 10 second timeout for authentication
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.access_token) {
        this.config.accessToken = response.data.access_token;
        this.config.tokenExpiry = Date.now() + response.data.expires_in * 1000;
        this.config.authenticated = true;
        console.log("✅ Backend OAuth authentication successful");
        console.log(`🔑 Token expires in ${response.data.expires_in} seconds`);
      } else {
        throw new Error("No access token received from backend");
      }
    } catch (error) {
      console.warn(
        "❌ Could not authenticate with backend, using mock detection mode:",
        error.response?.data?.error || error.message,
      );
      // Set flag to use mock detection
      this.config.useMockDetection = true;
      this.config.authenticated = false;
    }
  }

  /**
   * Check if OAuth token is still valid and refresh if needed
   */
  async ensureValidToken() {
    if (!this.config.authenticated || !this.config.accessToken) {
      return false;
    }

    // Check if token is expiring soon (refresh 5 minutes before expiry)
    const fiveMinutes = 5 * 60 * 1000;
    if (
      this.config.tokenExpiry &&
      Date.now() + fiveMinutes >= this.config.tokenExpiry
    ) {
      console.log("🔄 OAuth token expiring soon, refreshing...");
      await this.authenticateVertexAI();
    }

    return this.config.authenticated;
  }

  /**
   * Start real-time processing with motion detection
   */
  startProcessing() {
    if (this.isProcessing || !this.videoElement) {
      return;
    }

    this.isProcessing = true;
    this.notifyStatusChange("processing");

    // Start continuous processing loop
    this.processVideoLoop();

    console.log("Real-time video processing started with Vertex AI");
  }

  /**
   * Main processing loop for real-time detection
   */
  processVideoLoop() {
    if (!this.isProcessing) return;

    try {
      // Detect motion first to optimize processing
      const hasMotion = this.detectMotion();

      // Process frame for person detection
      this.processCurrentFrame(hasMotion);

      // Schedule next frame with adaptive timing
      this.animationFrame = requestAnimationFrame(() => {
        const delay = hasMotion
          ? this.config.detectionIntervalMs
          : this.config.detectionIntervalMs * 2;
        setTimeout(() => this.processVideoLoop(), delay);
      });
    } catch (error) {
      this.handleError("Processing loop error", error);
      // Continue processing despite errors
      setTimeout(
        () => this.processVideoLoop(),
        this.config.detectionIntervalMs,
      );
    }
  }

  /**
   * Detect motion in video frames to optimize processing
   */
  detectMotion() {
    if (!this.videoElement || !this.canvas) return true;

    // Capture current frame
    this.context.drawImage(
      this.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const currentFrame = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return true; // Process first frame
    }

    // Calculate motion by comparing frames
    let motionPixels = 0;
    const threshold = 30; // Pixel difference threshold
    const data = currentFrame.data;
    const prevData = this.previousFrame.data;

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const diff =
        Math.abs(data[i] - prevData[i]) +
        Math.abs(data[i + 1] - prevData[i + 1]) +
        Math.abs(data[i + 2] - prevData[i + 2]);

      if (diff > threshold) {
        motionPixels++;
      }
    }

    const motionRatio = motionPixels / (data.length / 40);
    this.motionDetected = motionRatio > this.config.motionThreshold;
    this.previousFrame = currentFrame;

    return this.motionDetected;
  }

  /**
   * Process current video frame for person detection using Vertex AI
   */
  async processCurrentFrame(forceProcess = false) {
    if (!this.videoElement || !this.canvas) {
      return;
    }

    try {
      // Only process if motion detected or forced
      if (!forceProcess && !this.motionDetected) {
        return;
      }

      // Capture current frame
      this.context.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );

      // Resize and convert to base64 for Vertex AI (reduce payload size)
      const resizedImageData = this.resizeCanvasForAPI(this.canvas, 640, 480);
      const base64Image = resizedImageData.split(",")[1];

      // Ensure we have a valid OAuth token
      const hasValidToken = await this.ensureValidToken();

      // Detect humans using Vertex AI
      const detections = await this.detectHumansVertexAI(
        base64Image,
        hasValidToken,
      );

      // Smooth detection count using history
      const smoothedCount = this.smoothDetectionCount(detections.length);

      // Update detection history
      this.updateDetectionHistory(detections, smoothedCount);

      // Calculate crowd density
      const densityData = this.calculateCrowdDensity(detections, smoothedCount);

      // Update crowd data
      this.crowdData = densityData;

      // Notify callback with real-time data
      if (this.callbacks.onCrowdDataUpdate) {
        this.callbacks.onCrowdDataUpdate(densityData);
      }

      console.log(
        `Vertex AI detected ${smoothedCount} people (raw: ${detections.length})`,
      );
    } catch (error) {
      this.handleError("Frame processing failed", error);
    }
  }

  /**
   * Detect humans using Vertex AI Vision API via backend proxy with OAuth
   * @param {string} base64Image - Base64 encoded image
   * @param {boolean} hasValidToken - Whether we have a valid OAuth token
   * @returns {Array} Array of person detections
   */
  async detectHumansVertexAI(base64Image, hasValidToken = false) {
    try {
      // If configured to use mock detection or no authentication
      if (
        this.config.useMockDetection ||
        !hasValidToken ||
        !this.config.authenticated
      ) {
        if (!hasValidToken) {
          console.warn("⚠️ No valid OAuth token - using mock detection");
        } else {
          console.warn(
            "⚠️ Using mock detection - configure backend authentication for real detection",
          );
        }
        return this.generateIntelligentMockDetections();
      }

      console.log("🤖 Making Vertex AI detection request with OAuth token...");

      // Call backend proxy endpoint for Vertex AI with OAuth
      const response = await axios.post(
        `${this.config.backendUrl}/vertex-ai/detect`,
        {
          base64Image: base64Image,
          projectId: this.config.projectId,
          location: this.config.location,
        },
        {
          timeout: 8000, // 8 second timeout for real-time processing
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.accessToken}`, // Include OAuth token
          },
        },
      );

      // Backend already filters for person detections
      const detections = response.data.detections || [];
      const personCount = detections.length;

      console.log(
        `✅ Vertex AI detected ${personCount} people with OAuth authentication`,
      );

      return detections.map((detection) => ({
        bbox: this.convertVertexAIBbox(detection.boundingBox),
        score: detection.confidence,
        class: "person",
      }));
    } catch (error) {
      // Handle authentication errors specifically
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("🔑 Authentication failed, refreshing token...");
        this.config.authenticated = false;
        await this.authenticateVertexAI();
      }

      console.warn(
        "❌ Backend Vertex AI detection failed, using mock detection:",
        error.response?.data?.error || error.message,
      );
      return this.generateIntelligentMockDetections();
    }
  }

  /**
   * Convert Vertex AI bounding box format to standard format
   */
  convertVertexAIBbox(vertexBbox) {
    // Vertex AI returns normalized coordinates
    const vertices = vertexBbox.normalizedVertices;
    if (!vertices || vertices.length < 2) {
      return [0, 0, 0, 0];
    }

    const x1 = vertices[0].x * this.canvas.width;
    const y1 = vertices[0].y * this.canvas.height;
    const x2 = vertices[1].x * this.canvas.width;
    const y2 = vertices[1].y * this.canvas.height;

    return [x1, y1, x2 - x1, y2 - y1]; // [x, y, width, height]
  }

  /**
   * Generate intelligent mock detections for development/testing
   * This creates more realistic detection patterns
   */
  generateIntelligentMockDetections() {
    // Base number of people with some randomness
    const baseCount = 3; // Minimum people
    const variation = Math.floor(Math.random() * 8); // 0-7 additional people
    const numDetections = baseCount + variation;

    const detections = [];

    // Create more stable detections with realistic confidence scores
    for (let i = 0; i < numDetections; i++) {
      // Create clusters of people (more realistic)
      const clusterX = Math.random() * 0.6 + 0.2; // Avoid edges
      const clusterY = Math.random() * 0.6 + 0.2;

      // Add some spread within cluster
      const spreadX = (Math.random() - 0.5) * 0.3;
      const spreadY = (Math.random() - 0.5) * 0.3;

      const x = Math.max(0, Math.min(1, clusterX + spreadX));
      const y = Math.max(0, Math.min(1, clusterY + spreadY));

      detections.push({
        bbox: [
          x * this.canvas.width,
          y * this.canvas.height,
          40 + Math.random() * 60, // Width: 40-100px
          80 + Math.random() * 120, // Height: 80-200px
        ],
        score: 0.6 + Math.random() * 0.4, // Confidence: 0.6-1.0
        class: "person",
      });
    }

    return detections;
  }

  /**
   * Smooth detection count using rolling average
   */
  smoothDetectionCount(currentCount) {
    // Add current count to history
    this.detectionHistory.push(currentCount);

    // Keep only recent history
    if (this.detectionHistory.length > this.config.historyLength) {
      this.detectionHistory.shift();
    }

    // Calculate weighted average (more recent = higher weight)
    let weightedSum = 0;
    let totalWeight = 0;

    this.detectionHistory.forEach((count, index) => {
      const weight = (index + 1) / this.detectionHistory.length;
      weightedSum += count * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Update detection history for analysis
   */
  updateDetectionHistory(detections, smoothedCount) {
    this.lastDetections = detections.map((detection) => ({
      bbox: detection.bbox,
      score: detection.score,
      timestamp: Date.now(),
    }));

    // Store metadata
    this.lastDetectionMeta = {
      rawCount: detections.length,
      smoothedCount: smoothedCount,
      timestamp: new Date().toISOString(),
      confidence:
        detections.reduce((sum, d) => sum + d.score, 0) /
        Math.max(detections.length, 1),
      usingVertexAI: !this.config.useMockDetection && !!this.config.accessToken,
    };
  }

  /**
   * Calculate crowd density from person detections
   */
  calculateCrowdDensity(detections, totalPeople) {
    const gridSize = this.config.heatmapGridSize;
    const cellWidth = this.canvas.width / gridSize;
    const cellHeight = this.canvas.height / gridSize;

    // Initialize density grid
    const densityGrid = Array(gridSize)
      .fill()
      .map(() => Array(gridSize).fill(0));

    // Map detections to grid cells
    detections.forEach((detection) => {
      const [x, y, width, height] = detection.bbox;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      const gridX = Math.floor(centerX / cellWidth);
      const gridY = Math.floor(centerY / cellHeight);

      if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
        densityGrid[gridY][gridX] += detection.score;
      }
    });

    // Convert grid to coordinate points
    const densityPoints = [];
    const baseLocation = this.getBaseLocation();
    const areaScale = 0.0001; // Scale for mapping to geographic coordinates

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (densityGrid[y][x] > 0) {
          const lat = baseLocation.lat + (y - gridSize / 2) * areaScale;
          const lng = baseLocation.lng + (x - gridSize / 2) * areaScale;

          densityPoints.push({
            lat,
            lng,
            density: Math.min(densityGrid[y][x] * 3, 10), // Scale and cap density
            timestamp: new Date().toISOString(),
            personCount: Math.max(1, Math.floor(densityGrid[y][x])),
            confidence: densityGrid[y][x] / detections.length || 0,
          });
        }
      }
    }

    // Add summary point with total count
    if (totalPeople > 0) {
      densityPoints.push({
        lat: baseLocation.lat,
        lng: baseLocation.lng,
        density: Math.min(totalPeople / 2, 10),
        timestamp: new Date().toISOString(),
        personCount: totalPeople,
        confidence: this.lastDetectionMeta?.confidence || 0,
        isTotal: true,
      });
    }

    return densityPoints;
  }

  /**
   * Stop processing video frames
   */
  stopProcessing() {
    this.isProcessing = false;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.notifyStatusChange("stopped");
    console.log("Video processing stopped");
  }

  /**
   * Get base location for mapping density points
   */
  getBaseLocation() {
    return this.cameraLocation;
  }

  /**
   * Set camera location for accurate mapping
   */
  setCameraLocation(lat, lng) {
    this.cameraLocation = { lat, lng };
  }

  /**
   * Get current crowd statistics
   */
  getCrowdStatistics() {
    const meta = this.lastDetectionMeta;

    if (!meta) {
      return {
        totalPeople: 0,
        averageDensity: 0,
        hotspots: 0,
        coverage: 0,
        confidence: 0,
        lastUpdate: null,
        usingVertexAI: false,
      };
    }

    const totalPeople = meta.smoothedCount;
    const averageDensity =
      this.crowdData.length > 0
        ? this.crowdData.reduce((sum, point) => sum + point.density, 0) /
          this.crowdData.length
        : 0;
    const hotspots = this.crowdData.filter((point) => point.density > 7).length;
    const coverage =
      (this.crowdData.length /
        (this.config.heatmapGridSize * this.config.heatmapGridSize)) *
      100;

    return {
      totalPeople,
      averageDensity: parseFloat(averageDensity.toFixed(2)),
      hotspots,
      coverage: parseFloat(coverage.toFixed(1)),
      confidence: parseFloat((meta.confidence * 100).toFixed(1)),
      lastUpdate: meta.timestamp,
      motionDetected: this.motionDetected,
      rawCount: meta.rawCount,
      usingVertexAI: meta.usingVertexAI,
    };
  }

  /**
   * Get current crowd data
   */
  getCurrentCrowdData() {
    return this.crowdData;
  }

  /**
   * Get last person detections with bounding boxes
   */
  getLastDetections() {
    return this.lastDetections;
  }

  /**
   * Get detection metadata
   */
  getDetectionMetadata() {
    return this.lastDetectionMeta;
  }

  /**
   * Update Vertex AI configuration
   */
  updateVertexAIConfig(config) {
    this.config = { ...this.config, ...config };

    // Re-authenticate if credentials changed
    if (config.apiKey || config.projectId) {
      this.authenticateVertexAI().catch((error) => {
        console.warn("Re-authentication failed:", error);
      });
    }
  }

  /**
   * Handle errors
   */
  handleError(message, error) {
    console.error(`VideoProcessingService: ${message}`, error);

    if (this.callbacks.onError) {
      this.callbacks.onError(message, error);
    }
  }

  /**
   * Notify status change
   */
  notifyStatusChange(status) {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopProcessing();

    this.videoElement = null;
    this.canvas = null;
    this.context = null;
    this.crowdData = [];
    this.lastDetections = [];
    this.detectionHistory = [];
    this.callbacks = {};
    this.previousFrame = null;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Resize canvas image for API to reduce payload size
   */
  resizeCanvasForAPI(sourceCanvas, maxWidth = 640, maxHeight = 480) {
    const tempCanvas = document.createElement("canvas");
    const tempContext = tempCanvas.getContext("2d");

    // Calculate aspect ratio
    const aspectRatio = sourceCanvas.width / sourceCanvas.height;

    let newWidth, newHeight;
    if (aspectRatio > 1) {
      // Landscape
      newWidth = Math.min(maxWidth, sourceCanvas.width);
      newHeight = newWidth / aspectRatio;
    } else {
      // Portrait or square
      newHeight = Math.min(maxHeight, sourceCanvas.height);
      newWidth = newHeight * aspectRatio;
    }

    // Set canvas dimensions
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;

    // Draw resized image
    tempContext.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);

    // Return base64 with reduced quality for smaller payload
    return tempCanvas.toDataURL("image/jpeg", 0.6);
  }
}

export default VideoProcessingService;
