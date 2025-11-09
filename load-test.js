/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios');

// Configuration
const config = {
  baseURL: process.env.BASE_URL || 'http://localhost:3001',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '10'),
  operationsPerUser: parseInt(process.env.OPERATIONS_PER_USER || '5'),
  messagesPerChat: parseInt(process.env.MESSAGES_PER_CHAT || '10'),
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  // Eventual consistency settings
  consistencyRetries: parseInt(process.env.CONSISTENCY_RETRIES || '10'),
  consistencyDelay: parseInt(process.env.CONSISTENCY_DELAY || '500'), // milliseconds
  // Logging settings
  verbose: process.env.VERBOSE === 'true' || false,
  progressInterval: parseInt(process.env.PROGRESS_INTERVAL || '5000'), // milliseconds
  // Test mode
  createOnly: process.env.CREATE_ONLY === 'true' || false,
};

// Statistics
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  startTime: null,
  endTime: null,
  completedUsers: 0,
  totalUsers: 0,
  responseTimes: {
    'Create App': [],
    'Find App': [],
    'Create Chat': [],
    'Find Chat': [],
    'Find All Chats': [],
    'Create Message': [],
    'Find Message': [],
    'Find All Messages': [],
  },
};

// Progress tracking (global for cleanup)
let progressInterval = null;

// Create axios instance with timeout
const api = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to log with timestamp
function log(message, force = false) {
  if (config.verbose || force) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}

// Helper function to log progress
function logProgress() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const successRate =
    stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(2) : 0;
  const opsPerSec = elapsed > 0 ? (stats.total / elapsed).toFixed(2) : '0.00';
  const completedPct =
    stats.totalUsers > 0
      ? ((stats.completedUsers / stats.totalUsers) * 100).toFixed(1)
      : 0;

  console.log(
    `\n[PROGRESS] ${stats.completedUsers}/${stats.totalUsers} users (${completedPct}%) | ` +
      `${stats.total} ops | ${stats.success} success | ${stats.failed} failed | ` +
      `${successRate}% success rate | ${opsPerSec} ops/sec | ${elapsed}s elapsed\n`,
  );
}

// Helper function to log detailed error
function logError(operation, context, error) {
  const errorDetails = {
    operation,
    context,
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
    },
  };

  // Always log errors (even in non-verbose mode)
  console.error('\n[ERROR]', JSON.stringify(errorDetails, null, 2));

  // Create a readable error message
  let errorMsg = `${operation} failed`;
  if (context) {
    errorMsg += ` (${context})`;
  }
  if (error.response?.status) {
    errorMsg += `: ${error.response.status} ${error.response.statusText}`;
    if (error.response.data) {
      errorMsg += ` - ${JSON.stringify(error.response.data)}`;
    }
  } else if (error.code) {
    errorMsg += `: ${error.code} - ${error.message}`;
  } else {
    errorMsg += `: ${error.message}`;
  }

  return errorMsg;
}

// Helper function to calculate statistics
function calculateStats(times) {
  if (times.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      p95: 0,
      p99: 0,
    };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);
  const p95 = sorted[p95Index] || sorted[sorted.length - 1];
  const p99 = sorted[p99Index] || sorted[sorted.length - 1];

  return {
    count: times.length,
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2),
    median: median.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
  };
}

// Helper function to record result
function recordResult(
  success,
  error = null,
  errorDetails = null,
  operation = null,
  responseTime = null,
) {
  stats.total++;
  if (success) {
    stats.success++;
    // Record response time for successful operations
    if (operation && responseTime !== null && stats.responseTimes[operation]) {
      stats.responseTimes[operation].push(responseTime);
    }
  } else {
    stats.failed++;
    if (errorDetails) {
      stats.errors.push(errorDetails);
    } else if (error) {
      stats.errors.push(error);
    }
  }
}

