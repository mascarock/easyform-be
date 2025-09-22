// Vercel serverless function for NestJS using ts-node
require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020'
  }
});
require('tsconfig-paths/register');

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../src/app.module');

let app;

const createApp = async () => {
  if (!app) {
    app = await NestFactory.create(AppModule);
    await app.init();
  }
  return app;
};

module.exports = async (req, res) => {
  try {
    const nestApp = await createApp();
    const expressApp = nestApp.getHttpAdapter().getInstance();
    
    // Handle the request with Express
    return new Promise((resolve, reject) => {
      expressApp(req, res, (err) => {
        if (err) {
          console.error('Express error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Error in Vercel function:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      });
    }
  }
};
