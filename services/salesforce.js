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
      // Build query - make program name filter optional
      let query = `
        SELECT Id, MembershipNumber, ContactId, Contact.Name, Contact.Email,
               MemberStatus, EnrollmentDate, ProgramId, Program.Name
        FROM LoyaltyProgramMember
        WHERE MembershipNumber = '${membershipNumber.replace(/'/g, "\\'")}'
      `;
      
      // Add program name filter if set
      const programName = process.env.LOYALTY_PROGRAM_NAME || 'Cirrus Loyalty';
      if (programName) {
        query += ` AND Program.Name = '${programName.replace(/'/g, "\\'")}'`;
      }
      
      query += ' LIMIT 1';

      console.log('Querying for member:', membershipNumber);
      const result = await conn.query(query);

      if (result.totalSize === 0) {
        console.log('Member not found:', membershipNumber);
        return null;
      }

      console.log('Member found:', result.records[0].MembershipNumber);
      return result.records[0];
    } catch (error) {
      console.error('Error finding member:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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
      
      // Calculate balance from ledger entries if PointsBalance is 0 or outdated
      // This provides immediate balance updates even if scheduled process hasn't run
      let calculatedBalance = currency ? currency.PointsBalance : 0;
      
      if (currency && currency.LoyaltyProgramCurrencyId) {
        try {
          // Calculate credits
          const creditsResult = await conn.query(`
            SELECT SUM(Points) totalPoints
            FROM LoyaltyLedger
            WHERE LoyaltyProgramMemberId = '${memberId}'
            AND LoyaltyProgramCurrencyId = '${currency.LoyaltyProgramCurrencyId}'
            AND EventType = 'Credit'
          `);
          
          // Calculate debits
          const debitsResult = await conn.query(`
            SELECT SUM(Points) totalPoints
            FROM LoyaltyLedger
            WHERE LoyaltyProgramMemberId = '${memberId}'
            AND LoyaltyProgramCurrencyId = '${currency.LoyaltyProgramCurrencyId}'
            AND EventType = 'Debit'
          `);
          
          const credits = creditsResult.records[0]?.totalPoints || 0;
          const debits = debitsResult.records[0]?.totalPoints || 0;
          calculatedBalance = credits - debits;
          
          // Use calculated balance if PointsBalance is 0 or if last accrual date is old
          const lastAccrualDate = currency.LastAccrualProcessedDate 
            ? new Date(currency.LastAccrualProcessedDate) 
            : null;
          const hoursSinceLastAccrual = lastAccrualDate 
            ? (Date.now() - lastAccrualDate.getTime()) / (1000 * 60 * 60)
            : Infinity;
          
          // If balance is 0 but we have ledger entries, or if last accrual was > 1 hour ago, use calculated
          if ((currency.PointsBalance === 0 && calculatedBalance > 0) || hoursSinceLastAccrual > 1) {
            console.log(`Using calculated balance: ${calculatedBalance} (PointsBalance: ${currency.PointsBalance}, LastAccrual: ${currency.LastAccrualProcessedDate})`);
          } else {
            // Use the official balance if it's recent
            calculatedBalance = currency.PointsBalance;
          }
        } catch (ledgerError) {
          // If ledger query fails, fall back to PointsBalance
          console.log('Could not calculate balance from ledger, using PointsBalance:', ledgerError.message);
          calculatedBalance = currency.PointsBalance || 0;
        }
      }

      // Try to get member tier (if tiers are enabled in the org)
      let tier = null;
      try {
        const tierResult = await conn.query(`
          SELECT Id, TierGroupId, TierGroup.Name, TierLevel, 
                 TierExpirationDate, TierEffectiveDate
          FROM LoyaltyProgramMemberTier
          WHERE LoyaltyProgramMemberId = '${memberId}'
          AND TierEffectiveDate <= TODAY
          AND (TierExpirationDate = null OR TierExpirationDate >= TODAY)
          ORDER BY TierLevel DESC, TierEffectiveDate DESC
          LIMIT 1
        `);
        
        if (tierResult.totalSize > 0) {
          const tierData = tierResult.records[0];
          console.log(`[TIER] Found tier for member ${memberId}: ${tierData.TierGroup?.Name} (Level: ${tierData.TierLevel})`);
          tier = {
            name: tierData.TierGroup?.Name,
            level: tierData.TierLevel,
            expirationDate: tierData.TierExpirationDate
          };
        } else {
          console.log(`[TIER] No active tier found for member ${memberId}`);
        }
      } catch (tierError) {
        // Tiers not enabled or not available - that's okay
        console.log(`[TIER] Error fetching tier: ${tierError.message}`);
        console.log('Tiers not available (this is normal if tiers are not configured)');
      }

      return {
        memberId: member.Id,
        membershipNumber: member.MembershipNumber,
        memberStatus: member.MemberStatus,
        enrollmentDate: member.EnrollmentDate,
        contactId: member.ContactId,
        programId: member.ProgramId,
        pointsBalance: calculatedBalance, // Use calculated balance from ledger entries
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

  /**
   * Get eligible promotions for a member
   * Uses Salesforce Loyalty Management API
   */
  async getEligiblePromotions(membershipNumber) {
    const conn = await this.ensureConnection();
    
    try {
      const programName = process.env.LOYALTY_PROGRAM_NAME || 'Cirrus Loyalty';
      const instanceUrl = this.instanceUrl;
      
      // Salesforce Loyalty API endpoint for promotions
      const url = `${instanceUrl}/services/apexrest/LoyaltyProgramProcess/${programName}/GetPromotions`;
      
      const requestBody = {
        inputParameters: [{
          membershipNumber: membershipNumber
        }]
      };

      console.log(`[PROMOTIONS] Fetching promotions for member: ${membershipNumber}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${conn.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Promotions API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[PROMOTIONS] Raw API response for member ${membershipNumber}:`, JSON.stringify(data, null, 2));
      
      // Check if we got any results
      const results = data.outputParameters?.outputParameters?.results || [];
      console.log(`[PROMOTIONS] Number of promotions returned: ${results.length}`);
      
      if (results.length === 0) {
        console.log(`[PROMOTIONS] No promotions found for member ${membershipNumber}. Possible reasons:`);
        console.log(`[PROMOTIONS] - Promotion not active or outside date range`);
        console.log(`[PROMOTIONS] - Member doesn't meet promotion eligibility conditions`);
        console.log(`[PROMOTIONS] - Promotion requires enrollment and member hasn't enrolled`);
        console.log(`[PROMOTIONS] - Promotion not associated with program "${programName}"`);
      }
      
      // Transform Salesforce response to our format
      const promotions = results.map(promo => {
        console.log(`[PROMOTIONS] Processing promotion: ${promo.promotionName || 'Unknown'} (ID: ${promo.promotionId})`);
        return {
        id: promo.promotionId || `promo-${Date.now()}`,
        name: promo.promotionName || 'Promotion',
        description: promo.description || '',
        promotionType: promo.loyaltyPromotionType === 'BONUS_POINTS' ? 'BONUS_POINTS' : 'PERCENTAGE_DISCOUNT',
        discountValue: promo.totalPromotionRewardPointsVal || promo.discountValue || 0,
        expiryDate: promo.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isEnrolled: promo.isEnrolled || false,
        imageUrl: null
      };
      });
      
      console.log(`[PROMOTIONS] Successfully processed ${promotions.length} promotions for member ${membershipNumber}`);

      return promotions;
    } catch (error) {
      console.error('Error getting promotions:', error);
      // Return empty array if API not available rather than failing
      console.log('Returning empty promotions list');
      return [];
    }
  }

  /**
   * Get vouchers for a member
   * Uses Salesforce Loyalty Management API
   */
  async getVouchers(membershipNumber) {
    const conn = await this.ensureConnection();
    
    try {
      const programName = process.env.LOYALTY_PROGRAM_NAME || 'Cirrus Loyalty';
      const instanceUrl = this.instanceUrl;
      
      // Salesforce Loyalty API endpoint for vouchers
      const url = `${instanceUrl}/services/apexrest/LoyaltyProgramProcess/${programName}/GetVouchers`;
      
      const params = new URLSearchParams({
        membershipNumber: membershipNumber,
        pageNumber: '1'
      });

      console.log(`[VOUCHERS] Fetching vouchers for member: ${membershipNumber}`);
      
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${conn.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vouchers API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[VOUCHERS] Raw response for member ${membershipNumber}:`, JSON.stringify(data, null, 2));
      
      // Transform Salesforce response to our format
      const vouchers = (data.voucherResponse || []).map((voucher, index) => {
        // Determine discount type - check multiple possible fields
        // Salesforce may store this in different fields depending on voucher definition
        const voucherDefType = voucher.voucherDefinitionType || voucher.voucherType || '';
        const isPercentage = voucherDefType.toLowerCase().includes('percentage') ||
                            voucherDefType.toLowerCase().includes('percent') ||
                            (voucher.faceValue && voucher.faceValue <= 100 && voucher.faceValue > 0 && 
                             voucher.faceValue % 1 === 0 && voucher.faceValue < 1000); // Likely percentage if integer <= 100
        
        const faceValue = voucher.faceValue || voucher.discountValue || 0;
        
        return {
          id: voucher.id || `voucher-${Date.now()}-${index}`,
          code: voucher.voucherCode || '',
          name: voucher.voucherDefinition || voucher.voucherDefinitionName || 'Voucher',
          description: voucher.description || '',
          discountAmount: isPercentage ? 0 : faceValue, // Fixed amount discount
          discountPercentage: isPercentage ? faceValue : null, // Percentage discount (0-100)
          discountType: isPercentage ? 'PERCENTAGE' : 'FIXED_AMOUNT',
          expiryDate: voucher.expirationDate || voucher.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: voucher.status === 'Issued' ? 'AVAILABLE' : 
                  voucher.status === 'Redeemed' ? 'REDEEMED' : 
                  voucher.status === 'Expired' ? 'EXPIRED' : 'AVAILABLE',
          minimumPurchase: voucher.minimumPurchaseAmount || voucher.minimumPurchase || 0
        };
      });

      return vouchers;
    } catch (error) {
      console.error('Error getting vouchers:', error);
      // Return empty array if API not available rather than failing
      console.log('Returning empty vouchers list');
      return [];
    }
  }
}

// Export singleton instance
module.exports = new SalesforceService();