// Helper function to wait
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to retry with eventual consistency
async function retryWithConsistency(
  operation,
  operationName,
  maxRetries = config.consistencyRetries,
  delay = config.consistencyDelay,
) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        log(
          `  ✓ ${operationName} succeeded after ${attempt} attempts (eventual consistency)`,
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      // If it's a 404 (not found), it might be eventual consistency - retry
      // If it's a connection error or other error, don't retry
      if (
        error.response?.status === 404 &&
        attempt < maxRetries &&
        error.code !== 'ECONNREFUSED'
      ) {
        // Wait before retrying
        await wait(delay);
        continue;
      }
      // For other errors or max retries reached, throw
      throw error;
    }
  }
  throw lastError;
}

// Check if server is accessible
async function checkServerHealth() {
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Checking server health (attempt ${attempt}/${maxRetries})...`);
      // Try to get all apps - this is a simple endpoint that should work
      await api.get('/api/v1/apps', { timeout: 5000 });
      log(`✓ Server is accessible at ${config.baseURL}`);
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        if (attempt < maxRetries) {
          log(
            `✗ Server not accessible. Retrying in ${retryDelay / 1000} seconds...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          log(`✗ Server is not accessible at ${config.baseURL}`);
          log(`  Error: ${error.message}`);
          log(`  Please make sure the server is running on ${config.baseURL}`);
          return false;
        }
      } else {
        // If it's not a connection error, the server might be running but returned an error
        // This is acceptable - we just need to know the server is reachable
        log(
          `✓ Server is reachable (returned status: ${error.response?.status || 'unknown'})`,
        );
        return true;
      }
    }
  }
  return false;
}

// Create an app
async function createApp(userId) {
  const startTime = Date.now();
  try {
    const response = await api.post('/api/v1/apps', {
      name: `Load Test App - User ${userId} - ${Date.now()}`,
    });
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Create App', responseTime);
    const token = response.data?.data?.token;
    if (!token) {
      const error = new Error(
        `Invalid response structure: ${JSON.stringify(response.data)}`,
      );
      const errorMsg = logError('Create App', `User ${userId}`, error);
      recordResult(false, null, errorMsg, 'Create App', responseTime);
      throw error;
    }
    return token;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMsg = logError('Create App', `User ${userId}`, error);
    recordResult(false, null, errorMsg, 'Create App', responseTime);
    throw error;
  }
}

// Find an app by token
async function findApp(token, userId = null) {
  const startTime = Date.now();
  try {
    const response = await api.get(`/api/v1/apps/${token}`);
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Find App', responseTime);
    return response.data?.data || response.data;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, Token ${token}`
      : `Token ${token}`;
    const errorMsg = logError('Find App', context, error);
    recordResult(false, null, errorMsg, 'Find App', responseTime);
    throw error;
  }
}

// Create a chat
async function createChat(token, userId = null) {
  const startTime = Date.now();
  try {
    const response = await api.post(`/api/v1/apps/${token}/chats`);
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Create Chat', responseTime);
    const chatNumber = response.data?.data?.chat_number;
    if (!chatNumber) {
      const error = new Error(
        `Invalid response structure: ${JSON.stringify(response.data)}`,
      );
      const context = userId
        ? `User ${userId}, App Token ${token}`
        : `App Token ${token}`;
      const errorMsg = logError('Create Chat', context, error);
      recordResult(false, null, errorMsg, 'Create Chat', responseTime);
      throw error;
    }
    return chatNumber;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, App Token ${token}`
      : `App Token ${token}`;
    const errorMsg = logError('Create Chat', context, error);
    recordResult(false, null, errorMsg, 'Create Chat', responseTime);
    throw error;
  }
}

// Find a chat (with eventual consistency retry)
async function findChat(token, chatNumber, userId = null) {
  const startTime = Date.now();
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(
        `/api/v1/apps/${token}/chats/${chatNumber}`,
      );
      return response.data?.data || response.data;
    }, `Find Chat ${chatNumber}`);
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Find Chat', responseTime);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, App Token ${token}, Chat ${chatNumber}`
      : `App Token ${token}, Chat ${chatNumber}`;
    const errorMsg = logError('Find Chat', context, error);
    recordResult(false, null, errorMsg, 'Find Chat', responseTime);
    throw error;
  }
}

