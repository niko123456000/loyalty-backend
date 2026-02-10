const express = require('express');
const salesforceService = require('../services/salesforce');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/loyalty/profile
 * Get member's loyalty profile with points balance
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const memberId = req.user.memberId;
    
    console.log('Fetching profile for member:', memberId);
    
    const profile = await salesforceService.getMemberProfile(memberId);
    
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/loyalty/transactions
 * Get member's recent transactions
 */
router.get('/transactions', authenticate, async (req, res, next) => {
  try {
    const memberId = req.user.memberId;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('Fetching transactions for member:', memberId);
    
    const transactions = await salesforceService.getMemberTransactions(memberId, limit);
    
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/loyalty/purchase
 * Process a purchase and award points
 */
router.post('/purchase', authenticate, async (req, res, next) => {
  try {
    const membershipNumber = req.user.membershipNumber;
    const { lineItems, voucherCode, promotionId } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ 
        error: 'Line items are required',
        message: 'Request must include an array of line items with productName, price, and quantity'
      });
    }

    console.log('Processing purchase for member:', membershipNumber);
    console.log('Line items:', lineItems);
    if (voucherCode) {
      console.log('Voucher code:', voucherCode);
    }
    if (promotionId) {
      console.log('Promotion ID:', promotionId);
    }

    // If voucher is provided, validate it first
    if (voucherCode) {
      const cartTotal = lineItems.reduce((sum, item) => 
        sum + (item.price * (item.quantity || 1)), 0
      );
      
      console.log(`[VOUCHER] Validating voucher ${voucherCode} for cart total: ${cartTotal}`);
      
      // Quick validation - get vouchers and check
      const vouchers = await salesforceService.getVouchers(membershipNumber);
      const voucher = vouchers.find(v => v.code.toLowerCase() === voucherCode.toLowerCase().trim());
      
      if (!voucher || voucher.status !== 'AVAILABLE') {
        return res.status(400).json({
          error: 'Invalid voucher',
          message: voucher ? `Voucher is ${voucher.status.toLowerCase()}` : 'Voucher not found'
        });
      }
      
      console.log(`[VOUCHER] Voucher validated: ${voucher.name}`);
    }

    // Calculate points earned (typically 1 point per dollar spent)
    const pointsEarned = lineItems.reduce((total, item) => {
      const itemTotal = item.price * (item.quantity || 1);
      // Round to nearest integer (1 point per dollar)
      return total + Math.round(itemTotal);
    }, 0);

    // Calculate coins earned (equal to transaction total amount)
    const transactionTotal = lineItems.reduce((total, item) => {
      return total + (item.price * (item.quantity || 1));
    }, 0);
    const coinsEarned = transactionTotal; // Coins = exact transaction total

    // Process the purchase with voucher
    const result = await salesforceService.createTransactionJournal(
      membershipNumber,
      lineItems,
      voucherCode,
      coinsEarned // Pass coins earned to transaction creation
    );

    res.json({
      success: true,
      message: voucherCode ? 'Purchase processed and voucher redeemed successfully' : 'Purchase processed successfully',
      voucherRedeemed: !!voucherCode,
      pointsEarned: pointsEarned,
      coinsEarned: coinsEarned,
      result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/loyalty/promotions
 * Get eligible promotions for the member
 */
router.get('/promotions', authenticate, async (req, res, next) => {
  try {
    const membershipNumber = req.user.membershipNumber;
    
    console.log(`[PROMOTIONS] Fetching promotions for member: ${membershipNumber}`);
    
    const promotions = await salesforceService.getEligiblePromotions(membershipNumber);
    
    console.log(`[PROMOTIONS] Found ${promotions.length} promotions for member ${membershipNumber}`);
    if (promotions.length > 0) {
      console.log(`[PROMOTIONS] Promotion names: ${promotions.map(p => p.name).join(', ')}`);
    }
    
    res.json({
      promotions,
      total: promotions.length
    });
  } catch (error) {
    console.error(`[PROMOTIONS] Error fetching promotions for member ${req.user.membershipNumber}:`, error);
    next(error);
  }
});

/**
 * GET /api/loyalty/vouchers
 * Get vouchers for the member
 */
router.get('/vouchers', authenticate, async (req, res, next) => {
  try {
    const membershipNumber = req.user.membershipNumber;
    
    console.log(`[VOUCHERS] Fetching vouchers for member: ${membershipNumber}`);
    
    const vouchers = await salesforceService.getVouchers(membershipNumber);
    
    console.log(`[VOUCHERS] Found ${vouchers.length} vouchers for member ${membershipNumber}`);
    if (vouchers.length > 0) {
      console.log(`[VOUCHERS] Voucher codes: ${vouchers.map(v => v.code).join(', ')}`);
      console.log(`[VOUCHERS] Voucher names: ${vouchers.map(v => v.name).join(', ')}`);
    }
    
    res.json({
      vouchers,
      total: vouchers.length
    });
  } catch (error) {
    console.error(`[VOUCHERS] Error fetching vouchers for member ${req.user.membershipNumber}:`, error);
    next(error);
  }
});

/**
 * POST /api/loyalty/vouchers/validate
 * Validate a voucher code and calculate discount
 */
router.post('/vouchers/validate', authenticate, async (req, res, next) => {
  try {
    const membershipNumber = req.user.membershipNumber;
    const { voucherCode, cartTotal } = req.body;

    if (!voucherCode) {
      return res.status(400).json({ 
        valid: false,
        error: 'Voucher code is required' 
      });
    }

    if (cartTotal === undefined || cartTotal < 0) {
      return res.status(400).json({ 
        valid: false,
        error: 'Valid cart total is required' 
      });
    }

    console.log('Validating voucher:', voucherCode, 'for cart total:', cartTotal);

    // Get all vouchers for the member
    const vouchers = await salesforceService.getVouchers(membershipNumber);
    
    // Find voucher by code
    const voucher = vouchers.find(v => 
      v.code.toLowerCase() === voucherCode.toLowerCase().trim()
    );

    if (!voucher) {
      return res.json({
        valid: false,
        error: 'Voucher code not found'
      });
    }

    // Check if voucher is available
    if (voucher.status !== 'AVAILABLE') {
      return res.json({
        valid: false,
        error: `Voucher is ${voucher.status.toLowerCase()}`
      });
    }

    // Check expiration
    const expiryDate = new Date(voucher.expiryDate);
    const now = new Date();
    if (expiryDate < now) {
      return res.json({
        valid: false,
        error: 'Voucher has expired'
      });
    }

    // Check minimum purchase requirement
    if (voucher.minimumPurchase > 0 && cartTotal < voucher.minimumPurchase) {
      return res.json({
        valid: false,
        error: `Minimum purchase of $${voucher.minimumPurchase.toFixed(2)} required`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (voucher.discountType === 'PERCENTAGE' && voucher.discountPercentage) {
      // Percentage discount: calculate from cart total
      discountAmount = (cartTotal * voucher.discountPercentage) / 100;
    } else {
      // Fixed amount discount
      discountAmount = voucher.discountAmount;
      // Don't allow discount to exceed cart total
      discountAmount = Math.min(discountAmount, cartTotal);
    }

    console.log('Voucher validated. Discount:', discountAmount);

    res.json({
      valid: true,
      voucher: voucher,
      discountAmount: Math.round(discountAmount * 100) / 100 // Round to 2 decimal places
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/loyalty/diagnose/:membershipNumber
 * Diagnostic endpoint to check member data and identify missing fields
 */
router.get('/diagnose/:membershipNumber', authenticate, async (req, res, next) => {
  try {
    const membershipNumber = req.params.membershipNumber;
    
    console.log(`[DIAGNOSE] Checking member: ${membershipNumber}`);
    
    const member = await salesforceService.findMemberByNumber(membershipNumber);
    
    if (!member) {
      return res.status(404).json({
        error: 'Member not found',
        membershipNumber: membershipNumber
      });
    }
    
    // Get detailed member profile
    const profile = await salesforceService.getMemberProfile(member.Id);
    
    // Get detailed currency information
    const conn = await salesforceService.ensureConnection();
    const memberCurrencies = await conn.query(`
      SELECT Id, PointsBalance, LoyaltyProgramCurrencyId, 
             LoyaltyProgramCurrency.Name, LoyaltyProgramCurrency.CurrencyIsoCode,
             LastAccrualProcessedDate
      FROM LoyaltyMemberCurrency
      WHERE LoyaltyMemberId = '${member.Id}'
    `);
    
    const programCurrencies = await conn.query(`
      SELECT Id, Name
      FROM LoyaltyProgramCurrency
      WHERE LoyaltyProgramId = '${member.ProgramId}'
    `);
    
    // Check for potential issues
    const issues = [];
    
    // Check if member has required currencies
    const hasCirrusBucks = memberCurrencies.records.some(c => 
      c.LoyaltyProgramCurrency?.Name === 'Cirrus Bucks'
    );
    const hasCirrusDiscountCoins = memberCurrencies.records.some(c => 
      c.LoyaltyProgramCurrency?.Name === 'Cirrus Discount Coins'
    );
    
    if (!hasCirrusBucks) {
      issues.push({
        severity: 'ERROR',
        field: 'LoyaltyMemberCurrency',
        issue: 'Member is missing "Cirrus Bucks" currency record',
        impact: 'Flow cannot process transactions - currency not found'
      });
    }
    
    if (!hasCirrusDiscountCoins) {
      issues.push({
        severity: 'WARNING',
        field: 'LoyaltyMemberCurrency',
        issue: 'Member is missing "Cirrus Discount Coins" currency record',
        impact: 'Coins cannot be awarded'
      });
    }
    
    const data = {
      member: {
        id: member.Id,
        membershipNumber: member.MembershipNumber,
        contactId: member.ContactId,
        contactName: member.Contact?.Name,
        contactEmail: member.Contact?.Email,
        memberStatus: member.MemberStatus,
        enrollmentDate: member.EnrollmentDate,
        programId: member.ProgramId,
        programName: member.Program?.Name
      },
      currencies: {
        memberCurrencies: memberCurrencies.records.map(c => ({
          id: c.Id,
          currencyId: c.LoyaltyProgramCurrencyId,
          currencyName: c.LoyaltyProgramCurrency?.Name,
          balance: c.PointsBalance,
          lastAccrualDate: c.LastAccrualProcessedDate
        })),
        programCurrencies: programCurrencies.records.map(c => ({
          id: c.Id,
          name: c.Name
        })),
        hasCirrusBucks: hasCirrusBucks,
        hasCirrusDiscountCoins: hasCirrusDiscountCoins
      },
      profile: {
        pointsBalance: profile.pointsBalance,
        coinsBalance: profile.coinsBalance,
        tier: profile.tier
      },
      issues: issues
    };
    
    // Check for missing Contact
    if (!member.ContactId) {
      issues.push({
        severity: 'ERROR',
        field: 'ContactId',
        issue: 'Member has no associated Contact record',
        impact: 'Flow may fail if Contact fields are required'
      });
    } else if (!member.Contact) {
      issues.push({
        severity: 'WARNING',
        field: 'Contact',
        issue: 'ContactId exists but Contact record could not be retrieved'
      });
    } else {
      if (!member.Contact.Email) {
        issues.push({
          severity: 'WARNING',
          field: 'Contact.Email',
          issue: 'Contact exists but Email field is null/empty'
        });
      }
      if (!member.Contact.Name) {
        issues.push({
          severity: 'WARNING',
          field: 'Contact.Name',
          issue: 'Contact exists but Name field is null/empty'
        });
      }
    }
    
    // Check for missing Program
    if (!member.ProgramId) {
      issues.push({
        severity: 'ERROR',
        field: 'ProgramId',
        issue: 'Member has no associated Program'
      });
    }
    
    // Check for missing tier
    if (!profile.tier || !profile.tier.name) {
      issues.push({
        severity: 'INFO',
        field: 'LoyaltyMemberTier',
        issue: 'No tier found - Member may not have a LoyaltyMemberTier record'
      });
    }
    
    // Update data.issues
    data.issues = issues;
    
    res.json({
      success: true,
      data: data,
      summary: {
        hasContact: !!member.ContactId,
        hasProgram: !!member.ProgramId,
        hasPointsCurrency: hasCirrusBucks,
        hasCoinsCurrency: hasCirrusDiscountCoins,
        hasTier: !!profile.tier && !!profile.tier.name,
        issueCount: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'ERROR').length
      }
    });
  } catch (error) {
    console.error('[DIAGNOSE] Error:', error);
    next(error);
  }
});

/**
 * GET /api/loyalty/check-currencies/:membershipNumber
 * Quick check of member's currency setup (simpler than diagnose)
 */
router.get('/check-currencies/:membershipNumber', authenticate, async (req, res, next) => {
  try {
    const membershipNumber = req.params.membershipNumber;
    const member = await salesforceService.findMemberByNumber(membershipNumber);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const conn = await salesforceService.ensureConnection();
    
    // Get member currencies
    const memberCurrencies = await conn.query(`
      SELECT Id, PointsBalance, LoyaltyProgramCurrencyId, 
             LoyaltyProgramCurrency.Name
      FROM LoyaltyMemberCurrency
      WHERE LoyaltyMemberId = '${member.Id}'
    `);
    
    // Get program currencies
    const programCurrencies = await conn.query(`
      SELECT Id, Name
      FROM LoyaltyProgramCurrency
      WHERE LoyaltyProgramId = '${member.ProgramId}'
    `);
    
    const memberCurrencyNames = memberCurrencies.records.map(c => c.LoyaltyProgramCurrency?.Name);
    const programCurrencyNames = programCurrencies.records.map(c => c.Name);
    
    const hasCirrusBucks = memberCurrencyNames.includes('Cirrus Bucks');
    const hasCirrusDiscountCoins = memberCurrencyNames.includes('Cirrus Discount Coins');
    
    const missingCurrencies = programCurrencyNames.filter(name => !memberCurrencyNames.includes(name));
    
    res.json({
      membershipNumber,
      memberId: member.Id,
      programId: member.ProgramId,
      memberCurrencies: memberCurrencyNames,
      programCurrencies: programCurrencyNames,
      hasCirrusBucks,
      hasCirrusDiscountCoins,
      missingCurrencies,
      status: missingCurrencies.length === 0 ? 'OK' : 'MISSING_CURRENCIES',
      message: missingCurrencies.length === 0 
        ? 'Member has all required currencies'
        : `Member is missing: ${missingCurrencies.join(', ')}`
    });
  } catch (error) {
    console.error('[CHECK-CURRENCIES] Error:', error);
    next(error);
  }
});

module.exports = router;
