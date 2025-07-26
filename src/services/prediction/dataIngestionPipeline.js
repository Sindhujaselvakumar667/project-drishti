import { db } from '../../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Data Ingestion Pipeline for Crowd Movement Metrics
 * Collects, processes, and stores timestamped location data for ML forecasting
 */
class DataIngestionPipeline {
  constructor() {
    this.isRunning = false;
    this.collectionInterval = null;
    this.batchSize = 50;
    this.dataBuffer = [];
    this.lastProcessedTime = null;

    // Configuration
    this.config = {
      collectionIntervalMs: 30000, // Collect data every 30 seconds
      batchFlushIntervalMs: 60000, // Flush batch every minute
      maxDataPoints: 1000, // Maximum data points to keep in buffer
      smoothingWindow: 3, // Moving average window for smoothing
      gridResolution: 20, // Grid resolution for spatial aggregation
      eventId: 'current_event', // Current event identifier
    };

    // Initialize data structures
    this.spatialGrid = this.initializeSpatialGrid();
    this.movementHistory = new Map();
    this.callbacks = {
      onDataCollected: null,
      onBatchProcessed: null,
      onError: null,
    };
  }

  /**
   * Initialize spatial grid for crowd density tracking
   */
  initializeSpatialGrid() {
    const grid = {};
    const resolution = this.config.gridResolution;

    for (let x = 0; x < resolution; x++) {
      for (let y = 0; y < resolution; y++) {
        const cellId = `${x}_${y}`;
        grid[cellId] = {
          x,
          y,
          density: 0,
          personCount: 0,
          avgVelocity: { x: 0, y: 0 },
          timestamp: new Date(),
          historicalData: [],
        };
      }
    }

    return grid;
  }

  /**
   * Start the data ingestion pipeline
   */
  start(callbacks = {}) {
    if (this.isRunning) {
      console.warn('Data ingestion pipeline is already running');
      return;
    }

    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isRunning = true;
    this.lastProcessedTime = new Date();

    // Start collection interval
    this.collectionInterval = setInterval(() => {
      this.collectCrowdData();
    }, this.config.collectionIntervalMs);

    // Start batch processing interval
    this.batchInterval = setInterval(() => {
      this.processBatch();
    }, this.config.batchFlushIntervalMs);

    console.log('Data ingestion pipeline started');
  }

  /**
   * Stop the data ingestion pipeline
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    // Process any remaining data in buffer
    if (this.dataBuffer.length > 0) {
      this.processBatch();
    }

    console.log('Data ingestion pipeline stopped');
  }

  /**
   * Ingest crowd data from video processing or other sources
   */
  ingestCrowdData(crowdData) {
    if (!crowdData || !Array.isArray(crowdData)) return;

    const timestamp = new Date();

    // Process each data point
    crowdData.forEach(point => {
      this.processDataPoint(point, timestamp);
    });

    // Update spatial grid
    this.updateSpatialGrid(crowdData, timestamp);

    // Add to buffer for batch processing
    this.addToBuffer({
      timestamp,
      dataPoints: crowdData,
      gridSnapshot: this.getGridSnapshot(),
      movementMetrics: this.calculateMovementMetrics(),
    });
  }

  /**
   * Process individual data point
   */
  processDataPoint(point, timestamp) {
    const pointId = `${point.lat.toFixed(6)}_${point.lng.toFixed(6)}`;

    // Track movement history
    if (this.movementHistory.has(pointId)) {
      const history = this.movementHistory.get(pointId);
      const lastPoint = history[history.length - 1];

      // Calculate velocity
      const timeDiff = (timestamp - lastPoint.timestamp) / 1000; // seconds
      const velocity = this.calculateVelocity(lastPoint, point, timeDiff);

      // Add to history with velocity
      history.push({
        ...point,
        timestamp,
        velocity,
      });

      // Keep only recent history (last 10 points)
      if (history.length > 10) {
        history.shift();
      }
    } else {
      // Initialize history for new point
      this.movementHistory.set(pointId, [{
        ...point,
        timestamp,
        velocity: { x: 0, y: 0, magnitude: 0 },
      }]);
    }
  }

  /**
   * Calculate velocity between two points
   */
  calculateVelocity(lastPoint, currentPoint, timeDiff) {
    if (timeDiff === 0) {
      return { x: 0, y: 0, magnitude: 0 };
    }

    const deltaLat = currentPoint.lat - lastPoint.lat;
    const deltaLng = currentPoint.lng - lastPoint.lng;

    // Convert to approximate meters (rough calculation)
    const latMeters = deltaLat * 111000; // 1 degree lat ≈ 111km
    const lngMeters = deltaLng * 111000 * Math.cos(currentPoint.lat * Math.PI / 180);

    const velocityX = lngMeters / timeDiff;
    const velocityY = latMeters / timeDiff;
    const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

    return {
      x: velocityX,
      y: velocityY,
      magnitude,
    };
  }

