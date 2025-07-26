import axios from 'axios';

/**
 * Vertex AI Forecasting Service for Crowd Surge Prediction
 * Handles model training, prediction requests, and real-time forecasting
 */
class VertexAIForecastingService {
  constructor() {
    this.isInitialized = false;
    this.modelEndpoint = null;
    this.predictionCache = new Map();
    this.lastPredictionTime = null;
    this.predictionHistory = [];
    console.log('Vertex AI Forecasting Service created',process.env.REACT_APP_GOOGLE_CLOUD_API_KEY);

    // Configuration
    this.config = {
      projectId: process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.REACT_APP_VERTEX_LOCATION || 'us-central1',
      backendUrl: process.env.REACT_APP_BACKEND_URL || "http://localhost:5001",
      accessToken: null,
      tokenExpiry: null,
      authenticated: false,
      modelDisplayName: 'crowd-surge-forecasting-model',
      datasetDisplayName: 'crowd-movement-dataset',

      // Forecasting parameters
      forecastHorizon: 10, // 10 minutes ahead
      predictionIntervalMinutes: 2, // New prediction every 2 minutes
      confidenceThreshold: 0.7,
      surgeThreshold: 8.0, // Density threshold for surge alert

      // Model training parameters
      trainingBudgetHours: 2,
      optimizationObjective: 'minimize-rmse',
      targetColumn: 'avgDensity',
      timeColumn: 'timestamp',

      // Feature columns
      featureColumns: [
        'totalPeople',
        'avgDensity',
        'avgVelocity',
        'congestionScore',
        'hotspotCount',
        'timeOfDay',
        'dayOfWeek'
      ]
    };

    this.callbacks = {
      onPredictionUpdate: null,
      onSurgeAlert: null,
      onError: null,
      onModelStatusChange: null
    };
  }

