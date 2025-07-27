#!/bin/bash

# Emergency Responder PWA - Permission Fix Script
# Fixes common permission issues on macOS/Linux

echo "🔧 Fixing Emergency Responder PWA permissions..."
echo ""

# Remove problematic directories and files
echo "🧹 Cleaning up cache and node_modules..."
rm -rf node_modules
rm -rf .eslintcache
rm -rf build
rm -f package-lock.json

# Create temporary directories with proper permissions
echo "📁 Creating directories with correct permissions..."
mkdir -p tmp
chmod 755 tmp

# Set proper permissions for the project directory
echo "🔐 Setting project permissions..."
chmod -R 755 .
chmod +x start-pwa.sh 2>/dev/null || true
chmod +x scripts/start.js 2>/dev/null || true

# Clean npm cache
echo "🗑️  Cleaning npm cache..."
npm cache clean --force 2>/dev/null || echo "   (npm cache clean failed - this is often normal)"

# Install dependencies with proper permissions
echo "📦 Installing dependencies..."
npm install --no-optional --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Permissions fixed successfully!"
    echo ""
    echo "🚀 Ready to start the PWA:"
    echo "   npm start"
    echo "   or"
    echo "   ./start-pwa.sh"
    echo ""
    echo "🌐 PWA will run on: http://localhost:3003"
else
    echo ""
    echo "❌ Installation failed. Try these manual steps:"
    echo ""
    echo "1. Clear npm cache:"
    echo "   sudo npm cache clean --force"
    echo ""
    echo "2. Fix npm permissions:"
    echo "   sudo chown -R $(whoami) ~/.npm"
    echo ""
    echo "3. Install dependencies:"
    echo "   npm install"
    echo ""
    echo "4. Start the PWA:"
    echo "   npm start"
fi

echo ""
echo "💡 If you continue having issues:"
echo "   - Try running: sudo chown -R $(whoami) ~/.npm"
echo "   - Or use yarn instead: yarn install && yarn start"
echo "   - Or run with sudo: sudo npm start"
