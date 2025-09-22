# Vercel Deployment Guide for EasyForm Backend

This guide explains how to deploy the EasyForm NestJS backend to Vercel.

## Prerequisites

1. Vercel account
2. MongoDB Atlas database (or other MongoDB instance)
3. Environment variables configured

## Deployment Steps

### 1. Build the Application

```bash
npm run build
```

This creates the `dist/` directory with compiled JavaScript files.

### 2. Configure Vercel

The `vercel.json` file is configured for NestJS deployment using Vercel's serverless functions:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

This configuration:
- Uses `@vercel/node` runtime for serverless functions
- Routes all requests to the `/api/index.js` function
- Avoids the "public directory" error by using proper serverless function structure

### 3. Environment Variables

Configure these environment variables in your Vercel project settings:

#### Required Variables

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/easyform?retryWrites=true&w=majority
MONGODB_DATABASE=easyform

# Server
NODE_ENV=production
PORT=3001

# CORS (update with your frontend domain)
CORS_ORIGIN=https://your-frontend-domain.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Validation
MAX_QUESTIONNAIRE_LENGTH=50
MAX_ANSWER_LENGTH=1000
```

#### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the appropriate value
4. Make sure to set them for "Production" environment

### 4. Deploy

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Vercel will automatically deploy on every push to main branch

### 5. Verify Deployment

After deployment, test these endpoints:

- **Health Check**: `https://your-app.vercel.app/api/v1/health`
- **Form Submission**: `https://your-app.vercel.app/api/v1/forms/submit`

## API Endpoints

Once deployed, your API will be available at:

- `https://your-app.vercel.app/api/v1/health` - Health check
- `https://your-app.vercel.app/api/v1/forms/submit` - Submit form
- `https://your-app.vercel.app/api/v1/forms/submissions` - Get submissions
- `https://your-app.vercel.app/api/v1/forms/statistics` - Get statistics

## Troubleshooting

### Common Issues

1. **"No Output Directory named 'public' found"**
   - This is fixed by the `vercel.json` configuration
   - Make sure `vercel.json` is in the root directory

2. **MongoDB Connection Issues**
   - Verify `MONGODB_URI` is correctly set
   - Ensure MongoDB Atlas allows connections from Vercel IPs
   - Check if your MongoDB cluster is running

3. **CORS Issues**
   - Update `CORS_ORIGIN` to match your frontend domain
   - Ensure the frontend is making requests to the correct API URL

4. **Build Failures**
   - Make sure all dependencies are in `dependencies` (not `devDependencies`)
   - Check that TypeScript compilation succeeds locally

### Debugging

1. Check Vercel function logs in the dashboard
2. Use the health endpoint to verify database connectivity
3. Test locally with production environment variables

## Performance Considerations

- Vercel has a 30-second timeout for serverless functions
- MongoDB connection pooling is handled automatically
- Consider using MongoDB Atlas for better performance and reliability

## Security

- Never commit `.env` files to version control
- Use strong MongoDB credentials
- Configure CORS properly for production
- Consider adding API authentication if needed

## Monitoring

- Monitor function execution time in Vercel dashboard
- Set up MongoDB Atlas monitoring
- Use the health endpoint for uptime monitoring
