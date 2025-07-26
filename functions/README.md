# Drishti Firebase Functions

This directory contains Firebase Functions for the Drishti AI crowd detection system. The functions provide a backend API for Vertex AI integration and crowd detection services.

## Functions Overview

### Main API Function (`api`)
- **Endpoint**: `/api/*`
- **Description**: Express.js app wrapped as a Firebase Function
- **Region**: `us-central1`

### Available Endpoints

#### Health Check
- `GET /api/health` - Service health status
- `GET /api/config/check` - Configuration verification

#### Authentication
- `POST /api/auth/vertex-ai-token` - Get Vertex AI access token
  ```json
  {
    "projectId": "your-gcp-project-id"
  }
  ```

#### AI Detection
- `POST /api/vertex-ai/detect` - Detect people in images using Google Vision API
  ```json
  {
    "base64Image": "base64-encoded-image",
    "projectId": "your-gcp-project-id",
    "location": "us-central1"
  }
  ```

## Local Development

### Prerequisites
- Node.js 18+
- Firebase CLI installed globally
- Firebase project configured

### Setup
```bash
# Install dependencies
npm install

# Start local emulator
firebase emulators:start --only functions

# The API will be available at:
# http://localhost:5001/your-project-id/us-central1/api
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:5001/your-project-id/us-central1/api/health

# Config check
curl http://localhost:5001/your-project-id/us-central1/api/config/check
```

## Deployment

### Manual Deployment
```bash
# Deploy functions only
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:api
```

### Automatic Deployment
Functions are automatically deployed via GitHub Actions when code is pushed to the `main` branch.

## Environment Variables

Firebase Functions automatically provide:
- `GCLOUD_PROJECT` - Your Firebase/GCP project ID
- `FUNCTION_NAME` - Name of the current function
- `FUNCTION_REGION` - Deployment region

No additional environment variables are required as the function uses Application Default Credentials provided by Firebase.

## Authentication

The functions use Google Cloud Application Default Credentials, which are automatically provided in the Firebase Functions environment. No manual credential setup is required.

## API Usage from Frontend

In production, the API is accessible via Firebase Hosting rewrites:
- Production: `https://your-app.web.app/api/*`
- Local: `http://localhost:5001/project-id/us-central1/api/*`

The frontend automatically detects the environment and uses the appropriate URL.

## Error Handling

All endpoints include comprehensive error handling with appropriate HTTP status codes:
- `400` - Bad Request (missing parameters)
- `401` - Authentication Error
- `403` - Authorization Error
- `500` - Internal Server Error

## Monitoring

Monitor function performance in the Firebase Console:
- Function logs: `firebase functions:log`
- Performance metrics: Firebase Console > Functions

## Dependencies

Key dependencies:
- `firebase-functions` - Firebase Functions SDK
- `firebase-admin` - Firebase Admin SDK
- `express` - Web framework
- `google-auth-library` - Google Cloud authentication
- `cors` - Cross-origin resource sharing

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure Firebase project has the necessary APIs enabled
   - Check that the function has proper IAM permissions

2. **CORS Issues**
   - CORS is configured for all origins in development
   - Modify CORS settings in `index.js` if needed

3. **Timeout Errors**
   - Default timeout is 60 seconds
   - Large image processing may need timeout adjustments

### Logs
```bash
# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only api
```
