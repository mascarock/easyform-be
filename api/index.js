const { NestFactory } = require('@nestjs/core');

let app;

const createApp = async () => {
  if (!app) {
    // Use ts-node to compile TypeScript at runtime
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    });

    // Import the TypeScript AppModule
    const { AppModule } = require('../src/app.module');

    app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log']
    });

    app.enableCors({
      origin: true,
      credentials: true
    });

    await app.init();
  }
  return app;
};

module.exports = async (req, res) => {
  try {
    const nestApp = await createApp();
    const expressApp = nestApp.getHttpAdapter().getInstance();

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