require('dotenv').config();
const express = require('express');
const cors = require('cors');
const salesforceService = require('./services/salesforce');
const authRoutes = require('./routes/auth');
const loyaltyRoutes = require('./routes/loyalty');
const productsRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize Salesforce connection on startup
salesforceService.initialize().then(() => {
  console.log('Salesforce connection initialized');
}).catch(err => {
  console.error('Failed to initialize Salesforce connection:', err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    salesforce: salesforceService.isConnected() ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/products', productsRoutes);
app.use('/oauth', require('./routes/oauth')); // OAuth flow for backend authorization

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Loyalty Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
