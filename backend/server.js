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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'drishti-backend'
  });
});

// Initialize Google Auth with embedded credentials
const serviceAccountCredentials = {
  type: "service_account",
  project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
  private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
  client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
  auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI,
  token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN
};

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  credentials: serviceAccountCredentials, // Use embedded credentials
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

// Vertex AI Vision API proxy endpoint with OAuth authentication
app.post('/api/vertex-ai/detect', async (req, res) => {
  try {
    const { base64Image, projectId, location = 'us-central1' } = req.body;

    if (!base64Image || !projectId) {
      return res.status(400).json({
        error: 'base64Image and projectId are required'
      });
    }

    console.log(`🤖 Processing Vertex AI detection request for project: ${projectId}`);

    // Get authenticated client with service account
    const authClient = await auth.getClient();

    // Google Cloud Vision API endpoint for object localization
    const endpoint = `https://vision.googleapis.com/v1/images:annotate`;

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'OBJECT_LOCALIZATION',
              maxResults: 100
            }
          ]
        }
      ]
    };

    console.log(`📡 Making request to Vision API endpoint: ${endpoint}`);

    // Make request to Vision API with service account authentication
    const response = await authClient.request({
      url: endpoint,
      method: 'POST',
      data: requestBody,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Filter for person detections from Vision API response
    const detections = response.data.responses?.[0]?.localizedObjectAnnotations || [];
    const personDetections = detections.filter(detection =>
      detection.name.toLowerCase() === 'person' &&
      detection.score >= 0.5
    );

    console.log(`✅ Detected ${personDetections.length} people via Vision API`);

    // Convert Vision API format to our expected format
    const formattedDetections = personDetections.map(detection => ({
      displayName: detection.name,
      confidence: detection.score,
      boundingBox: {
        normalizedVertices: [
          { x: detection.boundingPoly.normalizedVertices[0].x, y: detection.boundingPoly.normalizedVertices[0].y },
          { x: detection.boundingPoly.normalizedVertices[2].x, y: detection.boundingPoly.normalizedVertices[2].y }
        ]
      }
    }));

    res.json({
      detections: formattedDetections,
      total_people: personDetections.length,
      confidence_avg: personDetections.length > 0
        ? personDetections.reduce((sum, d) => sum + d.score, 0) / personDetections.length
        : 0,
      processing_time: Date.now(),
      status: 'success'
    });

  } catch (error) {
    console.error('❌ Vertex AI detection error:', error.message);

    // Handle specific authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({
        error: 'Authentication failed with Vertex AI',
        details: error.response?.data || error.message,
        status: 'auth_error'
      });
    }

    // Handle API errors
    if (error.response?.status >= 400) {
      return res.status(error.response.status).json({
        error: 'Vertex AI API error',
        details: error.response?.data || error.message,
        status: 'api_error'
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal server error during detection',
      details: error.message,
      status: 'server_error'
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
    hasServiceAccount: !!(process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL),
    hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    nodeEnv: process.env.NODE_ENV || 'development',
    authMethod: 'embedded_credentials'
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
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_PRIVATE_KEY || !process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
    console.warn('⚠️  Google Cloud service account credentials incomplete - authentication may fail');
  } else {
    console.log('✅ Google Cloud service account credentials loaded from environment');
  }

  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    console.warn('⚠️  GOOGLE_CLOUD_PROJECT_ID not set');
  }
});

module.exports = app;
