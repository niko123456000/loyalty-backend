const express = require('express');
const jwt = require('jsonwebtoken');
const salesforceService = require('../services/salesforce');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with membership number
 */
router.post('/login', async (req, res, next) => {
  try {
    const { membershipNumber } = req.body;

    if (!membershipNumber) {
      return res.status(400).json({ error: 'Membership number is required' });
    }

    console.log('Login attempt with membership number:', membershipNumber);

    // Find member in Salesforce
    const member = await salesforceService.findMemberByNumber(membershipNumber);

    if (!member) {
      return res.status(404).json({ 
        error: 'Member not found',
        message: 'Invalid membership number or not enrolled in the loyalty program'
      });
    }

    // Check member status
    if (member.MemberStatus !== 'Active') {
      return res.status(403).json({ 
        error: 'Member account not active',
        message: `Member status: ${member.MemberStatus}`
      });
    }

    // Generate JWT token for this customer session
    const token = jwt.sign(
      {
        memberId: member.Id,
        membershipNumber: member.MembershipNumber,
        contactId: member.ContactId,
        programId: member.ProgramId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for member:', member.MembershipNumber);

    // Return token and basic member info
    res.json({
      token,
      member: {
        id: member.Id,
        membershipNumber: member.MembershipNumber,
        name: member.Contact?.Name,
        email: member.Contact?.Email,
        status: member.MemberStatus,
        enrollmentDate: member.EnrollmentDate,
        programName: member.Program?.Name
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token is valid
 */
router.post('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, memberId: decoded.memberId });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

module.exports = router;
