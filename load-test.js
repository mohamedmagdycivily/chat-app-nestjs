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

// Helper function to record result
function recordResult(success, error = null) {
  stats.total++;
  if (success) {
    stats.success++;
  } else {
    stats.failed++;
    if (error) {
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
  try {
    const response = await api.post('/api/v1/apps', {
      name: `Load Test App - User ${userId} - ${Date.now()}`,
    });
    recordResult(true);
    const token = response.data?.data?.token;
    if (!token) {
      throw new Error(
        `Invalid response structure: ${JSON.stringify(response.data)}`,
      );
    }
    return token;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Create App failed: Server not accessible (${error.message})`
        : error.response
          ? `Create App failed: ${error.response.status} ${error.response.statusText}`
          : `Create App failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Find an app by token
async function findApp(token) {
  try {
    const response = await api.get(`/api/v1/apps/${token}`);
    recordResult(true);
    return response.data?.data || response.data;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Find App failed: Server not accessible (${error.message})`
        : error.response
          ? `Find App failed: ${error.response.status} ${error.response.statusText}`
          : `Find App failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Create a chat
async function createChat(token) {
  try {
    const response = await api.post(`/api/v1/apps/${token}/chats`);
    recordResult(true);
    const chatNumber = response.data?.data?.chat_number;
    if (!chatNumber) {
      throw new Error(
        `Invalid response structure: ${JSON.stringify(response.data)}`,
      );
    }
    return chatNumber;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Create Chat failed: Server not accessible (${error.message})`
        : error.response
          ? `Create Chat failed: ${error.response.status} ${error.response.statusText}`
          : `Create Chat failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Find a chat (with eventual consistency retry)
async function findChat(token, chatNumber) {
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(
        `/api/v1/apps/${token}/chats/${chatNumber}`,
      );
      return response.data?.data || response.data;
    }, `Find Chat ${chatNumber}`);
    recordResult(true);
    return result;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Find Chat failed: Server not accessible (${error.message})`
        : error.response
          ? `Find Chat failed: ${error.response.status} ${error.response.statusText}`
          : `Find Chat failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Get all chats for an app (with eventual consistency retry)
async function findAllChats(token) {
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(`/api/v1/apps/${token}/chats`);
      return response.data?.data || response.data;
    }, `Find All Chats for app ${token}`);
    recordResult(true);
    return result;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Find All Chats failed: Server not accessible (${error.message})`
        : error.response
          ? `Find All Chats failed: ${error.response.status} ${error.response.statusText}`
          : `Find All Chats failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Create a message
async function createMessage(token, chatNumber, messageIndex) {
  try {
    const response = await api.post(
      `/api/v1/apps/${token}/chats/${chatNumber}/messages`,
      {
        content: `Load test message ${messageIndex} - ${Date.now()}`,
      },
    );
    recordResult(true);
    const messageNumber = response.data?.data?.message_number;
    if (!messageNumber) {
      throw new Error(
        `Invalid response structure: ${JSON.stringify(response.data)}`,
      );
    }
    return messageNumber;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Create Message failed: Server not accessible (${error.message})`
        : error.response
          ? `Create Message failed: ${error.response.status} ${error.response.statusText}`
          : `Create Message failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Find a message (with eventual consistency retry)
async function findMessage(token, chatNumber, messageNumber) {
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(
        `/api/v1/apps/${token}/chats/${chatNumber}/messages/${messageNumber}`,
      );
      return response.data?.data || response.data;
    }, `Find Message ${messageNumber}`);
    recordResult(true);
    return result;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Find Message failed: Server not accessible (${error.message})`
        : error.response
          ? `Find Message failed: ${error.response.status} ${error.response.statusText}`
          : `Find Message failed: ${error.message}`;
    recordResult(false, errorMsg);
    throw error;
  }
}

// Get all messages for a chat (with eventual consistency retry)
async function findAllMessages(token, chatNumber) {
  try {
    const result = await retryWithConsistency(async () => {
      const response = await api.get(
        `/api/v1/apps/${token}/chats/${chatNumber}/messages`,
      );
      return response.data?.data || response.data;
    }, `Find All Messages for chat ${chatNumber}`);
    recordResult(true);
    return result;
  } catch (error) {
    const errorMsg =
      error.code === 'ECONNREFUSED'
        ? `Find All Messages failed: Server not accessible (${error.message})`
        : error.response
          ? `Find All Messages failed: ${error.response.status} ${error.response.statusText}`
          : `Find All Messages failed: ${error.message}`;
    recordResult(false, errorMsg);
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

      // 2. Find the app
      log(`User ${userId} - Operation ${i + 1}: Finding app ${token}...`);
      await findApp(token);

      // 3. Create a chat
      log(`User ${userId} - Operation ${i + 1}: Creating chat...`);
      const chatNumber = await createChat(token);
      userStats.chatsCreated++;

      // Wait a bit for eventual consistency (chat creation is async)
      await wait(config.consistencyDelay);

      // 4. Find the chat (with retry for eventual consistency)
      log(`User ${userId} - Operation ${i + 1}: Finding chat ${chatNumber}...`);
      await findChat(token, chatNumber);

      // 5. Get all chats for the app
      log(`User ${userId} - Operation ${i + 1}: Getting all chats...`);
      await findAllChats(token);

      // 6. Create messages
      log(
        `User ${userId} - Operation ${i + 1}: Creating ${config.messagesPerChat} messages...`,
      );
      const messageNumbers = [];
      for (let j = 0; j < config.messagesPerChat; j++) {
        const messageNumber = await createMessage(token, chatNumber, j);
        messageNumbers.push(messageNumber);
        userStats.messagesCreated++;
      }

      // Wait a bit for eventual consistency (message creation is async)
      await wait(config.consistencyDelay);

      // 7. Find messages (with retry for eventual consistency)
      log(`User ${userId} - Operation ${i + 1}: Finding messages...`);
      for (const messageNumber of messageNumbers) {
        await findMessage(token, chatNumber, messageNumber);
      }

      // 8. Get all messages
      log(`User ${userId} - Operation ${i + 1}: Getting all messages...`);
      await findAllMessages(token, chatNumber);
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
  const totalOperations =
    config.concurrentUsers *
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
