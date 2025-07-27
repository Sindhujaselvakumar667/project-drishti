import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration (same as main Drishti project)
const firebaseConfig = {
  apiKey: "AIzaSyAEsuwv5d80ahGBhG7bZJcUsbSM2MCBRXk",
  authDomain: "zero2agent-ffe2e.firebaseapp.com",
  projectId: "zero2agent-ffe2e",
  storageBucket: "zero2agent-ffe2e.firebasestorage.app",
  messagingSenderId: "984214687483",
  appId: "1:984214687483:web:a11ce408f3d82c11916a5e",
  measurementId: "G-SB6MT18TPE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Cloud Messaging
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn("Firebase Messaging not supported in this environment:", error);
}

// VAPID key for FCM (you'll need to generate this in Firebase Console)
const vapidKey =
  "BPhCZDn-U6-DAaJ_30gk84ywdL82xwLDlepETxeRu1wFoqvIBBuYBpH9fCirznY8XcR6qVndUptdzgPQ3jvKdiI"; // Replace with actual VAPID key

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn("Firebase Messaging not available");
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: vapidKey,
      });

      if (token) {
        console.log("FCM Token:", token);
        // Store token in localStorage for easy access
        localStorage.setItem("fcm-token", token);
        return token;
      } else {
        console.log("No registration token available.");
        return null;
      }
    } else {
      console.log("Unable to get permission to notify.");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while retrieving token:", error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  if (!messaging) {
    return Promise.reject("Firebase Messaging not available");
  }

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground:", payload);
      resolve(payload);
    });
  });
};

// Helper function to check if notifications are supported
export const isNotificationSupported = () => {
  return "Notification" in window && "serviceWorker" in navigator;
};

// Helper function to get stored FCM token
export const getStoredFCMToken = () => {
  return localStorage.getItem("fcm-token");
};

// Function to send FCM token to backend for storage
export const saveFCMTokenToBackend = async (token, responderInfo) => {
  try {
    // This would typically send to your backend API
    // For now, we'll just store it locally or in Firestore
    console.log("Saving FCM token for responder:", { token, responderInfo });

    // Store in localStorage as fallback
    localStorage.setItem(
      "responder-info",
      JSON.stringify({
        ...responderInfo,
        fcmToken: token,
        lastUpdated: new Date().toISOString(),
      }),
    );

    return true;
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return false;
  }
};

// Function to handle emergency notification vibration
export const triggerEmergencyVibration = () => {
  if ("vibrate" in navigator) {
    // Emergency pattern: long-short-long vibration
    navigator.vibrate([500, 300, 500, 300, 800]);
  }
};

// Function to play emergency sound (if audio is allowed)
export const playEmergencySound = () => {
  try {
    // Create audio context for emergency beep
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Emergency frequency (high pitched beep)
    oscillator.frequency.value = 1000;
    oscillator.type = "sine";

    // Volume control
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );

    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn("Could not play emergency sound:", error);
  }
};

export default app;