  /**
   * Authenticate with backend OAuth service
   */
  async authenticate() {
    try {
      console.log("🔐 Authenticating Vertex AI Forecasting with backend...");

      const response = await axios.post(`${this.config.backendUrl}/api/auth/vertex-ai-token`, {
        projectId: this.config.projectId,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.access_token) {
        this.config.accessToken = response.data.access_token;
        this.config.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        this.config.authenticated = true;
        console.log("✅ Vertex AI Forecasting authentication successful");
        return true;
      } else {
        throw new Error("No access token received from backend");
      }
    } catch (error) {
      console.warn("❌ Vertex AI Forecasting authentication failed:", error.message);
      this.config.authenticated = false;
      return false;
    }
  }

  /**
   * Ensure we have a valid OAuth token
   */
  async ensureValidToken() {
    if (!this.config.authenticated || !this.config.accessToken) {
      return await this.authenticate();
    }

    // Check if token is expiring soon (refresh 5 minutes before expiry)
    const fiveMinutes = 5 * 60 * 1000;
    if (this.config.tokenExpiry && (Date.now() + fiveMinutes) >= this.config.tokenExpiry) {
      console.log("🔄 Vertex AI Forecasting token expiring soon, refreshing...");
      return await this.authenticate();
    }

    return true;
  }

  /**
   * Initialize the forecasting service
   */
  async initialize(callbacks = {}) {
    try {
      this.callbacks = { ...this.callbacks, ...callbacks };

      if (!this.config.projectId) {
        throw new Error('Google Cloud Project ID is required');
      }

      console.log('Initializing Vertex AI Forecasting Service...');

      // First authenticate with backend
      const authenticated = await this.authenticate();
      if (!authenticated) {
        console.warn('⚠️ Authentication failed, forecasting service will use mock predictions');
        this.isInitialized = true; // Still initialize for mock predictions
        if (this.callbacks.onModelStatusChange) {
          this.callbacks.onModelStatusChange('mock_mode');
        }
        return true;
      }

      // Check if model exists, if not create it
      try {
        await this.ensureModelExists();
      } catch (error) {
        console.warn('⚠️ Model operations failed, using mock predictions:', error.message);
        this.simulateModelCreation();
      }

      this.isInitialized = true;

      if (this.callbacks.onModelStatusChange) {
        this.callbacks.onModelStatusChange('initialized');
      }

      console.log('Vertex AI Forecasting Service initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize forecasting service:', error);
      this.handleError('Initialization failed', error);
      return false;
    }
  }

  /**
   * Ensure forecasting model exists or create new one
   */
  async ensureModelExists() {
    try {
      // List existing models
      const models = await this.listModels();
      const existingModel = models.find(model =>
        model.displayName === this.config.modelDisplayName
      );

      if (existingModel && existingModel.trainingPipeline?.state === 'PIPELINE_STATE_SUCCEEDED') {
        this.modelEndpoint = existingModel.name;
        console.log('Using existing trained model:', this.modelEndpoint);
        return existingModel;
      }

      // Create new model if none exists or training failed
      console.log('Creating new forecasting model...');
      const newModel = await this.createForecastingModel();
      return newModel;

    } catch (error) {
      console.error('Error ensuring model exists:', error);
      throw error;
    }
  }

  /**
   * List existing AutoML forecasting models
   */
  async listModels() {
    // Ensure we have a valid token
    const hasValidToken = await this.ensureValidToken();
    if (!hasValidToken) {
      console.warn('⚠️ No valid OAuth token for listing models');
      return [];
    }

    const url = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/models`;
    console.log('🔍 Listing models...', url);

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data.models || [];
    } catch (error) {
      console.error('❌ Error listing models:', error.response?.data || error.message);

      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔑 Authentication failed, refreshing token...');
        this.config.authenticated = false;
        await this.authenticate();
      }

      return [];
    }
  }

  /**
   * Create new AutoML forecasting model
   */
  async createForecastingModel() {
    try {
      // First, create dataset
      const dataset = await this.createDataset();

      // Then create training pipeline
      const trainingPipeline = await this.createTrainingPipeline(dataset.name);

      if (this.callbacks.onModelStatusChange) {
        this.callbacks.onModelStatusChange('training');
      }

      return trainingPipeline;

    } catch (error) {
      console.error('Error creating forecasting model:', error);
      throw error;
    }
  }

  /**
   * Create dataset for training
   */
  async createDataset() {
    const url = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/datasets`;

    const datasetConfig = {
      displayName: this.config.datasetDisplayName,
      metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
      metadata: {
        inputConfig: {
          timeSeriesIdentifierColumn: 'eventId',
          timeColumn: this.config.timeColumn,
          targetColumn: this.config.targetColumn,
          availableAtForecastColumns: this.config.featureColumns,
          unavailableAtForecastColumns: []
        }
      }
    };

    try {
      const response = await axios.post(url, datasetConfig, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Dataset created:', response.data.name);
      return response.data;

    } catch (error) {
      console.error('Error creating dataset:', error);
      throw error;
    }
  }

  /**
   * Create training pipeline
   */
  async createTrainingPipeline(datasetName) {
    const url = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/trainingPipelines`;

    const pipelineConfig = {
      displayName: `${this.config.modelDisplayName}-pipeline`,
      trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_forecasting_1.0.0.yaml',
      trainingTaskInputs: {
        targetColumn: this.config.targetColumn,
        timeColumn: this.config.timeColumn,
        timeSeriesIdentifierColumn: 'eventId',
        availableAtForecastColumns: this.config.featureColumns,
        forecastHorizon: this.config.forecastHorizon,
        dataGranularity: {
          unit: 'minute',
          quantity: 1
        },
        optimizationObjective: this.config.optimizationObjective,
        trainBudgetMilliNodeHours: this.config.trainingBudgetHours * 1000,
        transformations: this.getFeatureTransformations()
      },
      modelToUpload: {
        displayName: this.config.modelDisplayName
      },
      inputDataConfig: {
        datasetId: datasetName.split('/').pop()
      }
    };

    try {
      const response = await axios.post(url, pipelineConfig, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Training pipeline created:', response.data.name);

      // Monitor training progress
      this.monitorTrainingProgress(response.data.name);

      return response.data;

    } catch (error) {
      console.error('Error creating training pipeline:', error);
      throw error;
    }
  }

  /**
   * Get feature transformations for AutoML
   */
  getFeatureTransformations() {
    return [
      {
        auto: {
          columnName: 'totalPeople'
        }
      },
      {
        auto: {
          columnName: 'avgDensity'
        }
      },
      {
        auto: {
          columnName: 'avgVelocity'
        }
      },
      {
        auto: {
          columnName: 'congestionScore'
        }
      },
      {
        auto: {
          columnName: 'hotspotCount'
        }
      },
      {
        categorical: {
          columnName: 'timeOfDay'
        }
      },
      {
        categorical: {
          columnName: 'dayOfWeek'
        }
      }
    ];
  }

  /**
   * Monitor training pipeline progress
   */
  async monitorTrainingProgress(pipelineName) {
    const checkInterval = 30000; // Check every 30 seconds

    const checkStatus = async () => {
      try {
        const url = `https://${this.config.location}-aiplatform.googleapis.com/v1/${pipelineName}`;

        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const pipeline = response.data;
        const state = pipeline.state;

        console.log(`Training pipeline state: ${state}`);

        if (this.callbacks.onModelStatusChange) {
          this.callbacks.onModelStatusChange(state.toLowerCase().replace('pipeline_state_', ''));
        }

        if (state === 'PIPELINE_STATE_SUCCEEDED') {
          this.modelEndpoint = pipeline.modelToUpload.name;
          console.log('Model training completed successfully');

          // Deploy model for online predictions
          await this.deployModel();

        } else if (state === 'PIPELINE_STATE_FAILED') {
          console.error('Model training failed');
          this.handleError('Model training failed', new Error('Training pipeline failed'));

        } else if (state === 'PIPELINE_STATE_RUNNING') {
          // Continue monitoring
          setTimeout(checkStatus, checkInterval);
        }

      } catch (error) {
        console.error('Error checking training status:', error);
        setTimeout(checkStatus, checkInterval);
      }
    };

    // Start monitoring
    setTimeout(checkStatus, checkInterval);
  }

