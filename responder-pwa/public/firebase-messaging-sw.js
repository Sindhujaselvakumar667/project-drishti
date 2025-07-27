// Firebase Messaging Service Worker for Emergency Responder PWA
// This handles background push notifications when the app is not active

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as main app)
const firebaseConfig = {
  apiKey: "AIzaSyAEsuwv5d80ahGBhG7bZJcUsbSM2MCBRXk",
  authDomain: "zero2agent-ffe2e.firebaseapp.com",
  projectId: "zero2agent-ffe2e",
  storageBucket: "zero2agent-ffe2e.firebasestorage.app",
  messagingSenderId: "984214687483",
  appId: "1:984214687483:web:a11ce408f3d82c11916a5e",
  measurementId: "G-SB6MT18TPE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || '🚨 Emergency Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'Emergency notification received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [500, 300, 500, 300, 800], // Emergency vibration pattern
    data: {
      ...payload.data,
      timestamp: Date.now(),
      type: payload.data?.type || 'emergency'
    },
    actions: [
      {
        action: 'respond',
        title: '🚨 Respond Now',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'acknowledge',
        title: '✓ Acknowledge'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    silent: false,
    tag: 'emergency-alert',
    renotify: true,
    priority: 'high'
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);

  // Send emergency data to main app if it's open
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'EMERGENCY_NOTIFICATION',
        payload: payload,
        timestamp: Date.now()
      });
    });
  });
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data;

  if (event.action === 'respond') {
    // Handle respond action
    event.waitUntil(
      handleEmergencyResponse(notificationData)
    );
  } else if (event.action === 'acknowledge') {
    // Handle acknowledge action
    event.waitUntil(
      acknowledgeEmergency(notificationData)
    );
  } else if (event.action === 'dismiss') {
    // Just dismiss - no action needed
    console.log('Emergency notification dismissed by user');
  } else {
    // Default action - open the app
    event.waitUntil(
      openAppAndFocusEmergency(notificationData)
    );
  }
});

// Handle emergency response
async function handleEmergencyResponse(data) {
  try {
    // Open the app and focus on the emergency
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Check if app is already open
    let appClient = null;
    for (const client of clients) {
      if (client.url.includes('/') && client.focused !== false) {
        appClient = client;
        break;
      }
    }

    if (appClient) {
      // App is open, send message to respond to emergency
      appClient.focus();
      appClient.postMessage({
        type: 'EMERGENCY_RESPONSE_ACTION',
        action: 'respond',
        data: data
      });
    } else {
      // Open new window
      const newClient = await self.clients.openWindow('/');
      if (newClient) {
        // Wait a bit for the app to load, then send message
        setTimeout(() => {
          newClient.postMessage({
            type: 'EMERGENCY_RESPONSE_ACTION',
            action: 'respond',
            data: data
          });
        }, 1000);
      }
    }

    // Log response (could send to analytics/backend)
    console.log('Emergency response initiated:', data);

  } catch (error) {
    console.error('Error handling emergency response:', error);
  }
}

// Handle emergency acknowledgment
async function acknowledgeEmergency(data) {
  try {
    // Send acknowledgment to all open clients
    const clients = await self.clients.matchAll({
      includeUncontrolled: true
    });

    clients.forEach((client) => {
      client.postMessage({
        type: 'EMERGENCY_ACKNOWLEDGED',
        data: data,
        timestamp: Date.now()
      });
    });

    // Could also send acknowledgment to backend here
    console.log('Emergency acknowledged:', data);

  } catch (error) {
    console.error('Error acknowledging emergency:', error);
  }
}

// Open app and focus on emergency
async function openAppAndFocusEmergency(data) {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Check if app is already open
    if (clients.length > 0) {
      const client = clients[0];
      client.focus();
      client.postMessage({
        type: 'EMERGENCY_FOCUS',
        data: data
      });
    } else {
      // Open new window
      await self.clients.openWindow('/');
    }
  } catch (error) {
    console.error('Error opening app:', error);
  }
}

// Handle background sync for offline emergency data
self.addEventListener('sync', (event) => {
  if (event.tag === 'emergency-sync') {
    event.waitUntil(syncEmergencyData());
  } else if (event.tag === 'response-sync') {
    event.waitUntil(syncResponseData());
  }
});

// Sync emergency data when coming back online
async function syncEmergencyData() {
  try {
    console.log('Syncing emergency data...');

    // Get pending emergency reports from IndexedDB
    const pendingData = await getPendingEmergencyData();

    for (const data of pendingData) {
      try {
        await sendEmergencyDataToServer(data);
        await removePendingData(data.id);
      } catch (error) {
        console.error('Failed to sync emergency data:', error);
      }
    }
  } catch (error) {
    console.error('Emergency data sync failed:', error);
  }
}

// Sync response data
async function syncResponseData() {
  try {
    console.log('Syncing response data...');

    // Implementation for syncing response data
    // This would handle offline responses that need to be sent when online

  } catch (error) {
    console.error('Response data sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingEmergencyData() {
  // Implementation would use IndexedDB to get pending data
  return [];
}

async function sendEmergencyDataToServer(data) {
  // Implementation to send data to backend
  const response = await fetch('/api/emergency-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to send emergency data');
  }

  return response.json();
}

async function removePendingData(dataId) {
  // Implementation to remove from IndexedDB
  console.log('Removing pending data:', dataId);
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Firebase messaging SW received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Enhanced error handling
self.addEventListener('error', (event) => {
  console.error('Firebase messaging service worker error:', event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Firebase messaging service worker unhandled rejection:', event);
});
