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
    const { lineItems } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ 
        error: 'Line items are required',
        message: 'Request must include an array of line items with productName, price, and quantity'
      });
    }

    console.log('Processing purchase for member:', membershipNumber);
    console.log('Line items:', lineItems);

    const result = await salesforceService.createTransactionJournal(
      membershipNumber,
      lineItems
    );

    res.json({
      success: true,
      message: 'Purchase processed successfully',
      result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