  /**
   * Update spatial grid with new data
   */
  updateSpatialGrid(crowdData, timestamp) {
    // Reset grid densities
    Object.keys(this.spatialGrid).forEach(cellId => {
      this.spatialGrid[cellId].density = 0;
      this.spatialGrid[cellId].personCount = 0;
      this.spatialGrid[cellId].avgVelocity = { x: 0, y: 0 };
    });

    // Aggregate data into grid cells
    const cellCounts = {};
    const cellVelocities = {};

    crowdData.forEach(point => {
      const cellId = this.getGridCell(point.lat, point.lng);

      if (this.spatialGrid[cellId]) {
        // Update density and person count
        this.spatialGrid[cellId].density += point.density || 1;
        this.spatialGrid[cellId].personCount += point.personCount || 1;

        // Aggregate velocity
        const pointId = `${point.lat.toFixed(6)}_${point.lng.toFixed(6)}`;
        const history = this.movementHistory.get(pointId);

        if (history && history.length > 0) {
          const velocity = history[history.length - 1].velocity;

          if (!cellVelocities[cellId]) {
            cellVelocities[cellId] = { x: 0, y: 0, count: 0 };
          }

          cellVelocities[cellId].x += velocity.x;
          cellVelocities[cellId].y += velocity.y;
          cellVelocities[cellId].count += 1;
        }

        cellCounts[cellId] = (cellCounts[cellId] || 0) + 1;
      }
    });

    // Calculate average velocities
    Object.keys(cellVelocities).forEach(cellId => {
      const vel = cellVelocities[cellId];
      if (vel.count > 0) {
        this.spatialGrid[cellId].avgVelocity = {
          x: vel.x / vel.count,
          y: vel.y / vel.count,
        };
      }
    });

    // Update timestamps and historical data
    Object.keys(this.spatialGrid).forEach(cellId => {
      const cell = this.spatialGrid[cellId];
      cell.timestamp = timestamp;

      // Add to historical data
      cell.historicalData.push({
        timestamp,
        density: cell.density,
        personCount: cell.personCount,
        avgVelocity: { ...cell.avgVelocity },
      });

      // Keep only recent history (last 20 data points)
      if (cell.historicalData.length > 20) {
        cell.historicalData.shift();
      }
    });
  }

  /**
   * Get grid cell ID for lat/lng coordinates
   */
  getGridCell(lat, lng) {
    // Assuming a bounding box around the event area
    const bounds = {
      north: 37.7800,
      south: 37.7700,
      east: -122.4100,
      west: -122.4300,
    };

    const normalizedLat = (lat - bounds.south) / (bounds.north - bounds.south);
    const normalizedLng = (lng - bounds.west) / (bounds.east - bounds.west);

    const x = Math.floor(normalizedLat * this.config.gridResolution);
    const y = Math.floor(normalizedLng * this.config.gridResolution);

    const clampedX = Math.max(0, Math.min(this.config.gridResolution - 1, x));
    const clampedY = Math.max(0, Math.min(this.config.gridResolution - 1, y));

    return `${clampedX}_${clampedY}`;
  }

  /**
   * Get current grid snapshot
   */
  getGridSnapshot() {
    const snapshot = {};

    Object.keys(this.spatialGrid).forEach(cellId => {
      const cell = this.spatialGrid[cellId];
      snapshot[cellId] = {
        density: cell.density,
        personCount: cell.personCount,
        avgVelocity: { ...cell.avgVelocity },
        timestamp: cell.timestamp,
      };
    });

    return snapshot;
  }

  /**
   * Calculate movement metrics
   */
  calculateMovementMetrics() {
    const metrics = {
      totalPeople: 0,
      avgDensity: 0,
      avgVelocity: 0,
      congestionScore: 0,
      flowDirections: [],
      hotspots: [],
      timestamp: new Date(),
    };

    const activeCells = Object.values(this.spatialGrid).filter(cell => cell.personCount > 0);

    if (activeCells.length === 0) return metrics;

    // Calculate totals and averages
    let totalVelocity = 0;
    let totalDensity = 0;
    let velocityCount = 0;

    activeCells.forEach(cell => {
      metrics.totalPeople += cell.personCount;
      totalDensity += cell.density;

      const velocityMagnitude = Math.sqrt(
        cell.avgVelocity.x * cell.avgVelocity.x +
        cell.avgVelocity.y * cell.avgVelocity.y
      );

      totalVelocity += velocityMagnitude;
      velocityCount++;

      // Identify hotspots (high density, low velocity)
      if (cell.density > 5 && velocityMagnitude < 0.5) {
        metrics.hotspots.push({
          cellId: `${cell.x}_${cell.y}`,
          density: cell.density,
          personCount: cell.personCount,
          velocity: velocityMagnitude,
        });
      }
    });

    metrics.avgDensity = totalDensity / activeCells.length;
    metrics.avgVelocity = velocityCount > 0 ? totalVelocity / velocityCount : 0;

    // Calculate congestion score (high density + low velocity = high congestion)
    metrics.congestionScore = metrics.avgDensity * (1 / (metrics.avgVelocity + 0.1));

    return metrics;
  }

