# New Recruitment API

Example of simple recruitment system API built with TypeScript, Express.js, and SQLite.

## Features

- RESTful API for candidate management
- API versioning (v1) for backward compatibility
- Multiple job offer assignments per candidate
- Integration with Legacy API
- Pagination support for large datasets
- Rate limiting for production environments
- Request timeout and retry logic with exponential backoff (addressing Legacy API stability issues - "system hangs very often" as reported by recruitment staff :)
- Graceful shutdown handling
- Health check endpoint
- Full type safety with TypeScript
- Comprehensive test coverage

## Prerequisites

- Node.js 22+
- npm 10+

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PORT` - Server port (default: 3000)
- `LEGACY_API_URL` - Legacy API base URL (required)
- `LEGACY_API_KEY` - Legacy API authentication key (required)
- `NODE_ENV` - Environment: development, production, or test (default: development)

## Architecture

The application follows **MVC (Model-View-Controller)** pattern.

**Dependency Injection** is used  to improve testability and maintainability. Dependencies are injected through constructors, making it easy to:
- Mock services in unit tests
- Swap implementations without changing code
- Add new features without modifying existing classes

This pattern makes the codebase scalable and easier to maintain as the application grows.

## Database

The application uses SQLite with automatic migrations. Database file: `recruitment.db`

Migrations are located in `/migrations` and run automatically on startup.

## Running the Application

### Method 1: Docker Compose (Recommended)

The easiest way to run the entire system (both new-recruitment-api and legacy-api) is using Docker Compose:

```bash
# From the project root directory
docker-compose up -d
```

This will start:
- **legacy-api** on port 4040
- **recruitment-api** on port 3000

To view logs:

```bash
docker-compose logs -f recruitment-api
```

To stop all services:

```bash
docker-compose down
```

### Method 2: Local Development


1. Start the legacy-api service using Docker Compose:

```bash
docker-compose up -d legacy-api
```

2. Configure environment variables:

```bash
cp .env.example .env
```

3. Run in development mode:

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

Tests cover critical functionality including:
- Candidate creation with Legacy API integration
- Validation error handling
- Transaction rollback on Legacy API failure

## Docker

If you want to run only this service with Docker (without docker-compose):

```bash
docker build -t recruitment-api .
docker run -p 3000:3000 --env-file .env recruitment-api
```

## API Endpoints

Endpoints are versioned under `/v1` prefix to ensure backward compatibility and allow for future API evolution without breaking existing clients.

### Health Check

```http
GET /health
```

Returns server status and API version.

### Create Candidate

```http
POST /v1/candidates
Content-Type: application/json

{
  "firstName": "Jan",
  "lastName": "Kowalski",
  "email": "jan.kowalski@example.com",
  "phone": "+48123456789",
  "yearsOfExperience": 5,
  "recruiterNotes": "Great candidate with strong technical skills",
  "status": "new",
  "consentDate": "2026-01-20T10:00:00.000Z",
  "jobOfferIds": [1, 2]
}
```

**Status Values:**
- `new` - New candidate
- `in_progress` - Interview in progress
- `accepted` - Candidate accepted
- `rejected` - Candidate rejected

### Get Candidates (Paginated)

```http
GET /v1/candidates?page=1&limit=10
```

**Query Parameters:**
- `page` - Page number (default: 1, min: 1)
- `limit` - Items per page (default: 10, min: 1, max: 100)


## System Design Assumptions

### Legacy API Integration
- **Retry Mechanism**: 3 attempts with exponential backoff (200ms, 400ms, 800ms) for timeout errors (504)
- **Timeout**: 10 seconds per request to prevent indefinite hanging
- **Fail-Fast**: Non-timeout errors (4xx, 5xx) fail immediately without retries
- **Connection Pooling**: HTTP Keep-Alive with up to 50 concurrent sockets for better performance

### Transaction Safety
- **Two-Phase Save**: Candidate is saved to local database ONLY after successful Legacy API confirmation
- **Atomic Operations**: SQLite IMMEDIATE transactions ensure data consistency
- **Rollback on Failure**: If Legacy API fails, no data is persisted locally
- **Email Uniqueness**: Enforced at database level to prevent duplicates


## Performance Optimizations

- HTTP Keep-Alive for Legacy API connections
- Connection pooling (max 50 sockets)
- Request timeout (10s)
- Exponential backoff retry (3 attempts)
- Rate limiting (1000 req/15min in production)
- SQLite IMMEDIATE transactions for write consistency
- Parallel database queries where possible

## Error Handling

All errors are handled by a centralized error handler middleware:

- `400` - Validation errors
- `404` - Resource not found
- `409` - Duplicate email
- `502` - Legacy API errors
- `500` - Internal server errors
