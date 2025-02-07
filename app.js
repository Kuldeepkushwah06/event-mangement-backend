const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const uploadRoutes = require('./routes/upload');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/upload', uploadRoutes); 