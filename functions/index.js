const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');

// Initialize Firebase Admin (optional, for Firestore access)
const admin = require('firebase-admin');
admin.initializeApp();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Google Auth with Application Default Credentials
// Firebase Functions automatically provides service account credentials
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'drishti-firebase-functions',
    environment: 'production'
  });
});

// Vertex AI authentication endpoint
app.post('/auth/vertex-ai-token', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required',
      });
    }

    // Get access token using Application Default Credentials
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
      token_type: 'Bearer',
    });
  } catch (error) {
    console.error('Vertex AI authentication error:', error);
    res.status(500).json({
      error: 'Failed to authenticate with Vertex AI',
      details: error.message,
    });
  }
});

// Vertex AI Vision API proxy endpoint with OAuth authentication
app.post('/vertex-ai/detect', async (req, res) => {
  try {
    const { base64Image, projectId, location = 'us-central1' } = req.body;

    if (!base64Image || !projectId) {
      return res.status(400).json({
        error: 'base64Image and projectId are required',
      });
    }

    console.log(
      `🤖 Processing Vertex AI detection request for project: ${projectId}`,
    );

    // Get authenticated client
    const authClient = await auth.getClient();

    // Google Cloud Vision API endpoint for object localization
    const endpoint = `https://vision.googleapis.com/v1/images:annotate`;

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'OBJECT_LOCALIZATION',
              maxResults: 100,
            },
          ],
        },
      ],
    };

    console.log(`📡 Making request to Vision API endpoint: ${endpoint}`);

    // Make request to Vision API
    const response = await authClient.request({
      url: endpoint,
      method: 'POST',
      data: requestBody,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Filter for person detections from Vision API response
    const detections =
      response.data.responses?.[0]?.localizedObjectAnnotations || [];
    const personDetections = detections.filter(
      (detection) =>
        detection.name.toLowerCase() === 'person' && detection.score >= 0.5,
    );

    console.log(`✅ Detected ${personDetections.length} people via Vision API`);

    // Convert Vision API format to our expected format
    const formattedDetections = personDetections.map((detection) => ({
      displayName: detection.name,
      confidence: detection.score,
      boundingBox: {
        normalizedVertices: [
          {
            x: detection.boundingPoly.normalizedVertices[0].x,
            y: detection.boundingPoly.normalizedVertices[0].y,
          },
          {
            x: detection.boundingPoly.normalizedVertices[2].x,
            y: detection.boundingPoly.normalizedVertices[2].y,
          },
        ],
      },
    }));

    res.json({
      detections: formattedDetections,
      total_people: personDetections.length,
      confidence_avg:
        personDetections.length > 0
          ? personDetections.reduce((sum, d) => sum + d.score, 0) /
            personDetections.length
          : 0,
      processing_time: Date.now(),
      status: 'success',
    });
  } catch (error) {
    console.error('❌ Vertex AI detection error:', error.message);

    // Handle specific authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({
        error: 'Authentication failed with Vertex AI',
        details: error.response?.data || error.message,
        status: 'auth_error',
      });
    }

    // Handle API errors
    if (error.response?.status >= 400) {
      return res.status(error.response.status).json({
        error: 'Vertex AI API error',
        details: error.response?.data || error.message,
        status: 'api_error',
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal server error during detection',
      details: error.message,
      status: 'server_error',
    });
  }
});

// Environment configuration check
app.get('/config/check', (req, res) => {
  const config = {
    hasServiceAccount: true, // Firebase Functions automatically provide service account
    hasProjectId: !!process.env.GCLOUD_PROJECT,
    projectId: process.env.GCLOUD_PROJECT,
    nodeEnv: process.env.NODE_ENV || 'production',
    authMethod: 'application_default_credentials',
    functionName: process.env.FUNCTION_NAME,
    region: process.env.FUNCTION_REGION,
  };

  res.json(config);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
});

// Export the Express app as a Firebase Function
exports.api = functions.region('us-central1').https.onRequest(app);

// Optional: Export individual functions for better performance
exports.healthCheck = functions.region('us-central1').https.onRequest((req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'drishti-firebase-functions-health',
  });
});
