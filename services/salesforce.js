const jsforce = require('jsforce');
const https = require('https');
const fs = require('fs');
const path = require('path');

// File to persist tokens
const TOKEN_FILE = path.join(__dirname, '../.tokens.json');

class SalesforceService {
  constructor() {
    this.conn = null;
    this.connected = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.instanceUrl = null;
  }

  /**
   * Load saved tokens from file
   */
  loadTokens() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.instanceUrl = data.instanceUrl;
        console.log('Loaded saved tokens from file');
        return true;
      }
    } catch (error) {
      console.error('Error loading tokens:', error.message);
    }
    return false;
  }

  /**
   * Save tokens to file
   */
  saveTokens() {
    try {
      const data = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        instanceUrl: this.instanceUrl,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
      console.log('Tokens saved to file');
    } catch (error) {
      console.error('Error saving tokens:', error.message);
    }
  }

  /**
   * Initialize connection to Salesforce
   * Try to use saved tokens, otherwise prompt for manual authorization
   */
  async initialize() {
    try {
      // Try to load saved tokens
      if (this.loadTokens() && this.accessToken) {
        console.log('Attempting to use saved access token...');
        
        this.conn = new jsforce.Connection({
          instanceUrl: this.instanceUrl || process.env.SF_INSTANCE_URL,
          accessToken: this.accessToken,
          version: '58.0',
          oauth2: {
            clientId: process.env.SF_CLIENT_ID,
            clientSecret: process.env.SF_CLIENT_SECRET,
            redirectUri: 'http://localhost:3000/oauth/callback',
            loginUrl: process.env.SF_LOGIN_URL
          }
        });

        // Test the connection
        try {
          await this.conn.identity();
          this.connected = true;
          console.log('✅ Connected to Salesforce using saved token');
          console.log('Instance URL:', this.instanceUrl);
          return this.conn;
        } catch (error) {
          console.log('Saved token expired, will try to refresh...');
          
          // Try to refresh the token
          if (this.refreshToken) {
            try {
              await this.refreshAccessToken();
              this.connected = true;
              console.log('✅ Connected to Salesforce using refreshed token');
              return this.conn;
            } catch (refreshError) {
              console.log('Token refresh failed:', refreshError.message);
            }
          }
        }
      }

      // If we get here, we need manual authorization
      console.log('\n' + '='.repeat(60));
      console.log('⚠️  MANUAL AUTHORIZATION REQUIRED');
      console.log('='.repeat(60));
      console.log('\nNo valid Salesforce credentials found.');
      console.log('\nTo authorize the backend, open this URL in your browser:');
      console.log('\n  👉  http://localhost:3000/oauth/login\n');
      console.log('This will redirect you to Salesforce to authorize the app.');
      console.log('='.repeat(60) + '\n');

      // Return null but don't throw - server will still start
      return null;
    } catch (error) {
      console.error('❌ Salesforce connection error:', error.message);
      this.connected = false;
      return null;
    }
  }

  /**
   * Exchange authorization code for access token (with PKCE support)
   */
  async exchangeAuthorizationCode(code, codeVerifier, redirectUri) {
    try {
      console.log('Exchanging authorization code for access token (with PKCE)...');
      console.log('Redirect URI:', redirectUri);
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier // Include PKCE verifier
      });

      const tokenUrl = `${process.env.SF_LOGIN_URL}/services/oauth2/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const authData = await response.json();
      
      this.accessToken = authData.access_token;
      this.refreshToken = authData.refresh_token;
      this.instanceUrl = authData.instance_url;

      // Save tokens for future use
      this.saveTokens();

      // Create JSForce connection with OAuth2 configuration
      this.conn = new jsforce.Connection({
        instanceUrl: this.instanceUrl,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        version: '58.0',
        oauth2: {
          clientId: process.env.SF_CLIENT_ID,
          clientSecret: process.env.SF_CLIENT_SECRET,
          redirectUri: redirectUri,
          loginUrl: process.env.SF_LOGIN_URL
        }
      });

      this.connected = true;
      console.log('✅ Successfully authorized and connected to Salesforce');
      console.log('Instance URL:', this.instanceUrl);

      return this.conn;
    } catch (error) {
      console.error('Error exchanging authorization code:', error.message);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      console.log('Refreshing access token...');
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET
      });

      const tokenUrl = `${process.env.SF_LOGIN_URL}/services/oauth2/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const authData = await response.json();
      
      this.accessToken = authData.access_token;
      this.instanceUrl = authData.instance_url || this.instanceUrl;

      // Save updated tokens
      this.saveTokens();

      // Update connection with OAuth2 configuration
      this.conn = new jsforce.Connection({
        instanceUrl: this.instanceUrl,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        version: '58.0',
        oauth2: {
          clientId: process.env.SF_CLIENT_ID,
          clientSecret: process.env.SF_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/oauth/callback',
          loginUrl: process.env.SF_LOGIN_URL
        }
      });

      console.log('✅ Access token refreshed successfully');
      return this.conn;
    } catch (error) {
      console.error('Error refreshing token:', error.message);
      throw error;
    }
  }

  /**
   * Ensure connection is active, reconnect if needed
   */
  async ensureConnection() {
    if (!this.connected || !this.conn) {
      await this.initialize();
    }
    return this.conn;
  }

  /**
   * Check if connected to Salesforce
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Find loyalty member by membership number
   */
  async findMemberByNumber(membershipNumber) {
    const conn = await this.ensureConnection();
    
    try {
      const result = await conn.query(`
        SELECT Id, MembershipNumber, ContactId, Contact.Name, Contact.Email,
               MemberStatus, EnrollmentDate, ProgramId, Program.Name
        FROM LoyaltyProgramMember
        WHERE MembershipNumber = '${membershipNumber}'
        AND Program.Name = '${process.env.LOYALTY_PROGRAM_NAME}'
        LIMIT 1
      `);

      if (result.totalSize === 0) {
        return null;
      }

      return result.records[0];
    } catch (error) {
      console.error('Error finding member:', error);
      throw error;
    }
  }

  /**
   * Get member loyalty profile with points balance
   */
  async getMemberProfile(memberId) {
    const conn = await this.ensureConnection();
    
    try {
      // Get member details
      const member = await conn.sobject('LoyaltyProgramMember').retrieve(memberId);
      
      // Get member currency (points balance)
      const currencyResult = await conn.query(`
        SELECT Id, PointsBalance, LoyaltyProgramCurrencyId, 
               LastAccrualProcessedDate, LastExpirationProcessRunDate
        FROM LoyaltyMemberCurrency
        WHERE LoyaltyMemberId = '${memberId}'
        LIMIT 1
      `);

      const currency = currencyResult.records[0];

      // Try to get member tier (if tiers are enabled in the org)
      let tier = null;
      try {
        const tierResult = await conn.query(`
          SELECT Id, TierGroupId, TierGroup.Name, TierLevel, 
                 TierExpirationDate, TierEffectiveDate
          FROM LoyaltyProgramMemberTier
          WHERE MemberId = '${memberId}'
          AND TierExpirationDate > TODAY
          ORDER BY TierLevel DESC
          LIMIT 1
        `);
        
        if (tierResult.totalSize > 0) {
          const tierData = tierResult.records[0];
          tier = {
            name: tierData.TierGroup?.Name,
            level: tierData.TierLevel,
            expirationDate: tierData.TierExpirationDate
          };
        }
      } catch (tierError) {
        // Tiers not enabled or not available - that's okay
        console.log('Tiers not available (this is normal if tiers are not configured)');
      }

      return {
        memberId: member.Id,
        membershipNumber: member.MembershipNumber,
        memberStatus: member.MemberStatus,
        enrollmentDate: member.EnrollmentDate,
        contactId: member.ContactId,
        programId: member.ProgramId,
        pointsBalance: currency ? currency.PointsBalance : 0,
        lastAccrualDate: currency ? currency.LastAccrualProcessedDate : null,
        tier: tier
      };
    } catch (error) {
      console.error('Error getting member profile:', error);
      throw error;
    }
  }

  /**
   * Create transaction journal via Apex REST endpoint
   */
  async createTransactionJournal(membershipNumber, lineItems) {
    const conn = await this.ensureConnection();
    
    try {
      const payload = {
        membershipNumber: membershipNumber,
        transactionDate: new Date().toISOString(),
        lineItems: lineItems.map(item => ({
          productName: item.productName,
          price: item.price,
          quantity: item.quantity || 1
        }))
      };

      console.log('Creating transaction:', payload);

      const result = await conn.apex.post(
        '/CreateAndProcessTransactionJournal',
        payload
      );

      console.log('Transaction result:', result);
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions for a member
   */
  async getMemberTransactions(memberId, limit = 10) {
    const conn = await this.ensureConnection();
    
    try {
      const result = await conn.query(`
        SELECT Id, ActivityDate, TransactionAmount, Status,
               JournalType.Name, JournalSubType.Name
        FROM TransactionJournal
        WHERE MemberId = '${memberId}'
        ORDER BY ActivityDate DESC
        LIMIT ${limit}
      `);

      return result.records;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SalesforceService();
