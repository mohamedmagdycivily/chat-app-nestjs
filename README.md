# Chat System

A high-performance, scalable chat system built with NestJS. Provides RESTful APIs for managing applications, chats, and messages with asynchronous processing, race condition handling, and optimized database operations.

## Overview

System allows creating applications with unique tokens. Each application contains numbered chats, and each chat contains numbered messages. Chat and message creation uses asynchronous processing via RabbitMQ with race condition handling using Redis and database transactions.

## Features

- **Application Management**: Create, update, and retrieve applications with auto-generated tokens
- **Chat Management**: Create numbered chats asynchronously (returns 202 Accepted)
- **Message Management**: Create numbered messages asynchronously (returns 202 Accepted)
- **Asynchronous Processing**: Direct message publishing to RabbitMQ for fast processing
- **Race Condition Handling**: Redis-based atomic number generation and inbox pattern for idempotent processing
- **Count Synchronization**: Cron jobs sync Redis counts to MySQL every 30 minutes

## Limitations

The following features are **not covered** in this implementation:

- **ElasticSearch Integration**: Message search with partial matching is not implemented
- **Cursor-based Pagination**: Pagination using cursors is not implemented

## Technology Stack

- **NestJS** (TypeScript) - Framework
- **MySQL 8.0** - Primary database
- **Redis 7.0** - Caching, counters, and number generation
- **RabbitMQ** - Message broker
- **Sequelize** - ORM
- **Docker & Docker Compose** - Containerization

## Quick Start

### Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd chat-app-nestjs
```

2. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

3. Start all services:

```bash
docker compose up --build
```

4. Access services:

- **API Server**: http://localhost:3001
- **Swagger UI**: http://localhost:3001/api
- **RabbitMQ Management**: http://localhost:15672

## API Documentation

- **Base URL**: http://localhost:3001/api/v1
- **Swagger UI**: http://localhost:3001/api

## Database Schema

### `apps`

- `id` (BIGINT, Primary Key)
- `token` (BIGINT, Unique)
- `name` (VARCHAR)
- `chat_count` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**

- Primary key on `id`
- Unique index on `token` (`index_apps_on_token`)

### `chats`

- `id` (BIGINT, Primary Key)
- `chat_number` (BIGINT)
- `app_id` (BIGINT, Foreign Key → `apps.id`)
- `message_count` (BIGINT)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**

- Primary key on `id`
- Unique composite index on `(app_id, chat_number)` (`index_chats_on_app_id_and_chat_number_unique`) - enforces uniqueness of chat numbers within each application

### `messages`

- `id` (BIGINT, Primary Key)
- `message_number` (BIGINT)
- `chat_id` (BIGINT, Foreign Key → `chats.id`)
- `content` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**

- Primary key on `id`
- Unique composite index on `(chat_id, message_number)` (`index_messages_on_chat_id_and_message_number_unique`) - enforces uniqueness of message numbers within each chat

### `inbox`

- `id` (INTEGER, Primary Key)
- `event_id` (BIGINT UNSIGNED, Unique)
- `event_count` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**

- Primary key on `id`
- Unique index on `event_id` (`inbox_event_id_unique`)

## System Design

### Architecture Flow

1. **Client Request** → API receives POST request
2. **Number Generation** → Get next number from Redis (atomic INCR)
3. **Direct Publish** → Publish event directly to RabbitMQ exchange
4. **202 Response** → Return immediately with generated number
5. **Event Handling** → Event handlers process asynchronously (idempotent)
6. **Count Sync** → Cron jobs sync Redis counts to MySQL every 30 minutes

### Key Patterns

- **Direct Publishing**: Events published directly to RabbitMQ for fast processing
- **Inbox Pattern**: Idempotent event processing
- **Race Condition Handling**: Redis atomic operations + database transactions

## Load Testing

```bash
# Basic load test
npm run load-test

# Heavy load test (100 concurrent users)
npm run load-test:heavy

# Extreme load test (500 concurrent users)
npm run load-test:extreme
```
