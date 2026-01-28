# CreatorSync AI Coding Agent Instructions

## Architecture Overview

**Hybrid Stack**: This is a dual-platform codebase combining Node.js/Express backend with ASP.NET Core services for streaming API integrations.

- **Primary Backend**: Node.js Express server (`server/server.js`) handles beat marketplace, real-time collaboration, payments
- **Secondary Services**: ASP.NET Core (`Services/`, `Configuration/`) provides Twitch/YouTube API integrations with resilience patterns
- **Frontend**: Vanilla JS with Socket.IO for real-time features (`public/`)
- **Data Flow**: Express → Redis caching → MongoDB → Socket.IO real-time updates

## Critical Patterns

### Dual Authentication System
- **REST API**: JWT tokens via `server/middleware/auth.js` - Bearer token in Authorization header
- **WebSockets**: Socket.IO authentication via `socketAuth` middleware - token passed during connection
- Both systems use same JWT_SECRET and user payload structure: `{userId, username, email, role, subscription}`

### Service Layer (.NET)
- All services are **sealed classes** implementing interfaces (see `Services/ITwitchApiService.cs`)
- Use Polly for HTTP resilience: retry + circuit breaker patterns configured in `Extensions/ServiceCollectionExtensions.cs`
- Configuration with FluentValidation: Settings classes in `Configuration/` validated on startup
- Never instantiate services directly - always use DI via `AddApplicationServices()`

### Real-Time Collaboration
- Socket.IO handles multi-user audio editing sessions via `server/server.js`
- Collaboration state stored in `activeCollaborations` Map - ephemeral, not persisted
- Events: `join_collaboration`, `audio_update`, `beat_modified` - see line ~245 in server.js
- Always emit to room, not broadcast: `io.to(collaborationId).emit()`

### Rate Limiting Strategy
Different limiters for different endpoints (see `middleware/rateLimiter.js`):
- `apiLimiter`: General API (100 req/15min)
- `authLimiter`: Login/register (5 req/15min)
- `uploadLimiter`: File uploads (10 req/hour)
- `paymentLimiter`: Payment endpoints (20 req/15min)

### Logging with Winston
- Structured logging via `server/utils/logger.js` - use logger methods, not console.log
- Multiple transports: `error.log`, `combined.log`, `exceptions.log`
- Log format: JSON with timestamps - always include context metadata
- Security events use `securityLogger()` helper

## Development Workflows

### Running Locally
```bash
# Node.js backend
npm start              # Production
npm run dev            # Development with nodemon

# .NET services (if needed)
dotnet run             # From project root

# Docker (full stack)
npm run docker:up      # Start all services
npm run docker:logs    # View logs
```

### Testing
```bash
npm test               # Run all tests with coverage (70% threshold)
npm run test:unit      # Unit tests only
npm run test:watch     # Watch mode for TDD
```

### Code Quality
- ESLint configured with Standard style - run `npm run lint:fix` before commits
- Jest tests required for new features - mock external services
- All .NET code uses global usings from `GlobalUsings.cs`

## Key Integration Points

### Stripe Payment Flow
1. Frontend calls `/api/payments/create-intent` (see `server/routes/payments.js`)
2. Stripe webhook validates payment at `/api/payments/webhook`
3. Beat ownership updated in database after successful payment
4. Notification sent via NotificationManager to both buyer and seller

### Translation System
- Translations in `translations/{lang}.json` - currently EN, DE, ES, FR
- Server detects language from `Accept-Language` header or `?lang=` query
- Use `translationManager.getTranslation(lang, key)` - never hardcode strings in responses

### Audio Processing Pipeline
- Uploads via multer to `public/uploads/` directory
- Audio metadata extraction using `music-metadata` library
- FFmpeg processing for format conversion (see `server/utils/audioProcessor.js`)
- Waveform generation for player visualization

## Configuration Management

### Environment Variables (.env required)
```
JWT_SECRET, STRIPE_SECRET_KEY, MONGODB_URI, REDIS_URL
TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
YOUTUBE_API_KEY
```

### .NET appsettings.json
Configuration sections: `Twitch`, `YouTube` - validated by FluentValidation on startup
If validation fails, app crashes immediately - fix config before debugging

## Common Pitfalls

- **Don't** use `console.log` - use Winston logger
- **Don't** create new HttpClient instances - use IHttpClientFactory in .NET services
- **Don't** forget rate limiting when adding new routes - apply appropriate middleware
- **Don't** store collaboration data in database - it's in-memory only
- **Always** validate user subscription level before granting access to premium features (The Finisher)
- **Always** use `sealed` keyword on .NET service classes
- **Always** authenticate WebSocket connections before allowing collaboration events

## File Organization

- `server/routes/` - REST API endpoints (beats, auth, payments, etc.)
- `server/middleware/` - Express middleware (auth, rate limiting)
- `server/utils/` - Shared utilities (logger, cache, email, audio processing)
- `Services/` - .NET API integration services (Twitch, YouTube)
- `Configuration/` - .NET settings classes with validation
- `public/` - Static frontend files and uploads

## When Adding New Features

1. Add route in appropriate `server/routes/*.js` file
2. Apply rate limiting middleware based on endpoint sensitivity
3. Add authentication if endpoint requires user context
4. Update Swagger docs (JSDoc comments for auto-generation)
5. Add Winston logging for important operations
6. Write Jest tests (unit + integration)
7. Update translations if feature has user-facing messages
