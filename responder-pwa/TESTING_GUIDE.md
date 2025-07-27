# Emergency Responder PWA - Testing Guide

## 📱 Complete Testing Instructions

This guide provides step-by-step instructions to test all functionality of the Emergency Responder PWA, including integration with the main Drishti project.

## 🚀 Quick Start Testing

### 1. Initial Setup
```bash
cd project-drishti/responder-pwa
npm install
npm start
```

Open http://localhost:3003 in your browser.

### 2. Basic Functionality Tests

#### ✅ App Loading Test
- [ ] App loads without errors
- [ ] Responder information displays (Officer John Smith, Badge ID-4567)
- [ ] Online/Offline status indicator shows "Online"
- [ ] No console errors in browser DevTools

#### ✅ PWA Features Test
- [ ] Service worker registers successfully (check DevTools > Application > Service Workers)
- [ ] Manifest is valid (check DevTools > Application > Manifest)
- [ ] App works offline (disconnect internet, reload page)
- [ ] Install prompt appears in supported browsers

#### ✅ Emergency Alert Test
1. Click "🧪 Test Emergency Alert" button
2. Verify:
   - [ ] Emergency overlay appears with red border and pulsing animation
   - [ ] Device vibrates (on mobile devices)
   - [ ] Alert shows: "🚨 Emergency in Zone A"
   - [ ] Message displays: "Fire reported at Building 42..."
   - [ ] Time stamp shows current time
   - [ ] Two action buttons appear: "🚨 Respond Now" and "✓ Acknowledge"

3. Test buttons:
   - [ ] "Respond Now" shows alert: "Emergency response initiated. Dispatching..."
   - [ ] "Acknowledge" dismisses the overlay
   - [ ] Close button (×) dismisses the overlay

## 📱 Mobile Device Testing (Android/iOS)

### Samsung S21 FE / Android Testing

1. **PWA Installation**:
   - Open Chrome browser on Android
   - Navigate to your PWA URL
   - Look for "Add to Home Screen" in browser menu
   - Install the app
   - [ ] App icon appears on home screen
   - [ ] App opens in standalone mode (no browser UI)

2. **Mobile-Specific Features**:
   - [ ] Vibration works when testing emergency alerts
   - [ ] Touch interactions work smoothly
   - [ ] App displays properly in portrait mode
   - [ ] Status bar color matches app theme (red)

3. **Background Notifications** (requires Firebase setup):
   - [ ] App requests notification permission
   - [ ] Permission is granted
   - [ ] FCM token is generated and stored

### iOS Testing

1. **PWA Installation on iOS**:
   - Open Safari on iPhone/iPad
   - Navigate to PWA URL
   - Tap Share button → "Add to Home Screen"
   - [ ] App installs and opens in standalone mode

2. **iOS-Specific Features**:
   - [ ] App respects safe area insets
   - [ ] Touch gestures work properly
   - [ ] No zoom on double-tap

## 🔥 Firebase Integration Testing

### Prerequisites
Before testing Firebase features, ensure:
1. VAPID key is updated in `src/firebase.js`
2. Firebase project is properly configured
3. Cloud Messaging is enabled

### FCM Token Registration Test
1. Open PWA in browser
2. Grant notification permission when prompted
3. Check browser console for FCM token
4. [ ] Token is logged and stored in localStorage
5. [ ] No Firebase errors in console

### Background Message Test (Advanced)
If you have the backend integration set up:

1. Send a test message from Firebase Console:
   ```json
   {
     "notification": {
       "title": "🚨 Test Emergency",
       "body": "This is a test emergency notification"
     },
     "data": {
       "type": "emergency",
       "location": "Test Zone",
       "priority": "high"
     }
   }
   ```

2. Verify:
   - [ ] Notification appears in browser/device
   - [ ] PWA opens when notification is clicked
   - [ ] Emergency overlay triggers automatically

## 🌐 Browser Compatibility Testing

### Chrome (Recommended)
- [ ] All features work
- [ ] Install prompt appears
- [ ] Service worker functions properly
- [ ] Notifications work

### Firefox
- [ ] Basic functionality works
- [ ] Service worker registers
- [ ] Some PWA features may be limited

### Safari
- [ ] App functions on iOS/macOS
- [ ] Install prompt works on iOS
- [ ] Service worker support varies

### Edge
- [ ] Similar to Chrome experience
- [ ] Install prompt available

## 🔧 Advanced Testing

### Offline Functionality Test
1. Load the app while online
2. Disconnect internet connection
3. [ ] App continues to work
4. [ ] "Offline Mode" indicator appears
5. [ ] Previously loaded content remains accessible
6. Reconnect internet
7. [ ] App detects online status
8. [ ] Offline indicator disappears

