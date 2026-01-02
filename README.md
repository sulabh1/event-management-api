# Architecture Document

## Event Management API

### System Overview

The Event Management API is a production-ready RESTful service built with NestJS, PostgreSQL, and Redis. It provides comprehensive event management capabilities with real-time seat availability, concurrent booking handling, and role-based access control.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [API Endpoints](#2-api-endpoints)
3. [Setup & Deployment Flow](#3-setup--deployment-flow)
4. [Database Schema Design](#4-database-schema-design)
5. [Concurrency Handling](#5-concurrency-handling)
6. [Caching Strategy](#6-caching-strategy)
7. [Security Implementation](#7-security-implementation)
8. [Trade-offs & Design Decisions](#8-trade-offs--design-decisions)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│     NestJS Application          │
│  ┌──────────────────────────┐  │
│  │  Rate Limiting Middleware│  │
│  └──────────┬───────────────┘  │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │   JWT Auth Guard         │  │
│  └──────────┬───────────────┘  │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │   Controllers Layer      │  │
│  │  (Auth/Events/Users)     │  │
│  └──────────┬───────────────┘  │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │   Services Layer         │  │
│  │  (Business Logic)        │  │
│  └──────────┬───────────────┘  │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │   Repository Layer       │  │
│  │  (TypeORM)              │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
        ┌─────┴─────┐
        ▼           ▼
┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │
│ Database │  │  Cache   │
└──────────┘  └──────────┘
```

### Component Layers

- **Middleware Layer**: Rate limiting, logging, CORS
- **Authentication Layer**: JWT validation, role-based guards
- **Controller Layer**: HTTP request handling, validation
- **Service Layer**: Core business logic, transaction management
- **Repository Layer**: Database operations via TypeORM
- **Cache Layer**: Redis for performance optimization

---

## 2. API Endpoints

### 2.1 Authentication Endpoints

#### Register User

```
POST /api/auth/register
Body: { name, email, password, role? }
Response: { user, token }
Access: Public
```

#### Login

```
POST /api/auth/login
Body: { email, password }
Response: { user, token }
Access: Public
```

### 2.2 Event Management Endpoints

#### List All Events

```
GET /api/events?page=1&limit=10&search=concert&date_from=2024-01-01&date_to=2024-12-31&available_only=true&sort=date
Query Parameters:
  - page: Page number (default: 1)
  - limit: Items per page (default: 10)
  - search: Search by title (partial match)
  - date_from: Filter events from date
  - date_to: Filter events until date
  - available_only: Show only events with available seats
  - sort: Sort by (date|title|available_seats)
Response: { data: Event[], total, page, limit }
Access: Public
```

#### Get Event Details

```
GET /api/events/:id
Response: Event object with registration count
Access: Public
```

#### Create Event

```
POST /api/events
Body: { title, description, date, venue, total_seats }
Response: Created event
Access: Admin only
```

#### Update Event

```
PUT /api/events/:id
Body: { title?, description?, date?, venue?, total_seats? }
Response: Updated event
Access: Admin only
```

#### Delete Event

```
DELETE /api/events/:id
Response: Success message
Access: Admin only
```

### 2.3 Registration Endpoints

#### Register for Event

```
POST /api/events/:id/register
Response: Registration object
Access: Authenticated users
Note: Prevents double registration, checks seat availability
```

#### Cancel Registration

```
DELETE /api/events/:id/register
Response: Success message
Access: Authenticated users
```

#### Get Event Registrations

```
GET /api/events/:id/registrations
Response: Array of registrations with user details
Access: Admin only
```

#### Get User's Registrations

```
GET /api/users/me/registrations
Response: Array of user's registrations with event details
Access: Authenticated users
```

### 2.4 User Endpoints

#### Get User Profile

```
GET /api/users/me
Response: User object
Access: Authenticated users
```

#### Update Profile

```
PUT /api/users/me
Body: { name?, email? }
Response: Updated user
Access: Authenticated users
```

---

## 3. Setup & Deployment Flow

### 3.1 Development Setup

#### Prerequisites Check

```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify PostgreSQL
psql --version  # Should be 15+

# Verify Redis
redis-cli --version  # Should be 7+
```

#### Installation Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd event-management-api

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Create database
createdb event_management

# 5. Run migrations
npm run migration:run

# 6. (Optional) Seed initial data
npm run seed

# 7. Start development server
npm run start:dev
```

### 3.2 Docker Setup (Recommended)

```bash
# 1. Clone and navigate
git clone <repository-url>
cd event-management-api

# 2. Start all services
docker-compose up -d

# 3. View logs
docker-compose logs -f api

# 4. Access application
# API: http://localhost:3000
# Swagger: http://localhost:3000/api
```

### 3.3 Production Deployment

```bash
# 1. Build application
npm run build

# 2. Run migrations
npm run migration:run

# 3. Start production server
npm run start:prod

# With PM2 (recommended)
pm2 start dist/main.js --name event-api
```

### 3.4 Request Flow Example

```
User Registration Flow:
1. POST /api/auth/register → Register new user
2. Password hashed with bcrypt (10 rounds)
3. User stored in database
4. JWT token generated and returned
5. Client stores token in localStorage/cookie

Event Registration Flow:
1. GET /api/events → Browse available events
2. POST /api/events/:id/register (with JWT in Authorization header)
3. Rate limiter checks request count (100/min)
4. JWT middleware validates token
5. Service checks seat availability
6. Database transaction begins
7. Event row locked (SELECT FOR UPDATE)
8. Seat decremented, registration created
9. Transaction committed
10. Cache invalidated for event
11. Success response returned
```

---

## 4. Database Schema Design

### Entity Relationship Diagram

```
┌──────────────────┐
│      Users       │
├──────────────────┤
│ id (PK)          │
│ name             │
│ email (UNIQUE)   │
│ password (hashed)│
│ role             │
│ created_at       │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│  Registrations   │ N:1   │     Events       │
├──────────────────┤───────├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ user_id (FK)     │       │ title            │
│ event_id (FK)    │       │ description      │
│ registration_date│       │ date             │
│ status           │       │ venue            │
│ created_at       │       │ total_seats      │
└──────────────────┘       │ available_seats  │
                           │ created_at       │
                           │ updated_at       │
                           └──────────────────┘
```

### Indexing Strategy

```sql
-- Primary indexes (automatic)
CREATE INDEX idx_users_email ON users(email);

-- Event queries
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_available_seats ON events(available_seats);

-- Registration queries
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE UNIQUE INDEX idx_registrations_unique ON registrations(user_id, event_id);
```

**Rationale**: These indexes optimize common queries: user lookup by email (login), events by date (filtering), and registration lookups (checking user bookings). The unique composite index prevents duplicate registrations at the database level.

---

## 5. Concurrency Handling

### Pessimistic Locking Implementation

```typescript
// Pseudocode demonstrating the approach
async registerForEvent(userId: number, eventId: number) {
  return this.dataSource.transaction(async (manager) => {
    // 1. Lock the event row
    const event = await manager
      .createQueryBuilder(Event, 'event')
      .where('event.id = :eventId', { eventId })
      .setLock('pessimistic_write')  // FOR UPDATE lock
      .getOne();

    // 2. Check availability
    if (event.available_seats <= 0) {
      throw new ConflictException('No seats available');
    }

    // 3. Check duplicate registration
    const existing = await manager.findOne(Registration, {
      where: { user_id: userId, event_id: eventId }
    });
    if (existing) {
      throw new ConflictException('Already registered');
    }

    // 4. Decrement seats and create registration
    event.available_seats -= 1;
    await manager.save(event);

    const registration = manager.create(Registration, {
      user_id: userId,
      event_id: eventId
    });
    return manager.save(registration);
  });
}
```

**Race Condition Prevention**: The `pessimistic_write` lock ensures that when User A is registering, User B's request waits until User A's transaction completes. This prevents both users from seeing "1 seat available" and both successfully booking when only 1 seat exists.

**Alternative Considered**: Optimistic locking with version columns was rejected due to increased retry logic complexity and poor user experience under high contention.

---

## 6. Caching Strategy

### Cache Architecture

```
Request Flow with Cache:

GET /api/events/:id
    │
    ▼
Check Redis: events:detail:123
    │
    ├─ Cache HIT ──────► Return cached data
    │
    └─ Cache MISS
          │
          ▼
    Query PostgreSQL
          │
          ▼
    Store in Redis (TTL: 10min)
          │
          ▼
    Return data
```

### Cache Implementation

**Cache Keys**:

- `events:list:{page}:{limit}:{filters}` - Event listings (TTL: 5min)
- `events:detail:{id}` - Individual events (TTL: 10min)
- `user:registrations:{userId}` - User's registrations (TTL: 15min)

**Invalidation Strategy**:

```typescript
// On event update/delete
await redis.del(`events:detail:${eventId}`);
await redis.del('events:list:*'); // Clear all list caches

// On registration/cancellation
await redis.del(`events:detail:${eventId}`); // Seat count changed
await redis.del(`user:registrations:${userId}`);
```

**Rationale**: Event data has high read frequency but low write frequency (1000 reads : 1 write ratio). Caching reduces database load by 80-90%. Short TTLs ensure seat availability is reasonably fresh while invalidation on writes guarantees accuracy.

---

## 7. Security Implementation

### Authentication Flow

1. User submits credentials → bcrypt verification
2. JWT generated with payload: `{ userId, email, role }`
3. Token signed with secret key (HS256 algorithm)
4. Client includes token in `Authorization: Bearer <token>` header
5. JWT Guard validates token on protected routes
6. Role Guard checks user permissions for admin routes

### Security Measures

- **Password Security**: bcrypt with 10 salt rounds
- **SQL Injection**: TypeORM parameterized queries
- **Rate Limiting**: 100 requests/minute per IP address
- **Input Validation**: Class-validator DTOs validate all inputs
- **CORS**: Configured for specific origins in production
- **Helmet**: Security headers (XSS, CSP, HSTS)

---

## 8. Trade-offs & Design Decisions

### Decision 1: Monolithic vs Microservices

**Choice**: Monolithic NestJS application  
**Rationale**: Simpler deployment, lower operational overhead, sufficient for current scale  
**Trade-off**: Harder to scale individual components independently  
**Future Path**: Modular structure allows extraction into microservices if needed

### Decision 2: Pessimistic Locking

**Choice**: Database-level row locking  
**Rationale**: Guarantees no overbooking, simpler error handling  
**Trade-off**: Lower throughput under extreme concurrent load  
**Consideration**: Booking accuracy is more critical than maximum throughput

### Decision 3: Cache TTL Strategy

**Choice**: Aggressive cache invalidation + short TTLs  
**Rationale**: Balance between performance and data freshness  
**Trade-off**: More cache misses but guaranteed accuracy  
**Consideration**: Showing wrong seat availability damages user trust

### Decision 4: JWT Stateless Authentication

**Choice**: Stateless JWT tokens  
**Rationale**: Enables horizontal scaling without session store  
**Trade-off**: Cannot instantly revoke tokens (must wait for expiry)  
**Mitigation**: Short token expiry (24 hours) + refresh token strategy

---

## Scalability Considerations

**Horizontal Scaling**: Stateless design allows adding API server instances behind load balancer (Nginx/AWS ALB).

**Database Scaling**:

- Read replicas for GET requests
- Connection pooling (10 connections per instance)
- Prepared statements for query optimization

**Cache Scaling**: Redis Cluster for distributed caching across multiple nodes.

**Future Enhancements**:

- WebSocket for real-time seat updates
- Message queue (Bull/RabbitMQ) for async operations
- CDN for static assets
- Database sharding by event date for historical data

---

## Error && Logger

- **Logging**: Structured JSON logs with Winston
- **Error Tracking**: Centralized error handling middleware

---

## Conclusion

This architecture delivers a production-ready event management system with robust concurrency handling, intelligent caching, and comprehensive security. The modular design enables future enhancements while maintaining code quality and operational simplicity.
