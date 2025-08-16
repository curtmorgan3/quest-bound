# Quest Bound Server Architecture

_AI Generated_

This document explains how the Quest Bound server code works, its architecture, and key components.

## Overview

The Quest Bound server is a Node.js/TypeScript application built with Express.js that provides both REST API and GraphQL endpoints. It serves as the backend for the Quest Bound digital tabletop RPG engine, handling user authentication, data persistence, file storage, and real-time communication.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server) + REST endpoints
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Real-time**: WebSocket subscriptions
- **File Storage**: Local file system with Supabase integration
- **Authentication**: JWT-based with optional auth for certain endpoints
- **Containerization**: Docker

## Project Structure

```
server/
├── src/
│   ├── app.ts                    # Main application entry point
│   ├── database/                 # Database configuration and client
│   │   ├── client.ts            # Prisma client singleton
│   │   └── prisma/              # Database schema and migrations
│   ├── infrastructure/          # Core infrastructure components
│   │   ├── authorization/       # JWT authentication and authorization
│   │   ├── cache.ts            # Redis caching utilities
│   │   ├── graphql/            # GraphQL server and schema
│   │   ├── rest/               # REST API endpoints
│   │   ├── server-helpers/     # Server utility functions
│   │   └── types.ts            # Shared TypeScript types
│   └── local-utils/            # Local development utilities
├── package.json                 # Dependencies and scripts
├── Dockerfile                  # Container configuration
└── tsconfig.json              # TypeScript configuration
```

## Application Entry Point

The server starts in `src/app.ts`, which:

1. **Initializes Express app** with CORS, JSON parsing, and static file serving
2. **Sets up middleware** for metrics, storage, and JSON handling
3. **Initializes GraphQL server** with WebSocket support for subscriptions
4. **Registers REST endpoints** for various services
5. **Sets up export routes** for data export functionality

```typescript
// Key initialization flow
const app = express();
app.use(cors());
app.use('/storage', express.static(storageDir));
app.use(express.json());

const initializeServer = async () => {
  initializeGqlServer(app); // GraphQL + WebSocket
  initializeRestfulEndpoints(app); // REST API
  registerExportRoute(app); // Data export
};
```

## Database Layer

### Prisma ORM

The server uses Prisma as the primary ORM for database operations:

- **Schema**: Defined in `src/database/prisma/schema.prisma`
- **Client**: Singleton pattern in `src/database/client.ts`
- **Migrations**: Managed through Prisma CLI

### Database Models

Key models include:

- **User**: Authentication, roles, preferences
- **Ruleset**: Game rules and content
- **Character**: Player characters and sheets
- **Image**: File storage and management
- **Companion**: AI assistant integration

### Connection Management

The database client supports both local development and production environments:

- **Local**: Direct PostgreSQL connection
- **Production**: Supabase connection pool with pgbouncer

## GraphQL Server

### Apollo Server Setup

Located in `src/infrastructure/graphql/gql-server.ts`:

- **Schema**: Loaded from `schema.graphql` file
- **Resolvers**: Defined in `resolvers.ts`
- **WebSocket**: Real-time subscriptions support
- **Context**: Authorization context for each request

### Key Features

- **Optional Authentication**: Some queries don't require auth (e.g., `EarlyAccessUser`, `StreamCharacter`)
- **Caching**: Redis-based caching with configurable ignore patterns
- **Subscriptions**: WebSocket support for real-time updates
- **Error Handling**: Stack traces disabled in production

### Schema Organization

- **Queries**: Data retrieval operations
- **Mutations**: Data modification operations
- **Subscriptions**: Real-time data streams
- **Types**: Complex data structures and relationships

## REST API

### Endpoint Structure

REST endpoints are organized in `src/infrastructure/rest/`:

- **Authentication**: Sign-in and user management
- **Storage**: File upload/download services
- **Email**: Email notification services
- **Import/Export**: Data migration utilities
- **Metrics**: Application monitoring

### Service Architecture

Each service follows a modular pattern:

- **Controllers**: Request/response handling
- **Services**: Business logic implementation
- **Middleware**: Authentication, validation, rate limiting

## Authentication & Authorization

### JWT-Based Authentication

- **Token Generation**: JWT tokens for user sessions
- **Context Injection**: Authorization context for GraphQL operations
- **Optional Auth**: Some endpoints allow unauthenticated access
- **Role-Based Access**: User roles (USER, CREATOR, PUBLISHER)

### Authorization Flow

