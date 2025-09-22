# EasyForm Backend

A highly secure and robust backend service for handling form submissions from the EasyForm frontend. Built with NestJS, MongoDB, and comprehensive security features. 
## Features

- 🔒 **High Security**: Input validation, sanitization, rate limiting, and CORS protection
- 📊 **MongoDB Integration**: NoSQL database with optimized schemas and indexing
- 🚀 **NestJS Framework**: Scalable, maintainable, and well-structured codebase
- ✅ **Comprehensive Testing**: Unit tests and end-to-end tests with high coverage
- 📈 **Monitoring**: Health checks, logging, and request tracking
- 🛡️ **Input Validation**: Strict validation using class-validator and custom validators
- ⚡ **Performance**: Compression, caching, and optimized database queries

## API Endpoints

### Form Submission
- `POST /api/v1/forms/submit` - Submit a new form
- `GET /api/v1/forms/submissions` - Get form submissions (with pagination)
- `GET /api/v1/forms/submissions/:id` - Get specific form submission
- `GET /api/v1/forms/statistics` - Get form statistics

### Health Checks
- `GET /api/v1/health` - Overall health status
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe

## Data Models

### Question Types
- `text` - Free text input
- `email` - Email input with validation
- `multiple-choice` - Single selection from options

### Form Submission Structure
```typescript
{
  formId?: string;
  questions: Question[];
  answers: Record<string, any>;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  submittedAt?: string;
}
```

## Security Features

1. **Input Validation**: Comprehensive validation using class-validator
2. **Input Sanitization**: XSS protection and data cleaning
3. **Rate Limiting**: Configurable request throttling
4. **CORS Protection**: Configurable cross-origin resource sharing
5. **Helmet Security**: Security headers and protection
6. **Request Logging**: Detailed request/response logging
7. **Error Handling**: Structured error responses

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

3. Configure your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/easyform
MONGODB_DATABASE=easyform
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_QUESTIONNAIRE_LENGTH=50
MAX_ANSWER_LENGTH=1000
```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## Database Setup

The application uses MongoDB. Make sure you have MongoDB running locally or provide a connection string in your environment variables.

### MongoDB Indexes
The application automatically creates the following indexes for optimal performance:
- `formId` + `submittedAt` (compound)
- `userEmail` + `submittedAt` (compound)
- `submittedAt` (single)

## API Usage Examples

### Submit a Form
```bash
curl -X POST http://localhost:3001/api/v1/forms/submit \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "id": "name",
        "type": "text",
        "title": "What is your name?",
        "required": true
      }
    ],
    "answers": {
      "name": "John Doe"
    },
    "userEmail": "john@example.com"
  }'
```

### Get Form Submissions
```bash
curl "http://localhost:3001/api/v1/forms/submissions?limit=10&offset=0"
```

### Get Form Statistics
```bash
curl "http://localhost:3001/api/v1/forms/statistics"
```

## Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "statusCode": 400,
  "timestamp": "2023-01-01T00:00:00.000Z",
  "path": "/api/v1/forms/submit"
}
```

## Monitoring and Logging

- All requests are logged with timing information
- Health checks are available for monitoring
- Error tracking with stack traces
- Request/response logging for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the ISC License.
