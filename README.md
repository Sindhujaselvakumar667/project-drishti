# 🔥 Drishti - AI-Powered Event Safety Dashboard

Drishti is an advanced real-time crowd safety monitoring system that combines live video feeds with Google Vertex AI Vision to generate intelligent crowd density heatmaps for large public events. The system provides real-time analytics, alerts, and visualizations to help event organizers and safety teams maintain optimal crowd safety.

## 🚀 Features

### Core Functionality
- **Real-time Dashboard** - Live monitoring interface with Firebase integration
- **AI-Powered Video Analysis** - Google Vertex AI Vision for human detection
- **Crowd Density Heatmaps** - Dynamic visualization of crowd patterns
- **Zone Management** - Capacity monitoring and alert systems
- **Emergency Response** - Real-time responder tracking and coordination
- **Multi-source Data** - Mock data simulation and live camera feeds

### Video AI Integration
- **Live Camera Feed Processing** - Real-time video capture and analysis
- **Human Detection** - AI-powered person identification in video streams
- **Crowd Density Calculation** - Intelligent density mapping from video data
- **Hotspot Detection** - Automatic identification of high-density areas
- **Video Upload Support** - Process pre-recorded video files

### Visualization
- **Interactive Google Maps** - Enhanced mapping with custom overlays
- **Real-time Heatmaps** - Dynamic crowd density visualization
- **Zone Status Indicators** - Color-coded capacity warnings
- **Alert Management** - Real-time notification system
- **Statistics Dashboard** - Live analytics and metrics

## 🛠️ Technology Stack

- **Frontend**: React 19, Google Maps JavaScript API
- **Backend**: Firebase/Firestore for real-time data
- **AI/ML**: Google Vertex AI Vision API
- **Hosting**: Firebase Hosting
- **Video Processing**: HTML5 Canvas, WebRTC
- **Styling**: CSS3 with responsive design
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js 16+ and pnpm
- Google Cloud Project with enabled APIs:
  - Vertex AI Vision API
  - Google Maps JavaScript API
- Firebase project setup
- Camera access for live video processing

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-drishti
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Set up environment variables in `.env.local`:**
   ```env
   # Google Maps API Key
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # Google Cloud Configuration
   REACT_APP_GOOGLE_CLOUD_PROJECT_ID=your_project_id
   REACT_APP_GOOGLE_CLOUD_API_KEY=your_api_key
   REACT_APP_VERTEX_LOCATION=us-central1
   REACT_APP_VERTEX_API_ENDPOINT=your_vertex_endpoint

   # Firebase Configuration (already configured in firebase.js)
   ```

5. **Start development server**
   ```bash
   pnpm start
   ```

## 🎯 Usage

### Dashboard Overview
The main dashboard provides three key areas:
- **Left Sidebar**: Event information, statistics, and map controls
- **Center**: Interactive map with video feed integration
- **Right Sidebar**: Active alerts, responder status, and zone details

### Video Feed Integration

1. **Enable Video Feed**
   - Click the "📹 Show Video" button in the header
   - The interface will split to show both video feed and map

2. **Camera Setup**
   - Grant camera permissions when prompted
   - Position camera to capture crowd areas
   - Ensure good lighting for optimal AI detection

3. **AI Processing**
   - Click "Start AI" to begin video analysis
   - The system will detect humans and calculate crowd density
   - Enable "🤖 Use AI Data" to switch from mock to real AI data

4. **Video Upload**
   - Select "Upload Video" from the dropdown
   - Choose a video file for processing
   - System will analyze the uploaded content

### Map Controls

- **Heatmap Toggle**: Show/hide crowd density visualization
- **Zone Display**: Toggle event zone boundaries
- **Responder Tracking**: Show/hide emergency responder locations
- **Map Type**: Switch between roadmap, satellite, hybrid, and terrain views

### Alert System

- **Real-time Monitoring**: Automatic alerts for high-density areas
- **Zone Capacity**: Warnings when zones approach capacity
- **Critical Areas**: Immediate notifications for dangerous situations
- **Historical Data**: Alert timeline and resolution tracking

## 🧠 AI Implementation Details

### Video Processing Pipeline

