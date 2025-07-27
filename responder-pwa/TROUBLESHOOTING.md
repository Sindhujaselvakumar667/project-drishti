# Emergency Responder PWA - Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Permission Denied Errors (macOS/Linux)

#### Problem: ESLint cache permission errors
```
EACCES: permission denied, mkdir '/path/to/node_modules/.cache'
```

#### Solutions:

**Option 1: Quick Fix (Recommended)**
```bash
cd responder-pwa
./fix-permissions.sh
```

**Option 2: Manual Fix**
```bash
# Clean everything
rm -rf node_modules package-lock.json .eslintcache

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Install with safe flags
npm install --no-optional

# Start with safe mode
npm run start:safe
```

**Option 3: Use Yarn Instead**
```bash
# Install yarn if not available
npm install -g yarn

# Use yarn instead of npm
yarn install
yarn start
```

**Option 4: Disable ESLint Temporarily**
```bash
# Start without ESLint checking
DISABLE_ESLINT_PLUGIN=true PORT=3003 npm start
```

### Port Already in Use

#### Problem: Port 3003 is already occupied

#### Solutions:

**Check what's using the port:**
```bash
lsof -ti:3003
# or
netstat -tulpn | grep 3003
```

**Kill the process:**
```bash
kill -9 $(lsof -ti:3003)
```

**Use a different port:**
```bash
PORT=3004 npm start
```

### Node.js Version Issues

#### Problem: Incompatible Node.js version

#### Solution:
```bash
# Check your Node version
node --version

# Required: Node.js 16 or higher
# Install latest Node.js from https://nodejs.org/
# Or use nvm:
nvm install node
nvm use node
```

### PWA Not Installing

#### Problem: Install prompt doesn't appear

#### Solutions:

1. **Check PWA Requirements:**
   - Must be served over HTTPS (or localhost)
   - Must have valid manifest.json
   - Must have registered service worker
   - Must pass basic PWA criteria

2. **Debug in Chrome:**
   - Open DevTools (F12)
   - Go to Application tab
   - Check Manifest section
   - Check Service Workers section
   - Look for errors in Console

3. **Force Install Prompt:**
   - Open Chrome DevTools
   - Application → Manifest → "Add to homescreen"

### Firebase/Notification Issues

#### Problem: Push notifications not working

#### Solutions:

1. **Check Firebase Configuration:**
   ```javascript
   // Verify in src/firebase.js
   const vapidKey = "your-actual-vapid-key"; // Not placeholder
   ```

2. **Check Browser Permissions:**
   ```javascript
   // In browser console
   console.log('Notification permission:', Notification.permission);
   ```

3. **Verify FCM Token:**
   ```javascript
   // Check localStorage in DevTools
   localStorage.getItem('fcm-token');
   ```

### Build/Compilation Errors

#### Problem: Build fails with various errors

#### Solutions:

**Clear all caches:**
```bash
# Clean npm cache
npm cache clean --force

# Clean React cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Build with legacy settings:**
```bash
npm run build --legacy-peer-deps
```

### Service Worker Issues

#### Problem: Service worker not registering

#### Solutions:

1. **Check browser support:**
   ```javascript
   if ('serviceWorker' in navigator) {
     console.log('Service Worker supported');
   } else {
     console.log('Service Worker not supported');
   }
   ```

2. **Clear service worker cache:**
   - DevTools → Application → Storage → Clear storage
   - Or manually unregister: DevTools → Application → Service Workers → Unregister

3. **Check service worker file:**
   - Verify `public/sw.js` exists
   - Check for JavaScript errors in the file

### Mobile Testing Issues

#### Problem: PWA doesn't work properly on mobile

#### Solutions:

1. **Use proper testing setup:**
   - Test on real device, not simulator
   - Use Chrome on Android for best support
   - Use Safari on iOS

2. **Check mobile-specific features:**
   ```javascript
   // Test vibration
   if ('vibrate' in navigator) {
     navigator.vibrate(200);
   }
   
   // Check if running as PWA
   if (window.matchMedia('(display-mode: standalone)').matches) {
     console.log('Running as PWA');
   }
   ```

### Development Server Issues

#### Problem: Server won't start or crashes

#### Solutions:

**Check for conflicting processes:**
```bash
# Kill any Node processes
pkill -f node

# Start fresh
npm start
```

**Use alternative start methods:**
```bash
# Option 1: Safe start
npm run start:safe

# Option 2: Clean start
npm run start:clean

# Option 3: Manual start
PORT=3003 npx react-scripts start
```

### Memory/Performance Issues

#### Problem: High memory usage or slow performance

#### Solutions:

1. **Increase Node.js memory:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm start
   ```

2. **Disable source maps:**
   ```bash
   GENERATE_SOURCEMAP=false npm start
   ```

3. **Use production build for testing:**
   ```bash
   npm run build
   npm run serve
   ```

## 🔧 Environment-Specific Fixes

### macOS

```bash
# Fix Xcode command line tools
xcode-select --install

# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Windows

```batch
# Run as administrator
# Clean npm cache
npm cache clean --force

# Use Windows script
start-pwa.bat
```

### Linux

```bash
# Install build essentials
sudo apt-get install build-essential

# Fix permissions
sudo chown -R $USER:$USER ~/.npm
```

## 🚀 Quick Start Checklist

When nothing works, try this complete reset:

```bash
# 1. Clean everything
rm -rf node_modules package-lock.json .eslintcache build

# 2. Fix permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# 3. Clear all caches
npm cache clean --force

# 4. Reinstall with safe flags
npm install --no-optional --legacy-peer-deps

# 5. Start with all safety flags
DISABLE_ESLINT_PLUGIN=true SKIP_PREFLIGHT_CHECK=true PORT=3003 npm start
```

## 📞 Getting Help

### Debug Information to Collect

Before asking for help, collect this information:

```bash
# System information
node --version
npm --version
uname -a  # or ver on Windows

# Project information
npm ls react-scripts
cat package.json | grep version

# Error logs
npm start 2>&1 | tee error.log
```

### Useful DevTools Commands

```javascript
// In browser console
console.log('PWA Debug Info:', {
  isStandalone: window.matchMedia('(display-mode: standalone)').matches,
  hasServiceWorker: 'serviceWorker' in navigator,
  notificationPermission: Notification.permission,
  onLine: navigator.onLine,
  userAgent: navigator.userAgent
});
```

### Log Locations

- **npm logs:** `~/.npm/_logs/`
- **React logs:** Console in browser DevTools
- **Service Worker logs:** DevTools → Application → Service Workers

## 🎯 Success Verification

After fixing issues, verify everything works:

```bash
# 1. Run PWA tests
npm run test:pwa

# 2. Start the app
npm start

# 3. Check in browser
# - Open http://localhost:3003
# - Check DevTools for errors
# - Test emergency alert button
# - Verify PWA install prompt
```

## 🔄 Prevention Tips

1. **Keep dependencies updated:** `npm update`
2. **Use Node Version Manager:** `nvm use`
3. **Regular cache cleaning:** `npm cache clean --force`
4. **Test on multiple browsers/devices**
5. **Use proper environment variables**

---

**Still having issues?** Check the main README.md and INTEGRATION.md files, or create a GitHub issue with your error logs and system information.