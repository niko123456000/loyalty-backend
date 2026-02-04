const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Store code verifiers temporarily (in production, use Redis or similar)
const codeVerifiers = new Map();

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
  // Generate code verifier (random string)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate code challenge (SHA256 hash of verifier)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * GET /oauth/login
 * Redirect to Salesforce for authorization with PKCE
 */
router.get('/login', (req, res) => {
  const { codeVerifier, codeChallenge } = generatePKCE();
  
  // Generate a state parameter to prevent CSRF
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store verifier and state for later verification
  codeVerifiers.set(state, { codeVerifier, timestamp: Date.now() });
  
  // Clean up old verifiers (older than 10 minutes)
  for (const [key, value] of codeVerifiers.entries()) {
    if (Date.now() - value.timestamp > 600000) {
      codeVerifiers.delete(key);
    }
  }
  
  // Auto-detect redirect URI based on request
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = process.env.OAUTH_REDIRECT_URI || `${protocol}://${host}/oauth/callback`;
  
  const authUrl = `${process.env.SF_LOGIN_URL}/services/oauth2/authorize?` +
    `response_type=code` +
    `&client_id=${process.env.SF_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=api%20web%20refresh_token%20full` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256` +
    `&state=${state}`;
  
  console.log('Redirecting to Salesforce for authorization (with PKCE)...');
  console.log('Redirect URI:', redirectUri);
  res.redirect(authUrl);
});

/**
 * GET /oauth/callback
 * Handle OAuth callback from Salesforce
 */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.status(400).send(`OAuth Error: ${error} - ${error_description}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code received');
  }

  if (!state) {
    return res.status(400).send('No state parameter received');
  }

  // Retrieve the code verifier
  const storedData = codeVerifiers.get(state);
  if (!storedData) {
    return res.status(400).send('Invalid state parameter or session expired');
  }

  const { codeVerifier } = storedData;
  codeVerifiers.delete(state); // Clean up

  try {
    console.log('Received authorization code, exchanging for access token (with PKCE)...');
    
    // Auto-detect redirect URI
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = process.env.OAUTH_REDIRECT_URI || `${protocol}://${host}/oauth/callback`;
    
    console.log('Using redirect URI:', redirectUri);
    
    const salesforceService = require('../services/salesforce');
    await salesforceService.exchangeAuthorizationCode(code, codeVerifier, redirectUri);

    res.send(`
      <html>
        <head><title>Authorization Successful</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1 style="color: green;">✅ Authorization Successful!</h1>
          <p>Backend is now connected to Salesforce.</p>
          <p>You can close this window and check your terminal.</p>
          <p><a href="/health">Check Health Status</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Failed to exchange authorization code:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

module.exports = router;
