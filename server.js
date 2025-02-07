require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://eventmanagementkuldeep.netlify.app',
      /--eventmanagementkuldeep\.netlify\.app$/,  // This will allow all Netlify deploy previews
      /eventmanagementkuldeep\.netlify\.app$/     // This will allow the main site
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin matches any of our allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.set('strictQuery', false);

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 2000,
  retryWrites: true,
  w: 'majority',
  dbName: 'event-management'
};

const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI, options)
    .then(() => {
      console.log('MongoDB connected successfully');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying in 3 seconds...');
      setTimeout(connectWithRetry, 3000);
    });
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Reconnecting...');
  connectWithRetry();
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  mongoose.disconnect();
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

// Initial connection
connectWithRetry();

// Socket.IO connection handling
const io = socketIo(server, { cors: corsOptions });

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/events');
const uploadRoutes = require('./routes/upload');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add this after your imports
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Event Management API' });
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    res.json({
      status: states[status],
      mongodb: status === 1 ? 'healthy' : 'unhealthy'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ message: 'Invalid token' });
  } else {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 