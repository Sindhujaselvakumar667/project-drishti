const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Auth
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account key
});

// Vertex AI authentication endpoint
app.post('/api/auth/vertex-ai-token', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required'
      });
    }

    // Get access token
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    if (!accessToken.token) {
      throw new Error('Failed to obtain access token');
    }

    console.log(`Generated Vertex AI access token for project: ${projectId}`);

    res.json({
      access_token: accessToken.token,
      project_id: projectId,
      expires_in: 3600, // Token typically expires in 1 hour
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('Vertex AI authentication error:', error);
    res.status(500).json({
      error: 'Failed to authenticate with Vertex AI',
      details: error.message
    });
  }
});

// Vertex AI Vision API proxy endpoint for additional security
app.post('/api/vertex-ai/detect', async (req, res) => {
  try {
    const { base64Image, projectId, location = 'us-central1' } = req.body;

    if (!base64Image || !projectId) {
      return res.status(400).json({
        error: 'base64Image and projectId are required'
      });
    }

    // Get authenticated client
    const authClient = await auth.getClient();

    // Vertex AI endpoint
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imageobjectdetection:predict`;

    const requestBody = {
      instances: [
        {
          content: base64Image
        }
      ],
      parameters: {
        confidenceThreshold: 0.5,
        maxPredictions: 100
      }
    };

    // Make request to Vertex AI
    const response = await authClient.request({
      url: endpoint,
      method: 'POST',
      data: requestBody,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Filter for person detections
    const detections = response.data.predictions[0].objects || [];
    const personDetections = detections.filter(detection =>
      detection.displayName.toLowerCase() === 'person' &&
      detection.confidence >= 0.5
    );

    console.log(`Detected ${personDetections.length} people via Vertex AI`);

    res.json({
      detections: personDetections,
      total_people: personDetections.length,
      confidence_avg: personDetections.length > 0
        ? personDetections.reduce((sum, d) => sum + d.confidence, 0) / personDetections.length
        : 0,
      processing_time: Date.now()
    });

  } catch (error) {
    console.error('Vertex AI detection error:', error);
    res.status(500).json({
      error: 'Failed to process image with Vertex AI',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Drishti Vertex AI Backend'
  });
});

// Environment configuration check
app.get('/api/config/check', (req, res) => {
  const config = {
    hasServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    hasProjectId: !!process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID,
    nodeEnv: process.env.NODE_ENV || 'development'
  };

  res.json(config);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Drishti Backend Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);

  // Check configuration on startup
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set - Vertex AI authentication may fail');
  }

  if (!process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID) {
    console.warn('⚠️  REACT_APP_GOOGLE_CLOUD_PROJECT_ID not set');
  }
});

module.exports = app;