1. **Frame Capture**: Extract frames from live video at 2-second intervals
2. **AI Analysis**: Send frames to Vertex AI Vision for human detection
3. **Density Calculation**: Map detections to geographic coordinates
4. **Heatmap Generation**: Create density visualization on 20x20 grid
5. **Real-time Updates**: Push data to Firebase for live dashboard updates

### Crowd Density Algorithm

```javascript
// Simplified density calculation
const densityGrid = Array(20).fill().map(() => Array(20).fill(0));

detections.forEach(detection => {
  const bbox = detection.boundingBox.normalizedVertices;
  const centerX = (bbox[0].x + bbox[1].x) / 2;
  const centerY = (bbox[0].y + bbox[1].y) / 2;
  
  const gridX = Math.floor(centerX / cellWidth);
  const gridY = Math.floor(centerY / cellHeight);
  
  densityGrid[gridY][gridX] += detection.confidence;
});
```

### Configuration Options

- **Detection Interval**: 2000ms (configurable)
- **Confidence Threshold**: 0.5 (adjustable)
- **Max Detections**: 100 per frame
- **Grid Size**: 20x20 for heatmap generation
- **Density Scaling**: 0-10 scale with automatic normalization

## 📊 Data Structure

### Crowd Density Data Point
```json
{
  "lat": 37.7749,
  "lng": -122.4194,
  "density": 8.5,
  "timestamp": "2024-01-15T10:30:00Z",
  "personCount": 12,
  "source": "video_ai"
}
```

### Zone Configuration
```json
{
  "id": "zone_001",
  "name": "Main Stage Area",
  "lat": 37.7749,
  "lng": -122.4194,
  "radius": 150,
  "capacity": 5000,
  "currentCount": 4200,
  "alertLevel": "Warning"
}
```

### Alert Structure
```json
{
  "id": "alert_001",
  "zone": "Main Stage Area",
  "type": "Crowd Density",
  "severity": "High",
  "message": "Crowd density approaching maximum capacity",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "Active"
}
```

## 🚀 Deployment

### Firebase Hosting

1. **Build the project**
   ```bash
   pnpm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

### Environment Configuration

Ensure all environment variables are properly set in your hosting environment:

- Google Cloud API keys and project configuration
- Firebase configuration
- Vertex AI endpoint and location settings

## 🔐 Security Considerations

- **API Key Protection**: Never expose API keys in client-side code
- **Camera Permissions**: Implement proper permission handling
- **Data Privacy**: Ensure GDPR compliance for video processing
- **Firestore Rules**: Configure appropriate database security rules
- **HTTPS Only**: Use secure connections for all API calls

## 🎨 Customization

### Map Styling
Modify `getMapStyles()` in `CrowdHeatmap.js` to customize map appearance.

### Heatmap Colors
Adjust the gradient in `getHeatmapGradient()` for different visualization styles.

### Detection Parameters
Configure AI detection settings in `VideoProcessingService.js`:
- Confidence threshold
- Detection frequency
- Grid size for density calculation

### Alert Thresholds
Modify alert triggers in zone management logic for custom warning levels.

## 📱 Mobile Support

- **Responsive Design**: Optimized for tablets and mobile devices
- **Touch Interactions**: Full touch support for map and controls
- **Camera Access**: Mobile camera integration with rear-facing preference
- **Performance**: Optimized rendering for mobile hardware

## 🐛 Troubleshooting

### Common Issues

1. **Camera Access Denied**
   - Check browser permissions
   - Ensure HTTPS connection
   - Try different browsers

2. **Map Loading Issues**
   - Verify Google Maps API key
   - Check API quotas and billing
   - Ensure proper CORS configuration

3. **AI Processing Errors**
   - Verify Vertex AI API access
   - Check project permissions
   - Monitor API quotas

4. **Firebase Connection Issues**
   - Verify Firebase configuration
   - Check Firestore rules
   - Monitor connection status

### Performance Tips

- **Video Quality**: Balance quality vs. processing speed
- **Detection Frequency**: Adjust interval based on hardware capabilities
- **Data Cleanup**: Implement data retention policies for storage efficiency
- **Caching**: Use browser caching for static resources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Vertex AI for computer vision capabilities
- Firebase for real-time database and hosting
- Google Maps for visualization platform
- React community for excellent tooling

## 📞 Support

For questions and support:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ for safer public events**