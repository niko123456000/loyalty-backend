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
   * Get OAuth redirect URI - use environment variable or detect from Heroku
   */
  getRedirectUri() {
    // Use environment variable if set (highest priority)
    if (process.env.OAUTH_REDIRECT_URI) {
      return process.env.OAUTH_REDIRECT_URI;
    }
    
    // Always use Heroku URL for OAuth (even when running locally)
    // OAuth callbacks must go to the deployed Heroku app
    const appName = process.env.HEROKU_APP_NAME || 'loyalty-backend-demo-714241525c2e';
    return `https://${appName}.herokuapp.com/oauth/callback`;
  }

  /**
   * Get OAuth login URL - use environment variable or detect from Heroku
   */
  getOAuthLoginUrl() {
    // Use environment variable if set (highest priority)
    if (process.env.OAUTH_LOGIN_URL) {
      return process.env.OAUTH_LOGIN_URL;
    }
    
    // Always use Heroku URL for OAuth (even when running locally)
    // OAuth callbacks must go to the deployed Heroku app
    const appName = process.env.HEROKU_APP_NAME || 'loyalty-backend-demo-714241525c2e';
    return `https://${appName}.herokuapp.com/oauth/login`;
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
            redirectUri: this.getRedirectUri(),
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
      const oauthLoginUrl = this.getOAuthLoginUrl();
      console.log('\n' + '='.repeat(60));
      console.log('⚠️  MANUAL AUTHORIZATION REQUIRED');
      console.log('='.repeat(60));
      console.log('\nNo valid Salesforce credentials found.');
      console.log('\nTo authorize the backend, open this URL in your browser:');
      console.log(`\n  👉  ${oauthLoginUrl}\n`);
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
          redirectUri: this.getRedirectUri(),
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
   * Get Loyalty Program ID by name
   */
  async getLoyaltyProgramId(programName = null) {
    const conn = await this.ensureConnection();
    
    try {
      const name = programName || process.env.LOYALTY_PROGRAM_NAME || 'Cirrus Loyalty';
      const query = `SELECT Id, Name FROM LoyaltyProgram WHERE Name = '${name.replace(/'/g, "\\'")}' LIMIT 1`;
      const result = await conn.query(query);
      
      if (result.totalSize === 0) {
        throw new Error(`Loyalty Program "${name}" not found`);
      }
      
      return result.records[0].Id;
    } catch (error) {
      console.error('Error finding loyalty program:', error);
      throw error;
    }
  }

  /**
   * Create or find a Contact by email
   */
  async findOrCreateContact(email, firstName, lastName) {
    const conn = await this.ensureConnection();
    
    try {
      // First, try to find existing contact
      const query = `SELECT Id, Name, Email FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`;
      const result = await conn.query(query);
      
      if (result.totalSize > 0) {
        console.log('Found existing contact:', result.records[0].Email);
        return result.records[0];
      }
      
      // Create new contact
      const contactData = {
        FirstName: firstName,
        LastName: lastName,
        Email: email
      };
      
      const contact = await conn.sobject('Contact').create(contactData);
      console.log('Created new contact:', contact.id);
      
      // Retrieve the created contact
      const newContact = await conn.sobject('Contact').retrieve(contact.id);
      return newContact;
    } catch (error) {
      console.error('Error creating/finding contact:', error);
      throw error;
    }
  }

  /**
   * Create a new Loyalty Program Member
   */
  async createLoyaltyMember(membershipNumber, contactId, programId = null) {
    const conn = await this.ensureConnection();
    
    try {
      // Get program ID if not provided
      if (!programId) {
        programId = await this.getLoyaltyProgramId();
      }
      
      // Check if membership number already exists
      const existingMember = await this.findMemberByNumber(membershipNumber);
      if (existingMember) {
        throw new Error(`Membership number ${membershipNumber} already exists`);
      }
      
      // Create the loyalty program member
      const memberData = {
        ProgramId: programId,
        ContactId: contactId,
        MembershipNumber: membershipNumber,
        MemberStatus: 'Active',
        EnrollmentDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        EnrollmentChannel: 'Web'
      };
      
      console.log('Creating loyalty member with data:', memberData);
      const result = await conn.sobject('LoyaltyProgramMember').create(memberData);
      
      if (!result.success) {
        const errorMsg = result.errors 
          ? result.errors.map(e => `${e.statusCode}: ${e.message}`).join(', ')
          : 'Unknown error';
        throw new Error(`Failed to create member: ${errorMsg}`);
      }
      
      console.log('Created loyalty member:', result.id);
      
      // Retrieve the created member
      const newMember = await conn.sobject('LoyaltyProgramMember').retrieve(result.id);
      return newMember;
    } catch (error) {
      console.error('Error creating loyalty member:', error);
      throw error;
    }
  }

  /**
   * Get member loyalty profile with points balance
   */
  async getMemberProfile(memberId) {
    const conn = await this.ensureConnection();
    
    try {
      // Get member details - try to include tier field if available
      const member = await conn.sobject('LoyaltyProgramMember').retrieve(memberId);
      
      console.log('[MEMBER] Member fields:', Object.keys(member));
      
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

      // Get member tier from LoyaltyMemberTier object
      let tier = null;
      
      try {
        console.log(`[TIER] Querying LoyaltyMemberTier for member ${memberId}`);
        
        const tierResult = await conn.query(`
          SELECT Id, LoyaltyTierId, LoyaltyTier.Name, LoyaltyTier.SequenceNumber,
                 EffectiveDate, TierExpirationDate,
                 LoyaltyTierGroupId, LoyaltyTierGroup.Name
          FROM LoyaltyMemberTier
          WHERE LoyaltyMemberId = '${memberId}'
          AND EffectiveDate <= TODAY
          ORDER BY EffectiveDate DESC
          LIMIT 1
        `);
        
        console.log(`[TIER] Query returned ${tierResult.totalSize} records`);
        
        if (tierResult.totalSize > 0) {
          const tierData = tierResult.records[0];
          console.log(`[TIER] Found tier:`, JSON.stringify(tierData, null, 2));
          
          tier = {
            name: tierData.LoyaltyTier?.Name || tierData.LoyaltyTierGroup?.Name || 'Member',
            level: tierData.LoyaltyTier?.SequenceNumber || 1,
            expirationDate: tierData.TierExpirationDate
          };
          
          console.log(`[TIER] Returning tier: ${tier.name} (Level: ${tier.level})`);
        } else {
          console.log(`[TIER] No tier found for member ${memberId}`);
          tier = { name: 'Standard', level: 1 };
        }
      } catch (tierError) {
        console.log(`[TIER] Error fetching tier: ${tierError.message}`);
        console.log('[TIER] Using default tier');
        tier = { name: 'Standard', level: 1 };
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
  async createTransactionJournal(membershipNumber, lineItems, voucherCode = null) {
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
      if (voucherCode) {
        console.log('Transaction includes voucher:', voucherCode);
      }

      const result = await conn.apex.post(
        '/CreateAndProcessTransactionJournal',
        payload
      );

      console.log('Transaction result:', JSON.stringify(result, null, 2));
      
      // Extract transaction journal ID - check multiple possible field names
      const transactionJournalId = result.transactionJournalId || 
                                   result.transactionJournal?.Id || 
                                   result.id || 
                                   result.Id ||
                                   result.journalId;
      
      console.log(`[TRANSACTION] TransactionJournalId: ${transactionJournalId || 'NOT FOUND'}`);
      console.log(`[TRANSACTION] Result keys:`, Object.keys(result));
      
      // If voucher was used, redeem it and link both ways
      if (voucherCode && result.success) {
        if (!transactionJournalId) {
          console.error(`[VOUCHER] WARNING: Transaction succeeded but no TransactionJournalId returned. Result:`, result);
        } else {
          try {
            // First, update the Transaction Journal to include the VoucherCode
            console.log(`[TRANSACTION] Updating Transaction Journal ${transactionJournalId} with VoucherCode: ${voucherCode}`);
            try {
              const tjUpdateResult = await conn.sobject('TransactionJournal').update({
                Id: transactionJournalId,
                VoucherCode: voucherCode
              });
              
              if (Array.isArray(tjUpdateResult) && !tjUpdateResult[0]?.success) {
                console.warn(`[TRANSACTION] Failed to update Transaction Journal VoucherCode:`, tjUpdateResult[0]?.errors);
              } else {
                console.log(`[TRANSACTION] ✅ Successfully set VoucherCode on Transaction Journal`);
              }
            } catch (tjError) {
              console.warn(`[TRANSACTION] Could not update Transaction Journal VoucherCode (may not have permission):`, tjError.message);
            }
            
            // Then redeem the voucher and link it to the Transaction Journal
            await this.redeemVoucher(membershipNumber, voucherCode, transactionJournalId);
            console.log(`[VOUCHER] Successfully redeemed voucher: ${voucherCode} and linked to TransactionJournal: ${transactionJournalId}`);
          } catch (voucherError) {
            console.error(`[VOUCHER] Failed to redeem voucher ${voucherCode}:`, voucherError.message);
            console.error(`[VOUCHER] Error details:`, voucherError);
            // Don't fail the whole transaction if voucher redemption fails, but log it clearly
          }
        }
      }
      
      // Ensure transactionJournalId is in the result
      if (transactionJournalId && !result.transactionJournalId) {
        result.transactionJournalId = transactionJournalId;
      }
      
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Redeem a voucher by updating its status
   */
  async redeemVoucher(membershipNumber, voucherCode, transactionJournalId = null) {
    const conn = await this.ensureConnection();
    
    try {
      console.log(`[VOUCHER] Redeeming voucher ${voucherCode} for member ${membershipNumber}`);
      
      // Find the voucher by code and member
      const member = await this.findMemberByNumber(membershipNumber);
      if (!member) {
        throw new Error(`Member not found: ${membershipNumber}`);
      }
      
      // Query voucher - check multiple status values to be more flexible
      const voucherResult = await conn.query(`
        SELECT Id, Status, FaceValue, RedeemedValue, RemainingValue, VoucherCode
        FROM Voucher
        WHERE VoucherCode = '${voucherCode.replace(/'/g, "\\'")}'
        AND LoyaltyProgramMemberId = '${member.Id}'
        AND (Status = 'Issued' OR Status = 'Available' OR Status = 'Active')
        LIMIT 1
      `);
      
      if (voucherResult.totalSize === 0) {
        // Try without status filter to see what status it actually has
        const checkResult = await conn.query(`
          SELECT Id, Status, VoucherCode
          FROM Voucher
          WHERE VoucherCode = '${voucherCode.replace(/'/g, "\\'")}'
          AND LoyaltyProgramMemberId = '${member.Id}'
          LIMIT 1
        `);
        
        if (checkResult.totalSize > 0) {
          const foundVoucher = checkResult.records[0];
          throw new Error(`Voucher ${voucherCode} found but has status '${foundVoucher.Status}' (expected: Issued, Available, or Active)`);
        } else {
          throw new Error(`Voucher ${voucherCode} not found for member ${membershipNumber}`);
        }
      }
      
      const voucher = voucherResult.records[0];
      
      // Update voucher to Redeemed status
      const updateData = {
        Status: 'Redeemed',
        UseDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        RedeemedValue: voucher.FaceValue || 0
      };
      
      // Link to transaction journal if provided
      if (transactionJournalId) {
        updateData.TransactionJournalId = transactionJournalId;
        console.log(`[VOUCHER] Linking voucher ${voucher.Id} to TransactionJournal: ${transactionJournalId}`);
      } else {
        console.warn(`[VOUCHER] No TransactionJournalId provided - voucher will not be linked to transaction`);
      }
      
      console.log(`[VOUCHER] Updating voucher ${voucher.Id} (Code: ${voucherCode}) with data:`, JSON.stringify(updateData, null, 2));
      
      try {
        const updateResult = await conn.sobject('Voucher').update({
          Id: voucher.Id,
          ...updateData
        });
        
        // jsforce update returns the result directly, check for errors
        if (Array.isArray(updateResult)) {
          const result = updateResult[0];
          if (!result.success) {
            const errorMsg = result.errors 
              ? result.errors.map(e => `${e.statusCode}: ${e.message} (${e.fields?.join(', ') || ''})`).join(', ')
              : 'Unknown error';
            throw new Error(`Failed to update voucher: ${errorMsg}`);
          }
          console.log(`[VOUCHER] Voucher update successful. Result:`, result);
        } else if (updateResult.success === false) {
          const errorMsg = updateResult.errors 
            ? updateResult.errors.map(e => `${e.statusCode}: ${e.message}`).join(', ')
            : 'Unknown error';
          throw new Error(`Failed to update voucher: ${errorMsg}`);
        }
        
        // Verify the update by retrieving the voucher
        const updatedVoucher = await conn.sobject('Voucher').retrieve(voucher.Id);
        console.log(`[VOUCHER] Verified voucher update - Status: ${updatedVoucher.Status}, TransactionJournalId: ${updatedVoucher.TransactionJournalId || 'null'}`);
        
        if (transactionJournalId && updatedVoucher.TransactionJournalId !== transactionJournalId) {
          console.error(`[VOUCHER] WARNING: Voucher TransactionJournalId mismatch! Expected: ${transactionJournalId}, Got: ${updatedVoucher.TransactionJournalId}`);
        }
        
        console.log(`[VOUCHER] ✅ Voucher ${voucherCode} (ID: ${voucher.Id}) successfully marked as Redeemed and linked to TransactionJournal: ${updatedVoucher.TransactionJournalId || 'none'}`);
      } catch (updateError) {
        console.error(`[VOUCHER] Error updating voucher:`, updateError);
        console.error(`[VOUCHER] Update data was:`, JSON.stringify(updateData, null, 2));
        throw updateError;
      }
      
      return {
        success: true,
        voucherId: voucher.Id,
        redeemedValue: voucher.FaceValue
      };
      
    } catch (error) {
      console.error(`[VOUCHER] Error redeeming voucher:`, error);
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
   * Query directly from Voucher object
   */
  async getVouchers(membershipNumber) {
    const conn = await this.ensureConnection();
    
    try {
      console.log(`[VOUCHERS] Fetching vouchers for member: ${membershipNumber}`);
      
      // First, get the member ID
      const member = await this.findMemberByNumber(membershipNumber);
      if (!member) {
        console.log(`[VOUCHERS] Member not found: ${membershipNumber}`);
        return [];
      }
      
      const memberId = member.Id;
      console.log(`[VOUCHERS] Querying vouchers for member ID: ${memberId}`);
      
      // Query Voucher records for this member
      const voucherResult = await conn.query(`
        SELECT Id, VoucherCode, Name, Status, EffectiveDate, ExpirationDate,
               FaceValue, DiscountPercent, RedeemedValue, RemainingValue,
               VoucherDefinitionId, VoucherDefinition.Name, 
               VoucherDefinition.Description, VoucherDefinition.Type,
               LoyaltyProgramMemberId, UseDate, PromotionId
        FROM Voucher
        WHERE LoyaltyProgramMemberId = '${memberId}'
        ORDER BY EffectiveDate DESC
        LIMIT 50
      `);
      
      console.log(`[VOUCHERS] Found ${voucherResult.totalSize} vouchers for member ${membershipNumber}`);
      
      if (voucherResult.totalSize === 0) {
        return [];
      }
      
      // Transform Salesforce voucher records to our format
      const vouchers = voucherResult.records.map((voucher, index) => {
        console.log(`[VOUCHERS] Processing voucher ${index + 1}:`, {
          code: voucher.VoucherCode,
          name: voucher.Name,
          status: voucher.Status,
          voucherType: voucher.VoucherDefinition?.Type,
          faceValue: voucher.FaceValue,
          discountPercent: voucher.DiscountPercent
        });
        
        // Determine discount type and value
        const voucherType = voucher.VoucherDefinition?.Type || '';
        const isPercentage = voucherType.toLowerCase().includes('percentage') ||
                            voucherType.toLowerCase().includes('percent') ||
                            voucher.DiscountPercent != null;
        
        const discountValue = voucher.DiscountPercent || voucher.FaceValue || 0;
        
        return {
          id: voucher.Id,
          code: voucher.VoucherCode || voucher.Name || '',
          name: voucher.VoucherDefinition?.Name || 'Voucher',
          description: voucher.VoucherDefinition?.Description || '',
          discountAmount: isPercentage ? 0 : discountValue,
          discountPercentage: isPercentage ? discountValue : null,
          discountType: isPercentage ? 'PERCENTAGE' : 'FIXED_AMOUNT',
          expiryDate: voucher.ExpirationDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: voucher.Status === 'Issued' ? 'AVAILABLE' : 
                  voucher.Status === 'Redeemed' ? 'REDEEMED' : 
                  voucher.Status === 'Expired' ? 'EXPIRED' : 'AVAILABLE',
          minimumPurchase: 0
        };
      });
      
      console.log(`[VOUCHERS] Successfully processed ${vouchers.length} vouchers`);
      return vouchers;
      
    } catch (error) {
      console.error('[VOUCHERS] Error getting vouchers:', error.message);
      console.error('[VOUCHERS] Stack:', error.stack);
      // Return empty array if query fails rather than failing the whole request
      return [];
    }
  }
}

// Export singleton instance
module.exports = new SalesforceService();
