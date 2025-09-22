# Testing Guide for EasyForm Backend

This document describes the comprehensive testing setup for the EasyForm backend, including unit tests, integration tests, and MongoDB connectivity verification.

## Test Structure

### 1. Unit Tests (`*.spec.ts`)
- **Location**: `src/modules/forms/forms.service.spec.ts`
- **Purpose**: Test individual service methods with mocked dependencies
- **Coverage**: All FormsService methods including database operations, validation, and error handling

### 2. Integration Tests (`*.integration.spec.ts`)
- **Location**: `src/modules/forms/forms.service.integration.spec.ts`
- **Purpose**: Test actual database operations with real MongoDB connection
- **Coverage**: End-to-end database operations, data persistence, and query performance

### 3. Database Connectivity Tests (`database-connectivity.spec.ts`)
- **Location**: `src/config/database-connectivity.spec.ts`
- **Purpose**: Verify MongoDB connection, configuration, and basic database operations
- **Coverage**: Connection establishment, configuration loading, and database health

### 4. E2E Tests (`*.e2e-spec.ts`)
- **Location**: `test/app.e2e-spec.ts`
- **Purpose**: Test complete API endpoints with real database
- **Coverage**: HTTP endpoints, request/response validation, and full application flow

## Test Scripts

### Available Commands

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run integration tests (requires MongoDB)
npm run test:integration

# Run database connectivity tests
npm run test:db

# Run E2E tests
npm run test:e2e

# Test MongoDB connection directly
npm run test:mongodb

# Run all tests
npm run test:all
```

## MongoDB Configuration

### Environment Variables

The application uses the following environment variables for MongoDB configuration:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/easyform
MONGODB_DATABASE=easyform

# Optional (with defaults)
NODE_ENV=development
PORT=3001
```

### Configuration Files

- **`src/config/database.config.ts`**: Database configuration using `@nestjs/config`
- **`src/app.module.ts`**: MongoDB connection setup with `@nestjs/mongoose`

## Test Database Setup

### For Integration Tests

Integration tests use a separate test database to avoid affecting production data:

```typescript
// Uses MONGODB_URI with test database
const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easyform-test';
```

### Database Cleanup

Tests automatically clean up after themselves:

```typescript
beforeEach(async () => {
  // Clear the test collection before each test
  await FormSubmission.deleteMany({});
});

afterAll(async () => {
  // Clean up test database
  await mongoose.connection.db.dropDatabase();
  await module.close();
});
```

## Test Coverage

### Unit Tests Coverage

- ✅ **Database Configuration**: MongoDB URI and database name validation
- ✅ **Document Operations**: Create, read, update, delete operations
- ✅ **Query Operations**: Find, findById, countDocuments, aggregate
- ✅ **Error Handling**: Connection errors, validation errors, timeout errors
- ✅ **Data Integrity**: Special characters, unicode, data type preservation
- ✅ **Performance**: Indexing verification, query optimization
- ✅ **Edge Cases**: Large documents, concurrent operations, empty data

### Integration Tests Coverage

- ✅ **Real Database Operations**: Actual MongoDB read/write operations
- ✅ **Data Persistence**: Verify data is correctly stored and retrieved
- ✅ **Schema Validation**: MongoDB schema enforcement
- ✅ **Aggregation Pipelines**: Complex queries and statistics
- ✅ **Performance Testing**: Query performance with real data
- ✅ **Concurrent Operations**: Multiple simultaneous database operations

### Database Connectivity Tests Coverage

- ✅ **Connection Establishment**: Verify MongoDB connection works
- ✅ **Configuration Loading**: Environment variable handling
- ✅ **Basic Operations**: Insert, find, update, delete operations
- ✅ **Error Handling**: Connection failure scenarios
- ✅ **Performance**: Large document handling, concurrent operations
- ✅ **Index Verification**: Database indexes are properly created

## Running Tests

### Prerequisites

1. **MongoDB Running**: Ensure MongoDB is running on your system
2. **Environment Variables**: Set up `.env` file with MongoDB configuration
3. **Dependencies**: Install all npm dependencies

### Quick Start

```bash
# Install dependencies
npm install

# Set up environment (copy from env.example)
cp env.example .env

# Test MongoDB connection
npm run test:mongodb

# Run all tests
npm run test:all
```

### Individual Test Suites

```bash
# Unit tests only (no MongoDB required)
npm run test

# Integration tests (requires MongoDB)
npm run test:integration

# Database connectivity tests
npm run test:db

# E2E tests (requires MongoDB)
npm run test:e2e
```

## Test Data

### Sample Form Submission

```typescript
const sampleSubmission = {
  formId: 'test-form-123',
  questions: [
    {
      id: 'name',
      type: 'text',
      title: 'What is your name?',
      required: true,
    },
    {
      id: 'email',
      type: 'email',
      title: 'What is your email?',
      required: true,
    },
  ],
  answers: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  userEmail: 'john@example.com',
  userAgent: 'Mozilla/5.0 (Test Browser)',
  ipAddress: '127.0.0.1',
};
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running: `mongod`
   - Check MONGODB_URI in `.env` file
   - Verify network connectivity

2. **Test Database Not Found**
   - Integration tests create test database automatically
   - Check MongoDB permissions

3. **Timeout Errors**
   - Increase timeout in test configuration
   - Check MongoDB performance

4. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes using the port

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test file
npm test -- forms.service.spec.ts

# Run tests with verbose output
npm test -- --verbose
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:all
        env:
          MONGODB_URI: mongodb://localhost:27017/easyform-test
```

## Performance Benchmarks

### Expected Performance

- **Unit Tests**: < 5 seconds
- **Integration Tests**: < 30 seconds
- **Database Connectivity**: < 10 seconds
- **E2E Tests**: < 60 seconds

### Memory Usage

- **Unit Tests**: ~50MB
- **Integration Tests**: ~100MB
- **Database Connectivity**: ~75MB

## Best Practices

1. **Always clean up test data** to avoid test interference
2. **Use descriptive test names** that explain what is being tested
3. **Test both success and failure scenarios**
4. **Verify data integrity** in integration tests
5. **Use real database connections** for integration tests
6. **Mock external dependencies** in unit tests
7. **Test edge cases** and error conditions
8. **Verify performance** with realistic data volumes

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate test coverage
3. Update this documentation
4. Ensure tests pass in CI/CD
5. Add performance benchmarks if applicable
