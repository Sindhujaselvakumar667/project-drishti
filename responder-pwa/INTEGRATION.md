# Responder PWA Integration Guide

This guide explains how to integrate the Emergency Responder PWA with the main Drishti project for sending real-time emergency notifications.

## Overview

The Responder PWA is designed to work seamlessly with the main Drishti emergency response system. It receives push notifications via Firebase Cloud Messaging (FCM) and displays emergency alerts to first responders.

## Integration Steps

### 1. Firebase Cloud Messaging Setup

#### Enable FCM in Firebase Console

1. Go to your Firebase Console
2. Select your project (`zero2agent-ffe2e`)
3. Navigate to Project Settings > Cloud Messaging
4. Generate a Web Push certificate (VAPID key)
5. Copy the VAPID key and update `src/firebase.js` in the PWA

#### Update VAPID Key

In `responder-pwa/src/firebase.js`, replace:
```javascript
const vapidKey = "your-vapid-key-here";
```

With your actual VAPID key from Firebase Console.

### 2. Backend Integration

#### Add FCM Admin SDK (if not already added)

In the main project's `functions/package.json`, ensure you have:
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0"
  }
}
```

#### Create Emergency Notification Function

Add this to your Firebase Functions (`functions/index.js`):

```javascript
const admin = require('firebase-admin');

