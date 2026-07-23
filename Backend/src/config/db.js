import mongoose from 'mongoose';
import logger from './logger.js';

// MongoDB connection options
const connectionOptions = {
  // Connection pool size
  maxPoolSize: 10,
  minPoolSize: 2,
  
  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  
  // Keep trying to send operations for 5 seconds
  connectTimeoutMS: 10000,
  
  // Automatically index in dev, but not in prod (indexes should be managed via migrations)
  autoIndex: process.env.NODE_ENV !== 'production',
};

/**
 * Connect to MongoDB database.
 * Uses connection string from environment or defaults to localhost.
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cleansight';
  
  // Don't log the full URI in case it contains credentials
  const sanitizedUri = mongoUri.includes('@') 
    ? mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    : mongoUri;
  
  try {
    const conn = await mongoose.connect(mongoUri, connectionOptions);
    
    logger.info('MongoDB connected', {
      host: conn.connection.host,
      database: conn.connection.name,
    });
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing MongoDB connection', { error: err.message });
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
      connectionString: sanitizedUri,
    });
    process.exit(1);
  }
};

/**
 * Check if database is connected and healthy.
 */
export const isDatabaseHealthy = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection stats for monitoring.
 */
export const getConnectionStats = () => {
  return {
    connected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    readyState: mongoose.connection.readyState,
  };
};

export default connectDB;
