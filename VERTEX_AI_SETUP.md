# Vertex AI Setup Guide for Drishti Dashboard

This guide will help you set up Google Vertex AI for real-time person detection in the Drishti dashboard.

## Prerequisites

1. Google Cloud Platform (GCP) account
2. Google Cloud Project with billing enabled
3. Node.js 16+ installed
4. Project downloaded and dependencies installed

## Step 1: Enable Required APIs

In your Google Cloud Console, enable these APIs:

```bash
# Using gcloud CLI
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable compute.googleapis.com
```

Or enable manually in the Console:
- Go to APIs & Services > Library
- Search and enable: "Vertex AI API"
- Search and enable: "Cloud Storage API"

## Step 2: Create Service Account

1. Go to IAM & Admin > Service Accounts
2. Click "Create Service Account"
3. Name: `drishti-vertex-ai`
4. Description: `Service account for Drishti Vertex AI integration`
5. Click "Create and Continue"

### Assign Roles:
- `Vertex AI User`
- `ML Engineer` (optional for advanced features)
- `Storage Object Viewer` (if using Cloud Storage)

## Step 3: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the key file
6. **IMPORTANT**: Keep this file secure and never commit to version control

## Step 4: Environment Configuration

### Frontend (.env file in project root):
```env
# Google Cloud Configuration
REACT_APP_GOOGLE_CLOUD_PROJECT_ID=your-project-id
REACT_APP_VERTEX_LOCATION=us-central1
REACT_APP_VERTEX_API_ENDPOINT=https://us-central1-aiplatform.googleapis.com

# Optional: For direct API calls (less secure)
# REACT_APP_GOOGLE_CLOUD_API_KEY=your-api-key
```

### Backend (.env file in backend/ directory):
```env
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## Step 5: Install Backend Dependencies

```bash
cd backend/
npm install
```

## Step 6: Test Vertex AI Connection

### Start the backend server:
```bash
cd backend/
npm run dev
```

### Test authentication:
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/config/check
```

### Test Vertex AI token generation:
```bash
curl -X POST http://localhost:5000/api/auth/vertex-ai-token \
  -H "Content-Type: application/json" \
  -d '{"projectId":"your-project-id"}'
```

## Step 7: Update Frontend Configuration

The frontend is already configured to use Vertex AI. Update the videoProcessingService to use your backend:

1. Ensure your backend is running on `http://localhost:5000`
2. The frontend will automatically attempt to authenticate with Vertex AI
3. If authentication fails, it will fall back to intelligent mock detection

## Step 8: Run the Full Application

### Terminal 1 (Backend):
```bash
cd backend/
npm run dev
```

### Terminal 2 (Frontend):
```bash
cd ../
pnpm start
```

## Step 9: Test Real-Time Detection

1. Open the dashboard at `http://localhost:3000`
2. Click "📹 Show Video"
3. Grant camera permissions
4. Click "Start AI" button
5. Enable "🤖 Use AI Data for Map"
6. Move people in front of camera to see real-time detection

## Troubleshooting

### Common Issues:

#### 1. Authentication Failed
```
Error: Could not authenticate with Vertex AI
```
**Solution**: 
- Verify service account key path in `GOOGLE_APPLICATION_CREDENTIALS`
- Check if service account has correct roles
- Ensure project ID is correct

#### 2. API Not Enabled
```
Error: Vertex AI API has not been used in project
```
**Solution**: 
- Enable Vertex AI API in Google Cloud Console
- Wait 5-10 minutes for propagation

#### 3. Quota Exceeded
```
Error: Quota exceeded for requests
```
**Solution**: 
- Check quotas in Google Cloud Console
- Request quota increase if needed
- Implement rate limiting in the application

#### 4. CORS Issues
```
Error: CORS policy blocked the request
```
**Solution**: 
- Ensure backend CORS is configured correctly
- Check frontend is making requests to correct backend URL

### Performance Optimization:

1. **Reduce Detection Frequency**: 
   - Increase `detectionIntervalMs` from 500ms to 1000ms if needed
   - Use motion detection to trigger processing only when needed

2. **Image Quality**: 
   - Reduce image quality in `canvas.toDataURL('image/jpeg', 0.6)`
   - Resize canvas before sending to API

3. **Caching**: 
   - Cache authentication tokens
   - Implement request deduplication

## Security Best Practices

1. **Never expose service account keys in frontend code**
2. **Use backend proxy for all Vertex AI requests**
3. **Implement rate limiting to prevent abuse**
4. **Monitor API usage and costs**
5. **Rotate service account keys regularly**

## Cost Management

- Vertex AI Vision API pricing: ~$1.50 per 1,000 images
- Monitor usage in Google Cloud Console billing section
- Set up billing alerts to avoid unexpected charges
- Consider implementing client-side caching for repeated frames

## Real-Time Performance Settings

For optimal real-time detection, adjust these parameters in `videoProcessingService.js`:

```javascript
this.config = {
  detectionIntervalMs: 500,        // Process every 500ms (2 FPS)
  confidenceThreshold: 0.6,        // Higher threshold for accuracy
  maxDetections: 50,               // Limit detections per frame
  motionThreshold: 0.02,           // Sensitivity for motion detection
  historyLength: 3,                // Smoothing window
};
```

## Monitoring and Logging

Check these logs to monitor performance:
- Browser Console: Detection results and timing
- Backend Console: API requests and authentication
- Google Cloud Console: API usage and quotas

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify backend logs
3. Test with mock detection mode first
4. Ensure all environment variables are set correctly

The system will automatically fall back to intelligent mock detection if Vertex AI is unavailable, allowing development to continue.