1. **Token Extraction**: From Authorization header or WebSocket params
2. **Token Validation**: JWT verification and user lookup
3. **Context Creation**: User data and permissions injected into request context
4. **Permission Checking**: Role-based access control in resolvers

## File Storage

### Storage Service

Located in `src/infrastructure/rest/services/storage/`:

- **Local Storage**: File system storage for development
- **Supabase Integration**: Cloud storage for production
- **File Upload**: Multer-based multipart handling
- **Image Processing**: Thumbnail generation and optimization

### Storage Features

- **Directory Structure**: Organized file hierarchy
- **Access Control**: User-based file permissions
- **Storage Limits**: Configurable user storage quotas
- **File Types**: Support for images, documents, and other assets

## Caching Strategy

### Redis Integration

- **Session Storage**: User session data
- **Query Caching**: GraphQL query results
- **Rate Limiting**: API request throttling
- **Real-time Events**: WebSocket message queuing

### Cache Patterns

- **Query-Level Caching**: Individual GraphQL queries
- **User-Specific Caching**: Personalized data caching
- **Cache Invalidation**: Automatic cache updates on mutations

## Real-time Features

### WebSocket Subscriptions

- **GraphQL Subscriptions**: Real-time data updates
- **Connection Management**: WebSocket server lifecycle
- **Authentication**: Token-based WebSocket auth
- **Event Broadcasting**: Server-to-client message delivery

### Subscription Types

- **Character Updates**: Real-time character sheet changes
- **Game State**: Live game session updates
- **User Presence**: Online/offline status
- **Notifications**: System and user notifications

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Bootstrap environment
npm run bootstrap

# Start development server
npm run dev

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate:local  # Run migrations
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up --build

# Production build
npm run build:docker
```

## Environment Configuration

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_PASSWORD`: Database password
- `DATABASE_HOST`: Database host
- `PORT`: Server port (default: 8000)
- `MODE`: Environment mode (local/production)
- `JWT_SECRET`: JWT signing secret

### Optional Configuration

- `REDIS_URL`: Redis connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase API key
- `STRIPE_SECRET`: Stripe payment integration

## Performance Considerations

### Database Optimization

- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Prisma query optimization
- **Indexing**: Strategic database indexes
- **Caching**: Redis-based query caching

### API Performance

- **Rate Limiting**: Request throttling
- **Response Caching**: HTTP response caching
- **Compression**: Response compression
- **Load Balancing**: Horizontal scaling support

## Security Features

### Input Validation

- **GraphQL Validation**: Schema-based validation
- **Request Sanitization**: Input sanitization
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Prevention**: Output encoding

### Access Control

- **JWT Security**: Secure token handling
- **CORS Configuration**: Cross-origin request control
- **Rate Limiting**: Abuse prevention
- **File Upload Security**: Malicious file detection

## Monitoring & Logging

### Application Metrics

- **Health Checks**: Service health monitoring
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Sentry integration
- **Usage Analytics**: API usage statistics

### Logging Strategy

- **Structured Logging**: JSON-formatted logs
- **Error Logging**: Comprehensive error tracking
- **Request Logging**: HTTP request/response logging
- **Debug Logging**: Development debugging support

## Testing Strategy

### Test Types

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: Prisma model testing
- **End-to-End Tests**: Full workflow testing

### Test Environment

- **Test Database**: Isolated test database
- **Mock Services**: External service mocking
- **Test Data**: Fixture-based test data
- **CI/CD Integration**: Automated testing pipeline

## Deployment

### Container Strategy

- **Docker Images**: Multi-stage builds
- **Environment Separation**: Dev/staging/production
- **Health Checks**: Container health monitoring
- **Resource Limits**: Memory and CPU constraints

### Infrastructure

- **Load Balancing**: Traffic distribution
- **Auto-scaling**: Dynamic resource allocation
- **Database Migration**: Automated schema updates
- **Backup Strategy**: Data backup and recovery

## Troubleshooting

### Common Issues

- **Database Connection**: Connection pool exhaustion
- **Memory Leaks**: Long-running processes
- **File Upload Failures**: Storage quota exceeded
- **WebSocket Disconnections**: Network connectivity issues

### Debug Tools

- **GraphQL Playground**: Query testing interface
- **Database Client**: Direct database access
- **Log Analysis**: Structured log parsing
- **Performance Profiling**: Node.js profiling tools

This architecture provides a robust, scalable foundation for the Quest Bound digital tabletop RPG engine, supporting both synchronous and asynchronous operations with comprehensive security and performance considerations.
