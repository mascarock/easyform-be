#!/bin/bash

# EasyForm Backend Vercel Deployment Script

echo "🚀 Starting EasyForm Backend Deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Build the application
echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found. Please ensure it exists in the root directory."
    exit 1
fi

echo "✅ vercel.json found!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure environment variables in Vercel dashboard"
    echo "2. Test the health endpoint: https://your-app.vercel.app/api/v1/health"
    echo "3. Test form submission: https://your-app.vercel.app/api/v1/forms/submit"
    echo ""
    echo "📖 See VERCEL_DEPLOYMENT.md for detailed instructions"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