// Function to send emergency notifications to responders
exports.sendEmergencyNotification = functions.firestore
  .document('emergencies/{emergencyId}')
  .onCreate(async (snap, context) => {
    const emergency = snap.data();

    // Get registered responder tokens from Firestore
    const respondersSnapshot = await admin.firestore()
      .collection('responders')
      .where('status', '==', 'available')
      .where('zone', '==', emergency.zone)
      .get();

    const tokens = [];
    respondersSnapshot.forEach(doc => {
      const responder = doc.data();
      if (responder.fcmToken) {
        tokens.push(responder.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log('No available responders found');
      return;
    }

    // Prepare the notification message
    const message = {
      notification: {
        title: `🚨 Emergency in ${emergency.location}`,
        body: emergency.description || 'Emergency response needed',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      },
      data: {
        type: 'emergency',
        emergencyId: context.params.emergencyId,
        location: emergency.location,
        priority: emergency.priority || 'high',
        timestamp: emergency.timestamp.toString(),
        responders_needed: emergency.responders_needed?.toString() || '1'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'emergency_alerts',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: `🚨 Emergency in ${emergency.location}`,
              body: emergency.description || 'Emergency response needed'
            },
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: `🚨 Emergency in ${emergency.location}`,
          body: emergency.description || 'Emergency response needed',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [500, 300, 500, 300, 800],
          requireInteraction: true,
          actions: [
            {
              action: 'respond',
              title: '🚨 Respond Now'
            },
            {
              action: 'acknowledge',
              title: '✓ Acknowledge'
            }
          ]
        }
      }
    };

    // Send to multiple tokens
    try {
      const response = await admin.messaging().sendToDevice(tokens, message);
      console.log('Emergency notification sent successfully:', response);

      // Log the notification for tracking
      await admin.firestore()
        .collection('notification_logs')
        .add({
          emergencyId: context.params.emergencyId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          recipientCount: tokens.length,
          successCount: response.successCount,
          failureCount: response.failureCount
        });

    } catch (error) {
      console.error('Error sending emergency notification:', error);
    }
  });

// Function to register responder FCM tokens
exports.registerResponderToken = functions.https.onCall(async (data, context) => {
  const { token, responderInfo } = data;

  if (!token || !responderInfo) {
    throw new functions.https.HttpsError('invalid-argument', 'Token and responder info required');
  }

  try {
    // Store the token in Firestore
    await admin.firestore()
      .collection('responders')
      .doc(responderInfo.badge)
      .set({
        ...responderInfo,
        fcmToken: token,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        status: 'available'
      }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error registering responder token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to register token');
  }
});
```

### 3. Frontend Integration

#### Update Main Drishti App

In your main Drishti application, add emergency creation logic:

```javascript
// Example: Create emergency and trigger notifications
const createEmergency = async (emergencyData) => {
  try {
    const docRef = await db.collection('emergencies').add({
      ...emergencyData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      createdBy: 'system' // or current user
    });

    console.log('Emergency created with ID:', docRef.id);

    // The Cloud Function will automatically send notifications
    return docRef.id;
  } catch (error) {
    console.error('Error creating emergency:', error);
    throw error;
  }
};

// Usage example
const emergency = {
  location: 'Zone A - Building 42',
  description: 'Fire reported on 3rd floor',
  priority: 'high',
  zone: 'A',
  responders_needed: 3,
  type: 'fire'
};

createEmergency(emergency);
```

### 4. Database Schema

#### Firestore Collections

**emergencies** collection:
```javascript
{
  id: "auto-generated",
  location: "Zone A - Building 42",
  description: "Fire reported on 3rd floor",
  priority: "high", // high, medium, low
  zone: "A",
  responders_needed: 3,
  type: "fire", // fire, medical, security, etc.
  status: "active", // active, resolved, cancelled
  timestamp: Timestamp,
  createdBy: "user_id",
  assignedResponders: ["responder1", "responder2"]
}
```

**responders** collection:
```javascript
{
  name: "Officer John Smith",
  id: "INS-4567",
  zone: "A",
  status: "available", // available, busy, offline
  location: "Zone A - Sector 12",
  fcmToken: "fcm_token_string",
  lastUpdated: Timestamp,
  contact: {
    phone: "+1234567890",
    radio: "CH-12"
  }
}
```

**notification_logs** collection:
```javascript
{
  id: "auto-generated",
  emergencyId: "emergency_doc_id",
  sentAt: Timestamp,
  recipientCount: 5,
  successCount: 4,
  failureCount: 1,
  type: "emergency_alert"
}
```

### 5. Testing the Integration

#### Test Emergency Creation

1. Create a test emergency in your main app:
```javascript
// Test function - add to your main app for testing
const testEmergencyNotification = async () => {
  const testEmergency = {
    location: 'Test Zone - Building 1',
    description: 'Test emergency for PWA integration',
    priority: 'high',
    zone: 'A',
    responders_needed: 1,
    type: 'test'
  };

  await createEmergency(testEmergency);
};
```

2. Check that:
   - Emergency document is created in Firestore
   - Cloud Function triggers successfully
   - PWA receives the notification
   - Responder sees the alert overlay

#### Test FCM Token Registration

1. Open the Responder PWA
2. Grant notification permission
3. Check Firestore for the responder token
4. Verify the token is valid

### 6. Production Deployment

#### Deploy PWA

```bash
# Build the PWA
cd responder-pwa
npm run build

# Deploy to Firebase Hosting (create separate site)
firebase hosting:sites:create responder-pwa
firebase target:apply hosting responder-pwa responder-pwa
firebase deploy --only hosting:responder-pwa
```

#### Deploy Cloud Functions

```bash
# From main project directory
firebase deploy --only functions
```

#### Configure Firebase Hosting

Update main project's `firebase.json` to include PWA routing:

```json
{
  "hosting": [
    {
      "target": "main",
      "public": "build",
      "rewrites": [
        {
          "source": "/responder/**",
          "destination": "https://responder-pwa.web.app/**"
        }
      ]
    },
    {
      "target": "responder-pwa",
      "public": "responder-pwa/build",
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

### 7. Security Considerations

1. **Token Validation**: Validate FCM tokens before storing
2. **Authentication**: Implement responder authentication
3. **Rate Limiting**: Prevent spam notifications
4. **Data Validation**: Validate all emergency data
5. **Privacy**: Handle responder location data carefully

### 8. Monitoring and Analytics

#### Add Analytics to PWA

```javascript
// In responder-pwa/src/firebase.js
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);

export const logEmergencyResponse = (emergencyId, action) => {
  logEvent(analytics, 'emergency_response', {
    emergency_id: emergencyId,
    action: action, // 'respond', 'acknowledge', 'dismiss'
    responder_id: getResponderInfo().badge
  });
};
```

#### Monitor Cloud Functions

```javascript
// Add logging to Cloud Functions
const functions = require('firebase-functions');

exports.emergencyMetrics = functions.firestore
  .document('emergencies/{emergencyId}')
  .onUpdate((change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status) {
      console.log(`Emergency ${context.params.emergencyId} status changed: ${before.status} -> ${after.status}`);
    }
  });
```

### 9. Troubleshooting

#### Common Issues

1. **Notifications not received**:
   - Check VAPID key configuration
   - Verify FCM token is valid
   - Check browser notification permissions

2. **PWA not installing**:
   - Ensure HTTPS is enabled
   - Check manifest.json validity
   - Verify service worker registration

3. **Cloud Function errors**:
   - Check Firebase Console logs
   - Verify Firestore security rules
   - Test with smaller token batches

#### Debug Tools

```javascript
// Add to PWA for debugging
const debugNotifications = () => {
  console.log('FCM Token:', localStorage.getItem('fcm-token'));
  console.log('Notification Permission:', Notification.permission);
  console.log('Service Worker State:', navigator.serviceWorker.controller?.state);
};
```

### 10. Future Enhancements

1. **Geolocation**: Add responder location tracking
2. **Team Chat**: Real-time communication during emergencies
3. **Incident Photos**: Camera integration for incident documentation
4. **Offline Sync**: Better offline functionality
5. **Voice Alerts**: Text-to-speech for hands-free notifications

## Support

For technical issues or questions about the integration:
1. Check the Firebase Console logs
2. Review browser developer tools
3. Test with the provided debug functions
4. Refer to the main README.md for basic PWA setup
