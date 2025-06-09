import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes (will be created later)
// import authRoutes from './routes/auth';
// import fileRoutes from './routes/files';
// import projectRoutes from './routes/projects';

// Import middleware (will be created later)
// import { authenticateToken } from './middleware/auth';
// import { errorHandler } from './middleware/errorHandler';

// Create Express application
const app: Application = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cloudide-plus-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport in development
if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://cloudide-plus.web.app', // Firebase hosting URL (example)
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'CloudIDE+ API',
    version: '1.0.0',
    description: 'Backend API for CloudIDE+ - A cloud-based IDE inspired by Visual Studio Code',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      files: '/api/files',
      projects: '/api/projects'
    },
    documentation: 'https://github.com/your-username/cloudide-plus/tree/main/docs',
    status: 'operational'
  });
});

// Placeholder routes (will be implemented later)
app.get('/api/auth/status', (req: Request, res: Response) => {
  res.json({
    message: 'Auth service is running',
    authenticated: false,
    features: ['Google OAuth', 'Firebase Auth', 'JWT Tokens']
  });
});

app.get('/api/files/status', (req: Request, res: Response) => {
  res.json({
    message: 'File service is running',
    features: ['Google Drive API', 'File Upload/Download', 'Version Control']
  });
});

app.get('/api/projects/status', (req: Request, res: Response) => {
  res.json({
    message: 'Project service is running',
    features: ['Project Management', 'Firebase Storage', 'Real-time Collaboration']
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Handle file collaboration events
  socket.on('join-file', (fileId: string) => {
    socket.join(`file:${fileId}`);
    logger.info('Client joined file room', { socketId: socket.id, fileId });
  });

  socket.on('leave-file', (fileId: string) => {
    socket.leave(`file:${fileId}`);
    logger.info('Client left file room', { socketId: socket.id, fileId });
  });

  socket.on('file-change', (data: { fileId: string; content: string; cursor: any }) => {
    // Broadcast changes to other clients in the same file room
    socket.to(`file:${data.fileId}`).emit('file-update', {
      content: data.content,
      cursor: data.cursor,
      userId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const errorMessage = NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    error: errorMessage,
    timestamp: new Date().toISOString(),
    requestId: req.get('X-Request-ID') || 'unknown'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/auth/status',
      'GET /api/files/status',
      'GET /api/projects/status'
    ]
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connections, cleanup resources, etc.
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
server.listen(PORT, () => {
  logger.info(`CloudIDE+ API server is running on port ${PORT}`, {
    environment: NODE_ENV,
    port: PORT,
    timestamp: new Date().toISOString()
  });

  console.log(`
🚀 CloudIDE+ Backend Server Started!

📍 Server URL: http://localhost:${PORT}
🌍 Environment: ${NODE_ENV}
📊 Health Check: http://localhost:${PORT}/health
📖 API Info: http://localhost:${PORT}/api

🔧 Features Ready:
  ✅ Express.js server
  ✅ Socket.IO for real-time collaboration
  ✅ Security middleware (Helmet, CORS, Rate Limiting)
  ✅ Logging with Winston
  ✅ Error handling
  ✅ Health monitoring

🚧 Coming Soon:
  🔐 Firebase Authentication
  📁 Google Drive API integration
  🗄️ Database connectivity
  🎨 Monaco Editor collaboration

Press Ctrl+C to stop the server
  `);
});

export default app;
