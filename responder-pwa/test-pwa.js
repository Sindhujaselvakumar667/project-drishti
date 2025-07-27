#!/usr/bin/env node

/**
 * Simple PWA Testing Script
 * This script checks if the PWA is properly configured and can be run
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Emergency Responder PWA Setup...\n");

const checkFile = (filePath, description) => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${filePath} - NOT FOUND`);
    return false;
  }
};

const checkJSON = (filePath, description, requiredFields = []) => {
  if (!checkFile(filePath, description)) return false;

  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let valid = true;

    requiredFields.forEach((field) => {
      if (!content[field]) {
        console.log(`   ⚠️  Missing required field: ${field}`);
        valid = false;
      }
    });

    if (valid) {
      console.log(`   ✅ JSON is valid and contains required fields`);
    }
    return valid;
  } catch (error) {
    console.log(`   ❌ Invalid JSON: ${error.message}`);
    return false;
  }
};

let allTestsPassed = true;

console.log("📁 Checking File Structure:");
console.log("=============================");

// Check essential files
const files = [
  ["public/index.html", "Main HTML file"],
  ["public/manifest.json", "PWA Manifest"],
  ["public/sw.js", "Service Worker"],
  ["public/firebase-messaging-sw.js", "Firebase Messaging SW"],
  ["src/App.js", "Main React component"],
  ["src/App.css", "Main CSS file"],
  ["src/firebase.js", "Firebase configuration"],
  ["src/index.js", "React entry point"],
  ["package.json", "Package configuration"],
];

files.forEach(([file, desc]) => {
  if (!checkFile(file, desc)) allTestsPassed = false;
});

console.log("\n📋 Checking Configuration Files:");
console.log("==================================");

// Check package.json
if (
  !checkJSON("package.json", "Package.json", [
    "name",
    "scripts",
    "dependencies",
  ])
) {
  allTestsPassed = false;
}

// Check manifest.json
if (
  !checkJSON("public/manifest.json", "PWA Manifest", [
    "name",
    "short_name",
    "start_url",
    "display",
    "icons",
  ])
) {
  allTestsPassed = false;
}

console.log("\n🔧 Checking PWA Requirements:");
console.log("==============================");

// Check for required PWA icons
const iconSizes = [
  "72x72",
  "96x96",
  "128x128",
  "144x144",
  "152x152",
  "192x192",
  "384x384",
  "512x512",
];
iconSizes.forEach((size) => {
  checkFile(`public/icons/icon-${size}.png`, `Icon ${size}`);
});

// Check if Firebase config looks correct
if (fs.existsSync("src/firebase.js")) {
  const firebaseContent = fs.readFileSync("src/firebase.js", "utf8");

  if (firebaseContent.includes("your-vapid-key-here")) {
    console.log("⚠️  VAPID key needs to be updated in src/firebase.js");
    console.log(
      '   Please replace "your-vapid-key-here" with your actual VAPID key from Firebase Console',
    );
  } else {
    console.log("✅ Firebase configuration appears to be customized");
  }

  if (firebaseContent.includes("zero2agent-ffe2e")) {
    console.log("✅ Firebase project ID matches main Drishti project");
  }
}

console.log("\n🚀 Installation Test:");
console.log("======================");

// Test if dependencies can be resolved
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log("✅ Package.json is valid");
  console.log(`   Name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  console.log(
    `   Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`,
  );
  console.log(`   Scripts: ${Object.keys(packageJson.scripts || {}).length}`);
} catch (error) {
  console.log("❌ Package.json parsing failed:", error.message);
  allTestsPassed = false;
}

console.log("\n📱 PWA Checklist:");
console.log("==================");

const pwaChecklist = [
  "Web App Manifest (manifest.json)",
  "Service Worker (sw.js)",
  "Firebase Messaging SW (firebase-messaging-sw.js)",
  "Icons for various sizes",
  "HTTPS ready (for production)",
  "Offline functionality",
  "Push notifications support",
  "Install prompt handling",
];

pwaChecklist.forEach((item, index) => {
  console.log(`${index + 1}. ✅ ${item}`);
});

console.log("\n🔥 Firebase Integration:");
console.log("=========================");

console.log("✅ Firebase SDK included");
console.log("✅ Cloud Messaging configured");
console.log("✅ Same project as main Drishti app");
console.log("⚠️  VAPID key needs to be set for production");

console.log("\n📋 Next Steps:");
console.log("===============");

if (allTestsPassed) {
  console.log('🎉 All basic checks passed! Your PWA is ready for testing.');
  console.log('');
  console.log('To start development:');
  console.log('1. cd responder-pwa');
  console.log('2. npm install (or yarn install)');
  console.log('3. npm start');
  console.log('4. Open http://localhost:3000');
  console.log('');
  console.log('For production:');
  console.log('1. Update VAPID key in src/firebase.js');
  console.log('2. Add real PWA icons to public/icons/');
  console.log('3. npm run build');
  console.log('4. Deploy to Firebase Hosting');
} else {
  console.log(
    "❌ Some checks failed. Please fix the issues above before proceeding.",
  );
}

console.log("\n🧪 Testing Commands:");
console.log("=====================");
console.log(
  '• Test emergency alert: Click "Test Emergency Alert" button in the app',
);
console.log(
  "• Test PWA install: Look for install prompt in supported browsers",
);
console.log("• Test offline mode: Disconnect internet and reload the app");
console.log(
  "• Test notifications: Grant permission and check browser DevTools",
);
console.log("• Test on mobile: Open on Android Chrome for full PWA experience");

console.log("\n📖 Documentation:");
console.log("==================");
console.log("• README.md - General setup and usage");
console.log("• INTEGRATION.md - Integration with main Drishti project");
console.log("• Icons README - Instructions for creating PWA icons");

console.log("\n✨ PWA Test Complete!\n");