  /**
   * Deploy model for online predictions
   */
  async deployModel() {
    if (!this.modelEndpoint) {
      throw new Error('No model endpoint available for deployment');
    }

    const url = `https://${this.config.location}-aiplatform.googleapis.com/v1/${this.modelEndpoint}/endpoints`;

    const deploymentConfig = {
      displayName: `${this.config.modelDisplayName}-endpoint`,
      deployedModels: [
        {
          model: this.modelEndpoint,
          displayName: this.config.modelDisplayName,
          automaticResources: {
            minReplicaCount: 1,
            maxReplicaCount: 3
          }
        }
      ]
    };

    try {
      const response = await axios.post(url, deploymentConfig, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Model deployed successfully:', response.data.name);

      if (this.callbacks.onModelStatusChange) {
        this.callbacks.onModelStatusChange('deployed');
      }

      return response.data;

    } catch (error) {
      console.error('Error deploying model:', error);
      // For demo purposes, we'll continue without deployment
      // In production, this should be handled properly
      console.log('Continuing with batch predictions...');
    }
  }

  /**
   * Train model with historical data
   */
  async trainModel(historicalData) {
    try {
      if (!historicalData || !historicalData.timeSeriesData) {
        throw new Error('No training data provided');
      }

      // Prepare training data
      const trainingData = this.prepareTrainingData(historicalData);

      // Upload training data to dataset
      await this.uploadTrainingData(trainingData);

      // Start training pipeline
      if (this.callbacks.onModelStatusChange) {
        this.callbacks.onModelStatusChange('training');
      }

      console.log('Model training started with', trainingData.length, 'data points');

      return true;

    } catch (error) {
      console.error('Error training model:', error);
      this.handleError('Model training failed', error);
      return false;
    }
  }

  /**
   * Prepare historical data for training
   */
  prepareTrainingData(historicalData) {
    const trainingData = [];

    historicalData.timeSeriesData.forEach(batch => {
      if (batch.data && Array.isArray(batch.data)) {
        batch.data.forEach(dataPoint => {
          // Add time-based features
          const timestamp = new Date(dataPoint.timestamp);
          const timeOfDay = timestamp.getHours();
          const dayOfWeek = timestamp.getDay();

          trainingData.push({
            eventId: batch.eventId,
            timestamp: dataPoint.timestamp,
            totalPeople: dataPoint.totalPeople || 0,
            avgDensity: dataPoint.avgDensity || 0,
            avgVelocity: dataPoint.avgVelocity || 0,
            congestionScore: dataPoint.congestionScore || 0,
            hotspotCount: dataPoint.hotspotCount || 0,
            timeOfDay: timeOfDay,
            dayOfWeek: dayOfWeek
          });
        });
      }
    });

    // Sort by timestamp
    trainingData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return trainingData;
  }

  /**
   * Upload training data to dataset
   */
  async uploadTrainingData(trainingData) {
    // This would typically upload data to Google Cloud Storage
    // and import it into the dataset
    // For demo purposes, we'll simulate this

    console.log('Uploading training data to dataset...');

    // In a real implementation, you would:
    // 1. Convert data to CSV format
    // 2. Upload to Google Cloud Storage
    // 3. Import into Vertex AI Dataset

    return Promise.resolve();
  }

  /**
   * Make crowd surge prediction
   */
  async predictCrowdSurge(currentData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Forecasting service not initialized');
      }

      // Check if we need new prediction (based on time interval)
      const now = new Date();
      if (this.lastPredictionTime &&
          (now - this.lastPredictionTime) < this.config.predictionIntervalMinutes * 60 * 1000) {

        // Return cached prediction if recent enough
        const cachedPrediction = this.getCachedPrediction();
        if (cachedPrediction) {
          return cachedPrediction;
        }
      }

      // Prepare input data for prediction
      const inputData = this.prepareInputData(currentData);

      // Make prediction request
      const prediction = await this.makePredictionRequest(inputData);

      // Process and cache prediction
      const processedPrediction = this.processPredictionResponse(prediction);
      this.cachePrediction(processedPrediction);

      // Check for surge alerts
      this.checkSurgeAlerts(processedPrediction);

      // Trigger callback
      if (this.callbacks.onPredictionUpdate) {
        this.callbacks.onPredictionUpdate(processedPrediction);
      }

      this.lastPredictionTime = now;
      return processedPrediction;

    } catch (error) {
      console.error('Error making prediction:', error);

      // Return mock prediction for demo purposes
      return this.generateMockPrediction(currentData);
    }
  }

  /**
   * Prepare input data for prediction
   */
  prepareInputData(currentData) {
    const now = new Date();
    const timeOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    return {
      instances: [
        {
          eventId: 'current_event',
          timestamp: now.toISOString(),
          totalPeople: currentData.totalPeople || 0,
          avgDensity: currentData.avgDensity || 0,
          avgVelocity: currentData.avgVelocity || 0,
          congestionScore: currentData.congestionScore || 0,
          hotspotCount: currentData.hotspotCount || 0,
          timeOfDay: timeOfDay,
          dayOfWeek: dayOfWeek
        }
      ]
    };
  }

  /**
   * Make prediction request to Vertex AI
   */
  async makePredictionRequest(inputData) {
    if (!this.modelEndpoint) {
      throw new Error('Model endpoint not available');
    }

    // Ensure we have a valid token
    const hasValidToken = await this.ensureValidToken();
    if (!hasValidToken) {
      throw new Error('No valid OAuth token for prediction request');
    }

    const url = `https://${this.config.location}-aiplatform.googleapis.com/v1/${this.modelEndpoint}:predict`;

    try {
      const response = await axios.post(url, inputData, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return response.data;

    } catch (error) {
      console.error('❌ Error making prediction request:', error.response?.data || error.message);

      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔑 Authentication failed during prediction, refreshing token...');
        this.config.authenticated = false;
        await this.authenticate();
      }

      throw error;
    }
  }

  /**
   * Process prediction response
   */
  processPredictionResponse(response) {
    const prediction = response.predictions[0];

    return {
      timestamp: new Date(),
      forecastHorizon: this.config.forecastHorizon,
      predictions: prediction.value || [],
      confidence: prediction.prediction_interval || [],
      upperBound: prediction.upper_bound || [],
      lowerBound: prediction.lower_bound || [],
      alertLevel: this.calculateAlertLevel(prediction.value),
      surgeRisk: this.calculateSurgeRisk(prediction.value),
      recommendedActions: this.generateRecommendations(prediction.value)
    };
  }

  /**
   * Generate mock prediction for demo purposes
   */
  generateMockPrediction(currentData) {
    const predictions = [];
    const confidence = [];
    const upperBound = [];
    const lowerBound = [];

    // Generate 10-minute forecast
    for (let i = 1; i <= this.config.forecastHorizon; i++) {
      const baseValue = currentData.avgDensity || 5;

      // Add some realistic variation
      const trend = Math.sin(i * 0.3) * 0.5; // Slight oscillation
      const noise = (Math.random() - 0.5) * 1.0; // Random variation
      const predicted = Math.max(0, baseValue + trend + noise);

      predictions.push(predicted);
      confidence.push(0.8 + Math.random() * 0.15); // 80-95% confidence
      upperBound.push(predicted + 1.5 + Math.random());
      lowerBound.push(Math.max(0, predicted - 1.5 - Math.random()));
    }

    return {
      timestamp: new Date(),
      forecastHorizon: this.config.forecastHorizon,
      predictions,
      confidence,
      upperBound,
      lowerBound,
      alertLevel: this.calculateAlertLevel(predictions),
      surgeRisk: this.calculateSurgeRisk(predictions),
      recommendedActions: this.generateRecommendations(predictions),
      isMockData: true
    };
  }

  /**
   * Calculate alert level based on predictions
   */
  calculateAlertLevel(predictions) {
    const maxPrediction = Math.max(...predictions);

    if (maxPrediction > this.config.surgeThreshold * 1.2) {
      return 'critical';
    } else if (maxPrediction > this.config.surgeThreshold) {
      return 'warning';
    } else if (maxPrediction > this.config.surgeThreshold * 0.8) {
      return 'caution';
    } else {
      return 'normal';
    }
  }

  /**
   * Calculate surge risk probability
   */
  calculateSurgeRisk(predictions) {
    const surgePoints = predictions.filter(p => p > this.config.surgeThreshold).length;
    const riskPercentage = (surgePoints / predictions.length) * 100;

    return {
      percentage: Math.round(riskPercentage),
      timeToSurge: this.estimateTimeToSurge(predictions),
      peakDensity: Math.max(...predictions),
      peakTime: predictions.indexOf(Math.max(...predictions)) + 1
    };
  }

  /**
   * Estimate time until potential surge
   */
  estimateTimeToSurge(predictions) {
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] > this.config.surgeThreshold) {
        return i + 1; // Minutes until surge
      }
    }
    return null; // No surge predicted
  }

  /**
   * Generate action recommendations
   */
  generateRecommendations(predictions) {
    const maxPrediction = Math.max(...predictions);
    const surgeRisk = this.calculateSurgeRisk(predictions);
    const recommendations = [];

    if (maxPrediction > this.config.surgeThreshold) {
      recommendations.push({
        priority: 'high',
        action: 'Deploy additional security personnel to high-density areas',
        timeframe: 'immediate'
      });

      recommendations.push({
        priority: 'high',
        action: 'Activate crowd control barriers and alternative routes',
        timeframe: `${surgeRisk.timeToSurge} minutes`
      });
    }

    if (surgeRisk.percentage > 60) {
      recommendations.push({
        priority: 'medium',
        action: 'Notify event organizers and emergency services',
        timeframe: 'immediate'
      });

      recommendations.push({
        priority: 'medium',
        action: 'Consider temporary event modifications or announcements',
        timeframe: '2-3 minutes'
      });
    }

    if (maxPrediction > this.config.surgeThreshold * 0.8) {
      recommendations.push({
        priority: 'low',
        action: 'Monitor crowd movement patterns closely',
        timeframe: 'ongoing'
      });
    }

    return recommendations;
  }

  /**
   * Cache prediction results
   */
  cachePrediction(prediction) {
    const cacheKey = prediction.timestamp.toISOString().slice(0, 16); // Cache by minute
    this.predictionCache.set(cacheKey, prediction);

    // Add to history
    this.predictionHistory.push(prediction);

    // Keep only last 100 predictions
    if (this.predictionHistory.length > 100) {
      this.predictionHistory.shift();
    }

    // Clean old cache entries
    if (this.predictionCache.size > 50) {
      const oldestKey = this.predictionCache.keys().next().value;
      this.predictionCache.delete(oldestKey);
    }
  }

  /**
   * Get cached prediction if available
   */
  getCachedPrediction() {
    const now = new Date();
    const cacheKey = now.toISOString().slice(0, 16);
    return this.predictionCache.get(cacheKey);
  }

  /**
   * Check for surge alerts and trigger notifications
   */
  checkSurgeAlerts(prediction) {
    if (prediction.alertLevel === 'critical' || prediction.alertLevel === 'warning') {
      if (this.callbacks.onSurgeAlert) {
        this.callbacks.onSurgeAlert({
          alertLevel: prediction.alertLevel,
          surgeRisk: prediction.surgeRisk,
          recommendations: prediction.recommendedActions,
          timestamp: prediction.timestamp
        });
      }
    }
  }

  /**
   * Get prediction history
   */
  getPredictionHistory() {
    return this.predictionHistory;
  }

  /**
   * Get current model status
   */
  getModelStatus() {
    return {
      isInitialized: this.isInitialized,
      modelEndpoint: this.modelEndpoint,
      lastPredictionTime: this.lastPredictionTime,
      cacheSize: this.predictionCache.size,
      historySize: this.predictionHistory.length
    };
  }

  /**
   * Handle errors
   */
  handleError(message, error) {
    console.error(`VertexAI Forecasting: ${message}`, error);

    if (this.callbacks.onError) {
      this.callbacks.onError(message, error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.predictionCache.clear();
    this.predictionHistory = [];
    this.callbacks = {};
    this.isInitialized = false;
    this.modelEndpoint = null;
  }
}

export default VertexAIForecastingService;
