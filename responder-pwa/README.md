# Emergency Responder PWA

A lightweight Progressive Web App (PWA) designed for emergency responders to receive real-time alerts and notifications from the Drishti emergency response system.

## Features

- 🚨 **Real-time Emergency Alerts**: Receive instant notifications via Firebase Cloud Messaging
- 📱 **PWA Installation**: Install on mobile devices like Android and iOS
- 📳 **Vibration Alerts**: Emergency notifications trigger device vibration
- 🔄 **Offline Support**: Works offline with service worker caching
- 📊 **Responsive Design**: Optimized for mobile and desktop devices
- 🔔 **Push Notifications**: Background notifications even when app is closed

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project (same as main Drishti app)

### Installation

1. Navigate to the PWA directory:
```bash
cd responder-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3003](http://localhost:3003) in your browser

### Firebase Configuration

The PWA uses the same Firebase configuration as the main Drishti project. Make sure to:

1. Enable Firebase Cloud Messaging in your Firebase console
2. Generate a VAPID key for web push notifications
3. Update the `vapidKey` in `src/firebase.js` with your actual VAPID key

## Testing the PWA

### 1. Basic Functionality Test

1. Open the app in a modern browser (Chrome, Firefox, Safari)
2. Check that the responder information displays correctly
3. Verify online/offline status indicator works
4. Test the "Install App" button if it appears

### 2. PWA Installation Test

#### On Android (Samsung S21 FE or similar):

1. Open Chrome browser
2. Navigate to the PWA URL
3. Look for "Add to Home Screen" option in browser menu
4. Or tap the "Install App" button if available
5. Follow the installation prompts
6. Launch the app from the home screen icon

#### On Desktop:

1. Open Chrome or Edge
2. Look for the install icon in the address bar
3. Click to install as a desktop app

### 3. Emergency Alert Test

1. Click the "🧪 Test Emergency Alert" button
2. Verify that:
   - Device vibrates (on mobile)
   - Emergency overlay appears
   - Alert sound plays (if audio is enabled)
   - Red pulsing animation displays

### 4. Notification Permission Test

1. Check if notification permission is requested
2. Grant permission when prompted
3. Verify FCM token is generated and stored
4. Check browser console for any errors

### 5. Offline Functionality Test

1. Start the app while online
2. Disconnect from internet
3. Verify app still loads and functions
4. Check "Offline Mode" indicator appears
5. Reconnect and verify sync works

### 6. Service Worker Test

1. Open browser DevTools
2. Go to Application > Service Workers
3. Verify both service workers are registered:
   - Main SW (`/sw.js`)
   - Firebase Messaging SW (`/firebase-messaging-sw.js`)

## Integration with Main Drishti Project

### Firebase Messaging Setup

To send emergency notifications from the main Drishti app:

```javascript
// Example: Send emergency notification
const message = {
  notification: {
    title: '🚨 Emergency in Zone A',
    body: 'Pushing reported at Zone A. Multiple units needed.'
  },
  data: {
    type: 'emergency',
    location: 'Zone A',
    priority: 'high',
    responders_needed: '3'
  },
  token: 'responder-fcm-token-here'
};

admin.messaging().send(message);
```

### Database Integration

The PWA can be integrated with Firestore to:
- Store responder availability status
- Track emergency response times
- Sync offline data when reconnected

## File Structure

```
responder-pwa/
├── public/
│   ├── icons/              # PWA icons (72x72 to 512x512)
│   ├── manifest.json       # PWA manifest
│   ├── sw.js              # Main service worker
│   ├── firebase-messaging-sw.js  # FCM service worker
│   └── index.html         # Main HTML file
├── src/
│   ├── App.js             # Main React component
│   ├── App.css            # Main styles
│   ├── firebase.js        # Firebase configuration
│   ├── index.js           # React entry point
│   └── index.css          # Base styles
└── package.json           # Dependencies and scripts
```

## Key Components

### Emergency Alert Overlay
- Full-screen modal for emergency notifications
- Vibration and sound alerts
- Action buttons (Respond, Acknowledge, Dismiss)

### Service Workers
- **Main SW**: Handles caching and offline functionality
- **FCM SW**: Manages background push notifications

### Firebase Integration
- Cloud Messaging for real-time notifications
- Firestore for data synchronization
- Same configuration as main Drishti app

## Troubleshooting

### Common Issues

1. **No install prompt**: PWA criteria might not be met
   - Check manifest.json is valid
   - Ensure HTTPS or localhost
   - Verify service worker is registered

2. **Notifications not working**:
   - Check permission is granted
   - Verify VAPID key is correct
   - Check FCM configuration

3. **Vibration not working**:
   - Only works on mobile devices
   - Requires user interaction first
   - Check browser support

4. **Offline mode issues**:
   - Clear browser cache
   - Re-register service worker
   - Check network tab in DevTools

### Browser Support

- ✅ Chrome (Android & Desktop)
- ✅ Firefox (Android & Desktop)
- ✅ Safari (iOS & macOS)
- ✅ Edge (Desktop)
- ⚠️ Samsung Internet (Limited features)

## Production Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
# From main project directory
firebase deploy --only hosting:responder-pwa
```

### HTTPS Requirement

PWAs require HTTPS in production. Firebase Hosting provides this automatically.

## Development

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Adding New Features

1. Emergency response workflows
2. Location tracking
3. Team communication
4. Incident reporting
5. Analytics and reporting

## Security Considerations

- FCM tokens should be handled securely
- Implement proper authentication
- Validate all incoming notifications
- Use HTTPS in production
- Follow PWA security best practices

## Performance

The PWA is optimized for:
- Fast loading on mobile networks
- Minimal battery usage
- Efficient offline caching
- Small bundle size

## Contributing

1. Follow React and PWA best practices
2. Test on multiple devices and browsers
3. Ensure accessibility compliance
4. Update documentation for new features

## License

This project is part of the Drishti emergency response system.
