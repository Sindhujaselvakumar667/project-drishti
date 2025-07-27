import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main service worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available; please refresh
                console.log('New content is available; please refresh.');
              } else {
                // Content is cached for offline use
                console.log('Content is cached for offline use.');
              }
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });

    // Register Firebase messaging service worker
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase messaging SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('Firebase messaging SW registration failed: ', registrationError);
      });
  });

  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Received message from service worker:', event.data);
  });
}

// Check if the app is running as a PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

// Add PWA-specific functionality
if (isPWA()) {
  console.log('Running as PWA');

  // Hide browser UI elements when running as PWA
  document.documentElement.classList.add('pwa-mode');

  // Prevent zoom on double tap (iOS)
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// Handle app install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  console.log('beforeinstallprompt event fired');
});

// Handle app installed event
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed successfully');
});

// Handle visibility change for better battery management
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('App is now hidden');
  } else {
    console.log('App is now visible');
  }
});

// Handle online/offline events
window.addEventListener('online', () => {
  console.log('App is online');
  document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  document.body.classList.add('offline');
});

// Disable pull-to-refresh on mobile
document.body.style.overscrollBehavior = 'none';

// Measure and report web vitals
reportWebVitals(console.log);
