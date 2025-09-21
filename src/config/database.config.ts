import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/easyform',
  database: process.env.MONGODB_DATABASE || 'easyform',
}));
