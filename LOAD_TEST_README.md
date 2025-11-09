# Load Testing Script

This script performs high-load testing on the chat application by simulating multiple concurrent users performing various operations.

## Features

### Eventual Consistency Handling

The script automatically handles eventual consistency for chats and messages:

- Chats and messages are created asynchronously (202 Accepted)
- The script retries with delays when entities are not immediately available
- Configurable retry attempts and delays

### Workflow

The load test script simulates the following workflow for each user:

1. **Create an App** - Creates a new application
2. **Find the App** - Retrieves the created app by token
3. **Create a Chat** - Creates a new chat in the app
4. **Find the Chat** - Retrieves the created chat by chat number
5. **Get All Chats** - Retrieves all chats for the app
6. **Create Messages** - Creates multiple messages in the chat
7. **Find Messages** - Retrieves individual messages by message number
8. **Get All Messages** - Retrieves all messages for the chat

This workflow is repeated multiple times per user, with multiple users running concurrently.

## Usage

### Basic Usage

```bash
npm run load-test
```

### Create Only Mode

To run only create operations (skip all find/read operations), use:

```bash
npm run load-test:create-only
```

Or with environment variable:

```bash
CREATE_ONLY=true npm run load-test
```

This mode is useful for:
- Testing write performance only
- Generating data quickly without reading it back
- Reducing test execution time

### With Environment Variables

You can customize the load test behavior using environment variables:

```bash
BASE_URL=http://localhost:4000 \
CONCURRENT_USERS=20 \
OPERATIONS_PER_USER=10 \
MESSAGES_PER_CHAT=50 \
TIMEOUT=60000 \
npm run load-test
```

### Environment Variables

- `BASE_URL` - Base URL of the API server (default: `http://localhost:3001`)
- `CONCURRENT_USERS` - Number of concurrent users to simulate (default: `10`)
- `OPERATIONS_PER_USER` - Number of complete workflows per user (default: `5`)
- `MESSAGES_PER_CHAT` - Number of messages to create per chat (default: `10`)
- `TIMEOUT` - Request timeout in milliseconds (default: `30000`)
- `CONSISTENCY_RETRIES` - Number of retries for eventual consistency (default: `10`)
- `CONSISTENCY_DELAY` - Delay between retries in milliseconds (default: `500`)
- `CREATE_ONLY` - If set to `true`, only runs create operations (skips find/read operations) (default: `false`)

## Example Output

The script provides detailed statistics including:

- Total operations performed
- Success and failure rates
- Operations per second
- Per-user statistics (apps, chats, messages created)
- Error summary

## High Load Testing

### Pre-configured Heavy Load Tests

The package includes pre-configured scripts for heavy load testing:

#### Heavy Load Test

```bash
npm run load-test:heavy
```

This runs with:

- 100 concurrent users
- 20 operations per user
- 50 messages per chat
- 20 consistency retries
- 1 second delay between retries
- 60 second timeout

**Expected Load:** ~2,000 apps, ~2,000 chats, ~100,000 messages

#### Extreme Load Test

```bash
npm run load-test:extreme
```

This runs with:

- 500 concurrent users
- 50 operations per user
- 100 messages per chat
- 30 consistency retries
- 2 second delay between retries
- 120 second timeout

**Expected Load:** ~25,000 apps, ~25,000 chats, ~2,500,000 messages

### Custom Heavy Load Testing

You can also customize the load test parameters manually:

```bash
# Test with 100 concurrent users, 20 operations each, 100 messages per chat
BASE_URL=http://localhost:3001 \
CONCURRENT_USERS=100 \
OPERATIONS_PER_USER=20 \
MESSAGES_PER_CHAT=100 \
CONSISTENCY_RETRIES=20 \
CONSISTENCY_DELAY=1000 \
TIMEOUT=60000 \
npm run load-test
```

**Note:**

- Make sure your server and database are properly configured to handle the load before running high-load tests
- For very heavy loads, consider increasing `CONSISTENCY_RETRIES` and `CONSISTENCY_DELAY` to handle eventual consistency
- Monitor your server resources (CPU, memory, database connections) during heavy load tests

## Prerequisites

- Node.js installed
- API server running and accessible
- All dependencies installed (`npm install`)
- Sufficient system resources to handle the load
