# Drishti AI - SaaS Setup Guide

Welcome to Drishti AI's SaaS features! This guide will help you set up and use the new authentication, event management, and location selection features.

## 🚀 New SaaS Features

### 1. User Authentication System
- **Login Page**: Secure authentication with test credentials
- **User Management**: Role-based access (Admin/User)
- **Session Persistence**: Remember login state across browser sessions

### 2. Event Setup & Management
- **Event Creation**: Create and manage events with custom names
- **Location Selection**: Choose event locations manually or via interactive map
- **Real-time Updates**: Event details sync across the entire dashboard

### 3. Interactive Map Location Picker
- **Current Location Detection**: Automatically detect user's current location
- **Click-to-Select**: Click anywhere on the map to set event location
- **Address Lookup**: Automatic address resolution with geocoding
- **Drag & Drop**: Drag markers to fine-tune location selection

## 📋 Prerequisites

Before setting up the SaaS features, ensure you have:

1. **Node.js 20+** (required for Firebase CLI)
2. **Google Maps API Key** (for location picker)
3. **Firebase Project** (for authentication and data storage)
4. **Internet Connection** (for Google Maps and geocoding services)

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### Step 2: Configure Environment Variables

1. Copy the environment template:
```bash
cp .env.template .env
```

2. Fill in your configuration in `.env`:
```env
# Google Maps API Key (required for location picker)
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Google Cloud Project ID
REACT_APP_GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Firebase Project ID
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id

# Vertex AI Location
REACT_APP_VERTEX_LOCATION=us-central1
```

### Step 3: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
3. Create credentials → API Key
4. Restrict the key to your domain (optional but recommended)

### Step 4: Start the Application

```bash
# Start local development server
pnpm start

# The app will be available at http://localhost:3000
```

## 🔐 Test Credentials

The system comes with built-in test accounts for demonstration:

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Administrator
- **Permissions**: Full access to all features

### Demo User Account
- **Username**: `demo`
- **Password**: `demo123`
- **Role**: User
- **Permissions**: Standard user access

### Test User Account
- **Username**: `test`
- **Password**: `test123`
- **Role**: User
- **Permissions**: Standard user access

## 🎯 User Flow

### 1. Login Process
1. Navigate to the application
2. You'll be redirected to the login page
3. Enter test credentials or click "Show Test Credentials"
4. Click "Use These Credentials" for quick login
5. Successfully authenticated users proceed to event setup

### 2. Event Setup Process
1. **Step 1: Event Details**
   - Enter your event name (e.g., "Summer Music Festival 2024")
   - Preview shows how the event will appear in the dashboard
   - Click "Next" to proceed

2. **Step 2: Location Selection**
   - Choose between two methods:
     - **Manual Entry**: Type location name and address
     - **Map Selection**: Click on an interactive map
   
   **Manual Entry:**
   - Enter location name (e.g., "Central Park")
   - Enter full address
   - System will geocode the address automatically
   
   **Map Selection:**
   - Click "Select on Map" option
   - Interactive map loads with your current location
   - Click anywhere on the map to select event location
   - Drag the marker to fine-tune position
   - Address is automatically resolved via reverse geocoding
   - Optionally customize the location name

3. **Event Creation**
   - Review your event details
   - Click "Create Event" to save
   - You'll be redirected to the main dashboard

### 3. Dashboard Experience
Once your event is set up:
- **Navigation**: Shows user info and logout option
- **Event Info Panel**: Displays your event name and location
- **Map Center**: Automatically centers on your event location
- **Persistent Data**: Event details are saved across sessions

## 🗺️ Map Features

### Interactive Location Picker
- **Current Location**: Automatically detects your location as starting point
- **Click Selection**: Click anywhere to select a location
- **Draggable Markers**: Fine-tune location by dragging markers
- **Address Resolution**: Automatic address lookup for selected coordinates
- **Custom Names**: Override detected location names with custom ones

### Map Controls
- **Zoom**: Scroll or use zoom controls
- **Pan**: Click and drag to move around
- **Marker**: Shows selected event location
- **Styling**: Clean, focused map with minimal distractions

