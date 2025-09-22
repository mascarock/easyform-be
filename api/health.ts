import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'EasyForm API is running without ts-node',
    version: '1.0.1'
  });
}