// Get all chats for an app (with eventual consistency retry)
async function findAllChats(token, userId = null) {
  const startTime = Date.now();
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(`/api/v1/apps/${token}/chats`);
      return response.data?.data || response.data;
    }, `Find All Chats for app ${token}`);
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Find All Chats', responseTime);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, App Token ${token}`
      : `App Token ${token}`;
    const errorMsg = logError('Find All Chats', context, error);
    recordResult(false, null, errorMsg, 'Find All Chats', responseTime);
    throw error;
  }
}

// Create a message
async function createMessage(token, chatNumber, messageIndex, userId = null) {
  const startTime = Date.now();
  try {
    const response = await api.post(
      `/api/v1/apps/${token}/chats/${chatNumber}/messages`,
      {
        content: `Load test message ${messageIndex} - ${Date.now()}`,
      },
    );
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Create Message', responseTime);
    const messageNumber = response.data?.data?.message_number;
    if (!messageNumber) {
      const error = new Error(
        `Invalid response structure: ${JSON.stringify(response.data)}`,
      );
      const context = userId
        ? `User ${userId}, App Token ${token}, Chat ${chatNumber}, Message Index ${messageIndex}`
        : `App Token ${token}, Chat ${chatNumber}, Message Index ${messageIndex}`;
      const errorMsg = logError('Create Message', context, error);
      recordResult(false, null, errorMsg, 'Create Message', responseTime);
      throw error;
    }
    return messageNumber;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, App Token ${token}, Chat ${chatNumber}, Message Index ${messageIndex}`
      : `App Token ${token}, Chat ${chatNumber}, Message Index ${messageIndex}`;
    const errorMsg = logError('Create Message', context, error);
    recordResult(false, null, errorMsg, 'Create Message', responseTime);
    throw error;
  }
}

// Find a message (with eventual consistency retry)
async function findMessage(token, chatNumber, messageNumber, userId = null) {
  const startTime = Date.now();
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(
        `/api/v1/apps/${token}/chats/${chatNumber}/messages/${messageNumber}`,
      );
      return response.data?.data || response.data;
    }, `Find Message ${messageNumber}`);
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Find Message', responseTime);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, App Token ${token}, Chat ${chatNumber}, Message ${messageNumber}`
      : `App Token ${token}, Chat ${chatNumber}, Message ${messageNumber}`;
    const errorMsg = logError('Find Message', context, error);
    recordResult(false, null, errorMsg, 'Find Message', responseTime);
    throw error;
  }
}

// Get all messages for a chat (with eventual consistency retry)
async function findAllMessages(token, chatNumber, userId = null) {
  const startTime = Date.now();
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(
        `/api/v1/apps/${token}/chats/${chatNumber}/messages`,
      );
      return response.data?.data || response.data;
    }, `Find All Messages for chat ${chatNumber}`);
    const responseTime = Date.now() - startTime;
    recordResult(true, null, null, 'Find All Messages', responseTime);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const context = userId
      ? `User ${userId}, App Token ${token}, Chat ${chatNumber}`
      : `App Token ${token}, Chat ${chatNumber}`;
    const errorMsg = logError('Find All Messages', context, error);
    recordResult(false, null, errorMsg, 'Find All Messages', responseTime);
    throw error;
  }
}

