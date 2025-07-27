// Service Worker for Emergency Responder PWA
const CACHE_NAME = 'emergency-responder-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Handle background sync for offline emergency reports
self.addEventListener('sync', (event) => {
  if (event.tag === 'emergency-sync') {
    event.waitUntil(syncEmergencyData());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Emergency Alert',
        body: event.data.text() || 'New emergency notification',
        type: 'emergency'
      };
    }
  }

  const options = {
    body: notificationData.body || 'Emergency notification received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [500, 300, 500],
    data: notificationData,
    actions: [
      {
        action: 'respond',
        title: '🚨 Respond',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    silent: false,
    tag: 'emergency-alert',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || '🚨 Emergency Alert',
      options
    ).then(() => {
      // Send message to main app to trigger vibration and overlay
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'EMERGENCY_NOTIFICATION',
            data: notificationData
          });
        });
      });
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'respond') {
    // Open the app and focus on emergency
    event.waitUntil(
      self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes('/')) {
            client.focus();
            client.postMessage({
              type: 'EMERGENCY_RESPONSE',
              data: event.notification.data
            });
            return;
          }
        }

        // Open new window if app is not open
        return self.clients.openWindow('/').then((client) => {
          if (client) {
            client.postMessage({
              type: 'EMERGENCY_RESPONSE',
              data: event.notification.data
            });
          }
        });
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    console.log('Emergency notification dismissed');
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Background sync function for emergency data
async function syncEmergencyData() {
  try {
    // Get pending emergency reports from IndexedDB
    const pendingReports = await getPendingEmergencyReports();

    for (const report of pendingReports) {
      try {
        await sendEmergencyReport(report);
        await removePendingReport(report.id);
      } catch (error) {
        console.error('Failed to sync emergency report:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingEmergencyReports() {
  // Implementation would depend on your IndexedDB structure
  return [];
}

async function sendEmergencyReport(report) {
  // Implementation to send report to server
  const response = await fetch('/api/emergency-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(report)
  });

  if (!response.ok) {
    throw new Error('Failed to send emergency report');
  }

  return response.json();
}

async function removePendingReport(reportId) {
  // Implementation to remove from IndexedDB
  console.log('Removing pending report:', reportId);
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
