import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { FormsModule } from './modules/forms/forms.module';
import { HealthModule } from './modules/health/health.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/easyform',
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{
        ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
        limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
      }],
    }),
    FormsModule,
    HealthModule,
  ],
})
export class AppModule {}