// Simulate a single user's workflow
async function simulateUser(userId) {
  const userStats = {
    userId,
    appsCreated: 0,
    chatsCreated: 0,
    messagesCreated: 0,
    errors: [],
  };

  try {
    for (let i = 0; i < config.operationsPerUser; i++) {
      // 1. Create an app
      log(`User ${userId} - Operation ${i + 1}: Creating app...`);
      const token = await createApp(`${userId}-${i}`);
      userStats.appsCreated++;

      // 2. Find the app (skip if CREATE_ONLY mode)
      if (!config.createOnly) {
        log(`User ${userId} - Operation ${i + 1}: Finding app ${token}...`);
        await findApp(token, userId);
      }

      // 3. Create a chat
      log(`User ${userId} - Operation ${i + 1}: Creating chat...`);
      const chatNumber = await createChat(token, userId);
      userStats.chatsCreated++;

      // Wait a bit for eventual consistency (chat creation is async)
      if (!config.createOnly) {
        await wait(config.consistencyDelay);
      }

      // 4. Find the chat (with retry for eventual consistency) - skip if CREATE_ONLY
      if (!config.createOnly) {
        log(`User ${userId} - Operation ${i + 1}: Finding chat ${chatNumber}...`);
        await findChat(token, chatNumber, userId);

        // 5. Get all chats for the app
        log(`User ${userId} - Operation ${i + 1}: Getting all chats...`);
        await findAllChats(token, userId);
      }

      // 6. Create messages
      log(
        `User ${userId} - Operation ${i + 1}: Creating ${config.messagesPerChat} messages...`,
      );
      const messageNumbers = [];
      for (let j = 0; j < config.messagesPerChat; j++) {
        const messageNumber = await createMessage(token, chatNumber, j, userId);
        messageNumbers.push(messageNumber);
        userStats.messagesCreated++;
      }

      // Wait a bit for eventual consistency (message creation is async)
      if (!config.createOnly) {
        await wait(config.consistencyDelay);

        // 7. Find messages (with retry for eventual consistency)
        log(`User ${userId} - Operation ${i + 1}: Finding messages...`);
        for (const messageNumber of messageNumbers) {
          await findMessage(token, chatNumber, messageNumber, userId);
        }

        // 8. Get all messages
        log(`User ${userId} - Operation ${i + 1}: Getting all messages...`);
        await findAllMessages(token, chatNumber, userId);
      }
    }

    log(`User ${userId} completed successfully`);
    stats.completedUsers++;
  } catch (error) {
    userStats.errors.push(error.message);
    log(`User ${userId} encountered errors: ${error.message}`, true);
    stats.completedUsers++;
  }

  return userStats;
}

