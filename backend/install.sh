#!/bin/bash

# Drishti Backend Installation Script
# This script sets up the backend server for Vertex AI integration

set -e  # Exit on any error

echo "🚀 Setting up Drishti Backend for Vertex AI Integration..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env configuration file..."
    cat > .env << EOF
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Created .env file - Please update with your Google Cloud configuration"
else
    echo "⚠️  .env file already exists - skipping creation"
fi

# Create service account key placeholder
if [ ! -f "service-account-key.json" ]; then
    echo "📝 Creating service account key placeholder..."
    cat > service-account-key.json << EOF
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
EOF
    echo "⚠️  Created service-account-key.json placeholder - Replace with your actual service account key"
fi

# Test the installation
echo "🧪 Testing backend installation..."
if npm run test > /dev/null 2>&1; then
    echo "✅ Backend tests passed"
else
    echo "⚠️  Backend tests not configured or failed - this is okay for initial setup"
fi

# Check if gcloud CLI is installed
if command -v gcloud &> /dev/null; then
    echo "✅ Google Cloud CLI detected"
    echo "📋 Current gcloud configuration:"
    gcloud config list --format="table(core.project,core.account)"
else
    echo "⚠️  Google Cloud CLI not found. Install it for easier project management:"
    echo "   https://cloud.google.com/sdk/docs/install"
fi

echo ""
echo "🎉 Backend installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your Google Cloud Project ID"
echo "2. Replace service-account-key.json with your actual service account key"
echo "3. Enable Vertex AI API in your Google Cloud project"
echo "4. Start the backend server: npm run dev"
echo ""
echo "📚 For detailed setup instructions, see: ../VERTEX_AI_SETUP.md"
echo ""
echo "🔧 Quick commands:"
echo "   Start development server: npm run dev"
echo "   Start production server:  npm start"
echo "   Check configuration:      curl http://localhost:5000/api/config/check"
echo "   Health check:             curl http://localhost:5000/api/health"
echo ""
echo "⚠️  Security reminder: Never commit service-account-key.json to version control!"