## 🔧 Customization Options

### User Interface
- **Theme**: Professional gradient design with smooth animations
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Keyboard navigation and screen reader friendly

### Event Management
- **Multiple Events**: Support for creating and switching between events
- **Location History**: Previous locations are remembered
- **Update Events**: Modify event details after creation

### Security Features
- **Session Management**: Secure login state management
- **Local Storage**: Encrypted user session data
- **Logout**: Complete session cleanup on logout

## 🐛 Troubleshooting

### Common Issues

#### Maps Not Loading
**Problem**: Map shows gray area or doesn't load
**Solutions**:
1. Check your Google Maps API key in `.env`
2. Ensure Maps JavaScript API is enabled in Google Cloud Console
3. Verify API key restrictions allow your domain
4. Check browser console for specific error messages

#### Location Detection Fails
**Problem**: Can't detect current location
**Solutions**:
1. Allow location permissions in your browser
2. Ensure you're accessing the site via HTTPS in production
3. Fallback to manual location entry if needed

#### Login Issues
**Problem**: Can't log in with test credentials
**Solutions**:
1. Verify you're using exact test credentials (case-sensitive)
2. Clear browser cache and cookies
3. Check browser console for JavaScript errors

#### Address Geocoding Fails
**Problem**: Address not found or incorrect location
**Solutions**:
1. Use more specific addresses (include city, state, country)
2. Try different address formats
3. Use the map selection method instead
4. Check Geocoding API is enabled and has quota

### Debug Mode

Enable debug logging by opening browser console:
```javascript
localStorage.setItem('drishti_debug', 'true');
```

This will show additional logging for:
- Authentication flows
- Map operations
- API calls
- Location services

## 📱 Mobile Support

The SaaS features are fully responsive:

### Mobile-Optimized Features
- **Touch-friendly**: Large buttons and touch targets
- **Responsive Maps**: Full-screen map view on mobile
- **Simplified Navigation**: Collapsed navigation for small screens
- **Touch Gestures**: Pinch to zoom, tap to select on maps

### Mobile-Specific Considerations
- **Location Services**: More accurate on mobile devices
- **Performance**: Optimized map loading for mobile networks
- **Orientation**: Supports both portrait and landscape modes

## 🚀 Production Deployment

### Firebase Hosting + Functions

1. **Build and Deploy**:
```bash
# Build frontend
pnpm build

# Deploy to Firebase
firebase deploy
```

2. **Environment Variables**:
- Set production Google Maps API key
- Configure domain restrictions
- Update CORS settings if needed

3. **Custom Domain** (Optional):
```bash
firebase hosting:channel:deploy production --expires 30d
```

## 🔐 Security Best Practices

### API Keys
- **Restrict Keys**: Limit Google Maps API key to specific domains
- **Rotate Keys**: Regularly rotate API keys
- **Monitor Usage**: Set up billing alerts and usage monitoring

### Authentication
- **Session Timeout**: Sessions expire automatically
- **Secure Storage**: User data encrypted in localStorage
- **HTTPS Only**: Always use HTTPS in production

### Data Privacy
- **Location Data**: Location coordinates stored securely
- **User Sessions**: No sensitive data stored in browser
- **Event Data**: Event information encrypted at rest

## 📞 Support

### Getting Help
- **Documentation**: Check this guide and README.md
- **Console Logs**: Enable debug mode for detailed logging
- **Error Messages**: Check browser developer tools
- **API Status**: Verify Google Cloud API status pages

### Common Solutions
1. **Clear browser cache** for persistent issues
2. **Check environment variables** for configuration problems
3. **Verify API keys** for third-party service issues
4. **Test with different browsers** for compatibility issues

---

## 🎉 Congratulations!

You've successfully set up Drishti AI's SaaS features! Your users can now:
- ✅ Log in securely with role-based access
- ✅ Create custom events with descriptive names
- ✅ Select locations using an interactive map
- ✅ Automatically detect their current location
- ✅ Experience a seamless, professional dashboard

The platform is now ready for real-world event monitoring with AI-powered crowd detection capabilities!