### Performance Testing
1. Open DevTools → Lighthouse
2. Run PWA audit
3. [ ] Performance score > 90
4. [ ] PWA score = 100
5. [ ] Accessibility score > 90

### Network Throttling Test
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Reload the app
3. [ ] App loads within reasonable time
4. [ ] Loading spinner appears during load
5. [ ] No layout shift during loading

Note: The PWA runs on port 3003 by default.

## 🧪 Integration with Main Drishti Project

### Database Integration Test
If Firestore is set up:

1. Create test emergency in main Drishti app:
   ```javascript
   const testEmergency = {
     location: 'Test Zone - Building 1',
     description: 'Test emergency for PWA integration',
     priority: 'high',
     zone: 'A',
     responders_needed: 1,
     type: 'test'
   };
   ```

2. Verify:
   - [ ] Emergency document created in Firestore
   - [ ] Cloud Function triggers (check Firebase logs)
   - [ ] PWA receives notification
   - [ ] Emergency overlay displays automatically

### Token Storage Test
1. Open PWA on multiple devices/browsers
2. Grant notification permissions
3. Check Firestore `responders` collection
4. [ ] Each device has unique FCM token stored
5. [ ] Responder information is correctly saved

## 🚨 Production Testing Checklist

### Before Deployment
- [ ] VAPID key updated with production key
- [ ] Real PWA icons added (not placeholders)
- [ ] Firebase project configured for production
- [ ] HTTPS certificate ready
- [ ] Error tracking configured

### After Deployment
- [ ] PWA loads over HTTPS
- [ ] Install prompt works on production URL
- [ ] Service worker caches resources properly
- [ ] Push notifications work from production
- [ ] Analytics tracking functions (if implemented)

## 🐛 Troubleshooting Common Issues

### PWA Not Installing
**Problem**: Install prompt doesn't appear
**Solutions**:
- Ensure HTTPS or localhost
- Check manifest.json validity
- Verify service worker registration
- Clear browser cache

### Notifications Not Working
**Problem**: Push notifications not received
**Solutions**:
- Check notification permission status
- Verify VAPID key configuration
- Test FCM token generation
- Check Firebase Console for errors

### Vibration Not Working
**Problem**: Device doesn't vibrate
**Solutions**:
- Test on mobile device (doesn't work on desktop)
- Ensure user interaction occurred first
- Check browser support for Vibration API

### Service Worker Issues
**Problem**: SW not registering or updating
**Solutions**:
- Clear browser cache and storage
- Check for JavaScript errors
- Verify SW file is accessible
- Use "Update on reload" in DevTools

## 📊 Success Criteria

### ✅ Basic PWA Requirements
- [ ] Installable on mobile devices
- [ ] Works offline
- [ ] Has app manifest
- [ ] Uses service worker
- [ ] Served over HTTPS (production)

### ✅ Emergency Response Features
- [ ] Receives real-time notifications
- [ ] Displays emergency alerts with proper UI
- [ ] Triggers device vibration
- [ ] Provides response actions
- [ ] Logs user interactions

### ✅ Integration Requirements
- [ ] Connects to same Firebase project as main app
- [ ] Stores and retrieves FCM tokens
- [ ] Responds to Firestore changes
- [ ] Works with Cloud Functions

### ✅ Mobile Experience
- [ ] Responsive design works on all screen sizes
- [ ] Touch interactions are smooth
- [ ] Install experience is seamless
- [ ] Standalone app behavior

## 📈 Performance Benchmarks

Target metrics for production:
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 3s
- Time to Interactive: < 4s
- PWA Score: 100/100
- Performance Score: > 90/100

## 🔄 Continuous Testing

### Automated Testing
Run the included test suite:
```bash
npm test
```

### Manual Testing Schedule
- **Daily**: Basic functionality during development
- **Weekly**: Full PWA features and mobile testing
- **Before Release**: Complete integration testing
- **Post-Deploy**: Production environment verification

## 📞 Support & Documentation

For additional help:
- Main README.md for setup instructions
- INTEGRATION.md for Firebase integration
- Browser DevTools for debugging
- Firebase Console for backend monitoring

## 🎯 Next Steps After Testing

Once all tests pass:
1. Deploy to production environment
2. Set up monitoring and analytics
3. Train responders on PWA usage
4. Implement feedback collection
5. Plan for future enhancements

---

**Testing Complete!** 🎉

Your Emergency Responder PWA is ready for production use with the Drishti emergency response system.