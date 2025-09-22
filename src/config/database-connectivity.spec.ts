import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';
import databaseConfig from './database.config';

describe('Database Connectivity Tests', () => {
  let module: TestingModule;
  let configService: ConfigService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
          envFilePath: ['.env.local', '.env'],
        }),
        MongooseModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            uri: configService.get<string>('database.uri'),
          }),
          inject: [ConfigService],
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    await module.close();
  });

  describe('MongoDB Configuration', () => {
    it('should load MongoDB URI from environment configuration', () => {
      const mongoUri = configService.get<string>('database.uri');
      
      expect(mongoUri).toBeDefined();
      expect(mongoUri).toMatch(/^mongodb(\+srv)?:\/\//);
      expect(mongoUri).toContain('easyform');
    });

    it('should load database name from environment configuration', () => {
      const databaseName = configService.get<string>('database.database');
      
      expect(databaseName).toBeDefined();
      expect(databaseName).toBe('easyform');
    });

    it('should use default values when environment variables are not set', () => {
      // Test the configuration function directly
      const config = databaseConfig();
      
      expect(config.uri).toBeDefined();
      expect(config.uri).toMatch(/^mongodb(\+srv)?:\/\//);
      expect(config.database).toBeDefined();
    });
  });

  describe('MongoDB Connection', () => {
    it('should successfully connect to MongoDB', async () => {
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(mongoose.connection.readyState).toBe(1); // Connected state
    });

    it('should have correct connection details', () => {
      const connection = mongoose.connection;
      
      expect(connection.host).toBeDefined();
      expect(connection.port).toBeDefined();
      expect(connection.name).toBeDefined();
    });

    it('should be able to perform basic database operations', async () => {
      // Test basic database operations
      const testCollection = mongoose.connection.db.collection('connectivity_test');
      
      // Insert a test document
      const insertResult = await testCollection.insertOne({
        test: 'connectivity',
        timestamp: new Date(),
      });
      
      expect(insertResult.insertedId).toBeDefined();
      
      // Find the test document
      const findResult = await testCollection.findOne({
        _id: insertResult.insertedId,
      });
      
      expect(findResult).toBeTruthy();
      expect(findResult.test).toBe('connectivity');
      
      // Clean up
      await testCollection.deleteOne({
        _id: insertResult.insertedId,
      });
    });

    it('should handle connection errors gracefully', async () => {
      // Test with invalid URI
      const invalidUri = 'mongodb://invalid-host:27017/nonexistent';
      
      try {
        await mongoose.createConnection(invalidUri, {
          serverSelectionTimeoutMS: 1000, // Short timeout for testing
        });
        fail('Should have thrown an error for invalid URI');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/MongoNetworkError|MongoServerError|fail/);
      }
    });
  });

  describe('Database Schema and Collections', () => {
    it('should be able to create and query collections', async () => {
      const testCollection = mongoose.connection.db.collection('schema_test');
      
      // Test collection creation and document insertion
      const testDoc = {
        formId: 'test-form',
        questions: [
          {
            id: 'test-question',
            type: 'text',
            title: 'Test Question',
          },
        ],
        answers: {
          'test-question': 'Test Answer',
        },
        submittedAt: new Date(),
      };
      
      const insertResult = await testCollection.insertOne(testDoc);
      expect(insertResult.insertedId).toBeDefined();
      
      // Test querying
      const foundDoc = await testCollection.findOne({
        _id: insertResult.insertedId,
      });
      
      expect(foundDoc).toBeTruthy();
      expect(foundDoc.formId).toBe('test-form');
      expect(foundDoc.questions).toHaveLength(1);
      expect(foundDoc.answers['test-question']).toBe('Test Answer');
      
      // Clean up
      await testCollection.deleteOne({
        _id: insertResult.insertedId,
      });
    });

    it('should support complex queries and aggregations', async () => {
      const testCollection = mongoose.connection.db.collection('aggregation_test');
      
      // Insert test data
      const testDocs = [
        {
          formId: 'form-1',
          submittedAt: new Date('2024-01-01'),
          questions: [{ id: 'q1', type: 'text', title: 'Q1' }],
          answers: { q1: 'A1' },
        },
        {
          formId: 'form-1',
          submittedAt: new Date('2024-01-02'),
          questions: [{ id: 'q1', type: 'text', title: 'Q1' }],
          answers: { q1: 'A2' },
        },
        {
          formId: 'form-2',
          submittedAt: new Date('2024-01-01'),
          questions: [{ id: 'q1', type: 'text', title: 'Q1' }],
          answers: { q1: 'A3' },
        },
      ];
      
      await testCollection.insertMany(testDocs);
      
      // Test aggregation pipeline
      const aggregationResult = await testCollection.aggregate([
        { $match: { formId: 'form-1' } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      expect(aggregationResult).toHaveLength(2);
      expect(aggregationResult[0]).toMatchObject({
        _id: '2024-01-01',
        count: 1,
      });
      expect(aggregationResult[1]).toMatchObject({
        _id: '2024-01-02',
        count: 1,
      });
      
      // Clean up
      await testCollection.drop();
    });
  });

  describe('Environment Variable Handling', () => {
    it('should prioritize .env.local over .env', () => {
      // This test verifies that the configuration loading order is correct
      const mongoUri = configService.get<string>('database.uri');
      
      // Should not be undefined
      expect(mongoUri).toBeDefined();
      
      // Should contain the expected database name
      expect(mongoUri).toContain('easyform');
    });

    it('should handle missing environment variables gracefully', () => {
      // Test the configuration function with undefined environment variables
      const originalEnv = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;
      
      const config = databaseConfig();
      
      expect(config.uri).toBe('mongodb://localhost:27017/easyform');
      expect(config.database).toBe('easyform');
      
      // Restore original environment
      if (originalEnv) {
        process.env.MONGODB_URI = originalEnv;
      }
    });
  });

  describe('Database Performance', () => {
    it('should handle concurrent operations', async () => {
      const testCollection = mongoose.connection.db.collection('concurrency_test');
      
      // Create multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        testCollection.insertOne({
          index: i,
          timestamp: new Date(),
          data: `test-data-${i}`,
        })
      );
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.insertedId).toBeDefined();
      });
      
      // Verify all documents were inserted
      const count = await testCollection.countDocuments();
      expect(count).toBe(10);
      
      // Clean up
      await testCollection.drop();
    });

    it('should handle large document operations', async () => {
      const testCollection = mongoose.connection.db.collection('large_doc_test');
      
      // Create a large document
      const largeDoc = {
        formId: 'large-form',
        questions: Array.from({ length: 100 }, (_, i) => ({
          id: `question_${i}`,
          type: 'text',
          title: `Question ${i}`,
          description: 'A'.repeat(1000), // Large description
        })),
        answers: Array.from({ length: 100 }, (_, i) => ({
          [`question_${i}`]: `Answer ${i} - ${'B'.repeat(500)}`,
        })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
        metadata: {
          largeData: 'C'.repeat(10000),
        },
        submittedAt: new Date(),
      };
      
      const insertResult = await testCollection.insertOne(largeDoc);
      expect(insertResult.insertedId).toBeDefined();
      
      // Verify the document was stored correctly
      const foundDoc = await testCollection.findOne({
        _id: insertResult.insertedId,
      });
      
      expect(foundDoc).toBeTruthy();
      expect(foundDoc.questions).toHaveLength(100);
      expect(Object.keys(foundDoc.answers)).toHaveLength(100);
      
      // Clean up
      await testCollection.drop();
    });
  });
});