  /**
   * Add data to buffer for batch processing
   */
  addToBuffer(data) {
    this.dataBuffer.push(data);

    // If buffer is full, process immediately
    if (this.dataBuffer.length >= this.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Process batch of collected data
   */
  async processBatch() {
    if (this.dataBuffer.length === 0) return;

    try {
      // Prepare batch data for ML pipeline
      const batchData = this.prepareBatchForML();

      // Store to Firebase
      await this.storeBatchToFirebase(batchData);

      // Trigger callback
      if (this.callbacks.onBatchProcessed) {
        this.callbacks.onBatchProcessed(batchData);
      }

      // Clear buffer
      this.dataBuffer = [];

      console.log(`Processed batch of ${batchData.timeSeriesData.length} data points`);

    } catch (error) {
      console.error('Error processing batch:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Batch processing failed', error);
      }
    }
  }

  /**
   * Prepare batch data for ML pipeline
   */
  prepareBatchForML() {
    const timeSeriesData = [];
    const spatialFeatures = [];

    this.dataBuffer.forEach(item => {
      // Time series features
      timeSeriesData.push({
        timestamp: item.timestamp.toISOString(),
        totalPeople: item.movementMetrics.totalPeople,
        avgDensity: item.movementMetrics.avgDensity,
        avgVelocity: item.movementMetrics.avgVelocity,
        congestionScore: item.movementMetrics.congestionScore,
        hotspotCount: item.movementMetrics.hotspots.length,
      });

      // Spatial features per grid cell
      Object.keys(item.gridSnapshot).forEach(cellId => {
        const cell = item.gridSnapshot[cellId];
        const [x, y] = cellId.split('_').map(Number);

        spatialFeatures.push({
          timestamp: item.timestamp.toISOString(),
          cellId,
          x,
          y,
          density: cell.density,
          personCount: cell.personCount,
          velocityX: cell.avgVelocity.x,
          velocityY: cell.avgVelocity.y,
          velocityMagnitude: Math.sqrt(
            cell.avgVelocity.x * cell.avgVelocity.x +
            cell.avgVelocity.y * cell.avgVelocity.y
          ),
        });
      });
    });

    return {
      eventId: this.config.eventId,
      batchId: `batch_${Date.now()}`,
      timestamp: new Date(),
      timeSeriesData,
      spatialFeatures,
      metadata: {
        gridResolution: this.config.gridResolution,
        dataPointCount: this.dataBuffer.length,
        collectionInterval: this.config.collectionIntervalMs,
      },
    };
  }

  /**
   * Store batch data to Firebase
   */
  async storeBatchToFirebase(batchData) {
    try {
      // Store time series data
      const timeSeriesRef = collection(db, 'CrowdTimeSeriesData');
      await addDoc(timeSeriesRef, {
        eventId: batchData.eventId,
        batchId: batchData.batchId,
        timestamp: Timestamp.fromDate(batchData.timestamp),
        data: batchData.timeSeriesData,
        metadata: batchData.metadata,
      });

      // Store spatial features
      const spatialRef = collection(db, 'CrowdSpatialFeatures');
      await addDoc(spatialRef, {
        eventId: batchData.eventId,
        batchId: batchData.batchId,
        timestamp: Timestamp.fromDate(batchData.timestamp),
        features: batchData.spatialFeatures,
        metadata: batchData.metadata,
      });

      console.log(`Stored batch ${batchData.batchId} to Firebase`);

    } catch (error) {
      console.error('Error storing batch to Firebase:', error);
      throw error;
    }
  }

  /**
   * Get historical data for ML training
   */
  async getHistoricalData(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Get time series data
      const timeSeriesQuery = query(
        collection(db, 'CrowdTimeSeriesData'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const timeSeriesSnapshot = await getDocs(timeSeriesQuery);
      const timeSeriesData = [];

      timeSeriesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp.toDate() > cutoffTime) {
          timeSeriesData.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp.toDate(),
          });
        }
      });

      // Get spatial features
      const spatialQuery = query(
        collection(db, 'CrowdSpatialFeatures'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const spatialSnapshot = await getDocs(spatialQuery);
      const spatialData = [];

      spatialSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp.toDate() > cutoffTime) {
          spatialData.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp.toDate(),
          });
        }
      });

      return {
        timeSeriesData,
        spatialData,
      };

    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }

  /**
   * Get current grid state for visualization
   */
  getCurrentGridState() {
    return {
      grid: this.spatialGrid,
      metrics: this.calculateMovementMetrics(),
      timestamp: new Date(),
    };
  }

  /**
   * Manual data collection trigger
   */
  async collectCrowdData() {
    try {
      // This would typically be called with real crowd data
      // For now, we'll simulate or wait for external data

      if (this.callbacks.onDataCollected) {
        this.callbacks.onDataCollected();
      }

    } catch (error) {
      console.error('Error collecting crowd data:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Data collection failed', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    this.dataBuffer = [];
    this.movementHistory.clear();
    this.spatialGrid = {};
    this.callbacks = {};
  }
}

export default DataIngestionPipeline;
