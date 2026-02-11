require('dotenv').config();
const express = require('express');
const cors = require('cors');
const salesforceService = require('./services/salesforce');
const authRoutes = require('./routes/auth');
const loyaltyRoutes = require('./routes/loyalty');
const productsRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow any Heroku frontend URL
    if (origin.includes('herokuapp.com')) {
      return callback(null, true);
    }
    
    // Allow any origin in development, restrict in production if needed
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, you might want to restrict this
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

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

// Root endpoint with setup instructions
app.get('/', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;
  const oauthLoginUrl = `${baseUrl}/oauth/login`;
  const callbackUrl = `${baseUrl}/oauth/callback`;
  const healthUrl = `${baseUrl}/health`;
  
  const isConnected = salesforceService.isConnected();
  const hasOAuthConfig = !!(process.env.SF_CLIENT_ID && process.env.SF_CLIENT_SECRET);
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Loyalty Backend - Setup Instructions</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
        }
        h1 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 2em;
        }
        .subtitle {
          color: #64748b;
          margin-bottom: 30px;
        }
        .status {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status.connected {
          background: #d1fae5;
          color: #065f46;
          border-left: 4px solid #10b981;
        }
        .status.disconnected {
          background: #fee2e2;
          color: #991b1b;
          border-left: 4px solid #ef4444;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #1e293b;
          margin-bottom: 15px;
          font-size: 1.5em;
        }
        .section p {
          color: #475569;
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 10px 10px 10px 0;
          transition: transform 0.2s;
        }
        .btn:hover {
          transform: translateY(-2px);
        }
        .btn-secondary {
          background: #e2e8f0;
          color: #475569;
        }
        .code-block {
          background: #1e293b;
          color: #e2e8f0;
          padding: 15px;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9em;
          overflow-x: auto;
          margin: 10px 0;
        }
        .code-block code {
          color: #e2e8f0;
        }
        .step {
          background: #f8fafc;
          padding: 15px;
          border-left: 4px solid #667eea;
          margin: 15px 0;
          border-radius: 4px;
        }
        .step h3 {
          color: #1e293b;
          margin-bottom: 8px;
        }
        .step ol, .step ul {
          margin-left: 20px;
          color: #475569;
        }
        .step li {
          margin: 5px 0;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
        }
        .warning strong {
          color: #92400e;
        }
        a {
          color: #667eea;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Loyalty Backend Service</h1>
        <p class="subtitle">Salesforce Loyalty Management API Backend</p>
        
        <div class="status ${isConnected ? 'connected' : 'disconnected'}">
          <strong>${isConnected ? '✅' : '⚠️'}</strong>
          <div>
            <strong>Salesforce Status:</strong> ${isConnected ? 'Connected' : 'Disconnected'}<br>
            <small>${isConnected ? 'Backend is ready to process requests' : 'Please complete OAuth setup below'}</small>
          </div>
        </div>
        
        <div class="section">
          <h2>Quick Start</h2>
          <div class="step">
            <h3>1. Install Dependencies</h3>
            <div class="code-block">
              <code>npm install</code>
            </div>
          </div>
          
          <div class="step">
            <h3>2. Configure Environment</h3>
            <p>Copy <code>.env.template</code> to <code>.env</code> and fill in your Salesforce credentials.</p>
          </div>
          
          <div class="step">
            <h3>3. Start Development Server</h3>
            <div class="code-block">
              <code>npm run dev</code>
            </div>
          </div>
        </div>
        
        ${hasOAuthConfig ? `
        <div class="section">
          <h2>🔐 OAuth Setup (Required for Salesforce Connection)</h2>
          
          ${!isConnected ? `
          <div class="warning">
            <strong>⚠️ Action Required:</strong> Backend is not connected to Salesforce. Complete the OAuth setup below.
          </div>
          ` : ''}
          
          <div class="step">
            <h3>Step 1: Configure Salesforce Connected App</h3>
            <ol>
              <li>Log into your Salesforce org</li>
              <li>Go to <strong>Setup → App Manager</strong></li>
              <li>Find your Connected App (or create a new one)</li>
              <li>Click the dropdown → <strong>View</strong></li>
              <li>Scroll to <strong>"OAuth Settings"</strong></li>
              <li>Add this Callback URL to the list:
                <div class="code-block">
                  <code>${callbackUrl}</code>
                </div>
              </li>
              <li>Ensure these OAuth Scopes are enabled:
                <ul>
                  <li><code>api</code></li>
                  <li><code>web</code></li>
                  <li><code>refresh_token</code></li>
                  <li><code>full</code></li>
                </ul>
              </li>
              <li>Click <strong>Save</strong></li>
            </ol>
          </div>
          
          <div class="step">
            <h3>Step 2: Authorize Backend</h3>
            <p>Click the button below to start the OAuth flow:</p>
            <a href="${oauthLoginUrl}" class="btn">🔗 Authorize with Salesforce</a>
            <p style="margin-top: 10px; color: #64748b;">
              This will redirect you to Salesforce to authorize the backend application.
            </p>
          </div>
          
          <div class="step">
            <h3>Step 3: Verify Connection</h3>
            <p>After authorization, check the health status:</p>
            <a href="${healthUrl}" class="btn btn-secondary">📊 Check Health Status</a>
          </div>
        </div>
        ` : `
        <div class="section">
          <h2>🔐 OAuth Configuration</h2>
          <div class="warning">
            <strong>⚠️ OAuth Not Configured:</strong> Consumer Key and Consumer Secret are not set in environment variables.
            <p style="margin-top: 10px;">To use OAuth flow, set these environment variables:</p>
            <div class="code-block">
              <code>SF_CLIENT_ID=your-consumer-key<br>
SF_CLIENT_SECRET=your-consumer-secret</code>
            </div>
            <p style="margin-top: 10px;">Alternatively, you can use username/password authentication (server-to-server) without OAuth.</p>
          </div>
        </div>
        `}
        
        <div class="section">
          <h2>📚 API Endpoints</h2>
          <ul>
            <li><strong>GET</strong> <a href="${healthUrl}">/health</a> - Health check</li>
            <li><strong>GET</strong> <a href="${oauthLoginUrl}">/oauth/login</a> - OAuth login (redirects to Salesforce)</li>
            <li><strong>POST</strong> /api/auth/login - Member login</li>
            <li><strong>GET</strong> /api/loyalty/profile - Get member profile (requires auth)</li>
            <li><strong>POST</strong> /api/loyalty/purchase - Process transaction (requires auth)</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>📖 Documentation</h2>
          <p>See <code>README.md</code> in the project root for full API documentation and setup instructions.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;
  const oauthLoginUrl = `${baseUrl}/oauth/login`;
  const callbackUrl = `${baseUrl}/oauth/callback`;
  
  const isConnected = salesforceService.isConnected();
  const hasOAuthConfig = !!(process.env.SF_CLIENT_ID && process.env.SF_CLIENT_SECRET);
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    salesforce: isConnected ? 'connected' : 'disconnected',
    oauth: {
      configured: hasOAuthConfig,
      loginUrl: hasOAuthConfig ? oauthLoginUrl : null,
      callbackUrl: hasOAuthConfig ? callbackUrl : null,
      setupInstructions: hasOAuthConfig ? `Add this callback URL to Salesforce: ${callbackUrl}` : 'Set SF_CLIENT_ID and SF_CLIENT_SECRET to enable OAuth'
    }
  });
});

// Routes
app.use('/api/auth', cors(corsOptions), authRoutes);
app.use('/api/loyalty', cors(corsOptions), loyaltyRoutes);
app.use('/api/products', cors(corsOptions), productsRoutes);
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