// Run load test
async function runLoadTest() {
  console.log('='.repeat(80));
  console.log('Starting Load Test');
  console.log('='.repeat(80));
  console.log(`Base URL: ${config.baseURL}`);
  console.log(`Concurrent Users: ${config.concurrentUsers}`);
  console.log(`Operations per User: ${config.operationsPerUser}`);
  console.log(`Messages per Chat: ${config.messagesPerChat}`);
  console.log(`Timeout: ${config.timeout}ms`);
  console.log(`Eventual Consistency Retries: ${config.consistencyRetries}`);
  console.log(`Eventual Consistency Delay: ${config.consistencyDelay}ms`);
  console.log(`Verbose Logging: ${config.verbose ? 'ON' : 'OFF'}`);
  console.log(`Create Only Mode: ${config.createOnly ? 'ON' : 'OFF'}`);
  if (!config.verbose) {
    console.log(
      `Progress updates every ${config.progressInterval / 1000} seconds`,
    );
  }
  console.log('='.repeat(80));

  // Check server health before starting
  console.log('\nChecking server connectivity...');
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('\n' + '='.repeat(80));
    console.log('ERROR: Cannot connect to server');
    console.log('='.repeat(80));
    console.log(`Please ensure the server is running at ${config.baseURL}`);
    console.log('You can start the server with: npm run start:dev');
    console.log('='.repeat(80));
    process.exit(1);
  }

  log('\nStarting load test...\n', true);

  stats.startTime = Date.now();
  stats.totalUsers = config.concurrentUsers;
  stats.completedUsers = 0;

  // Start progress reporting
  if (!config.verbose) {
    progressInterval = setInterval(() => {
      logProgress();
    }, config.progressInterval);
  }

  // Create array of user promises
  const userPromises = [];
  for (let i = 1; i <= config.concurrentUsers; i++) {
    userPromises.push(simulateUser(i));
  }

  // Wait for all users to complete
  const userResults = await Promise.allSettled(userPromises);

  // Stop progress reporting
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }

  // Final progress update
  logProgress();

  stats.endTime = Date.now();

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('Load Test Results');
  console.log('='.repeat(80));

  const duration = (stats.endTime - stats.startTime) / 1000;
  const totalOperations = config.createOnly
    ? config.concurrentUsers *
      config.operationsPerUser *
      (1 + // create app
        1 + // create chat
        config.messagesPerChat) // create messages
    : config.concurrentUsers *
      config.operationsPerUser *
      (1 + // create app
        1 + // find app
        1 + // create chat
        1 + // find chat
        1 + // find all chats
        config.messagesPerChat + // create messages
        config.messagesPerChat + // find messages
        1); // find all messages

  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Total Operations: ${stats.total}`);
  console.log(`Expected Operations: ${totalOperations}`);
  console.log(`Successful: ${stats.success}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(
    `Success Rate: ${((stats.success / stats.total) * 100).toFixed(2)}%`,
  );
  console.log(`Operations per Second: ${(stats.total / duration).toFixed(2)}`);

  // Response time statistics
  console.log('\n' + '-'.repeat(80));
  console.log('Response Time Statistics (in milliseconds):');
  console.log('-'.repeat(80));
  console.log(
    'Operation'.padEnd(20) +
      'Count'.padEnd(10) +
      'Min'.padEnd(10) +
      'Max'.padEnd(10) +
      'Avg'.padEnd(10) +
      'Median'.padEnd(10) +
      'P95'.padEnd(10) +
      'P99',
  );
  console.log('-'.repeat(80));

  // Sort operations by average response time (descending) to show bottlenecks first
  const operationStats = Object.entries(stats.responseTimes)
    .map(([operation, times]) => ({
      operation,
      stats: calculateStats(times),
    }))
    .sort((a, b) => parseFloat(b.stats.avg) - parseFloat(a.stats.avg));

  operationStats.forEach(({ operation, stats: opStats }) => {
    if (opStats.count > 0) {
      console.log(
        operation.padEnd(20) +
          opStats.count.toString().padEnd(10) +
          opStats.min.padEnd(10) +
          opStats.max.padEnd(10) +
          opStats.avg.padEnd(10) +
          opStats.median.padEnd(10) +
          opStats.p95.padEnd(10) +
          opStats.p99,
      );
    }
  });

  // User statistics
  console.log('\n' + '-'.repeat(80));
  console.log('User Statistics:');
  console.log('-'.repeat(80));
  let totalApps = 0,
    totalChats = 0,
    totalMessages = 0;
  userResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const userStats = result.value;
      totalApps += userStats.appsCreated;
      totalChats += userStats.chatsCreated;
      totalMessages += userStats.messagesCreated;
      console.log(
        `User ${index + 1}: Apps=${userStats.appsCreated}, Chats=${userStats.chatsCreated}, Messages=${userStats.messagesCreated}`,
      );
    } else {
      console.log(`User ${index + 1}: FAILED - ${result.reason}`);
    }
  });

  console.log('\n' + '-'.repeat(80));
  console.log('Totals:');
  console.log('-'.repeat(80));
  console.log(`Total Apps Created: ${totalApps}`);
  console.log(`Total Chats Created: ${totalChats}`);
  console.log(`Total Messages Created: ${totalMessages}`);

  // Error summary
  if (stats.errors.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('Error Summary (showing first 20 errors):');
    console.log('-'.repeat(80));
    stats.errors.slice(0, 20).forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    if (stats.errors.length > 20) {
      console.log(`... and ${stats.errors.length - 20} more errors`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Load Test Completed');
  console.log('='.repeat(80));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error(`Unhandled Rejection: ${error.message}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  console.log('\n\nLoad test interrupted. Generating final report...');
  logProgress();
  process.exit(0);
});

// Run the load test
runLoadTest().catch((error) => {
  console.error(`Fatal Error: ${error.message}`);
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  process.exit(1);
});
