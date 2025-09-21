import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  @Get()
  async check() {
    const isConnected = this.connection.readyState === 1;
    
    return {
      status: isConnected ? 'ok' : 'error',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness() {
    const isConnected = this.connection.readyState === 1;
    
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    return {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  liveness() {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    };
  }
}
