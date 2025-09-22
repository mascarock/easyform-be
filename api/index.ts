import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverlessExpress from '@vendia/serverless-express';

import { createNestApp } from '../src/main';

let cachedServer: ReturnType<typeof serverlessExpress>;

async function bootstrap() {
  const app = await createNestApp();

  // Avoid calling listen(); init prepares the Nest app for handling requests in serverless.
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();

  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }

  return cachedServer(req, res);
}
