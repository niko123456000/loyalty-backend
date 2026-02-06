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

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'JWT_SECRET is not configured'
      });
    }

    // Check if Salesforce is connected
    if (!salesforceService.isConnected()) {
      console.error('Salesforce is not connected');
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Salesforce connection is not available. Please try again later.'
      });
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
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Internal server error';
    const statusCode = error.statusCode || 500;
    
    res.status(statusCode).json({
      error: 'Login failed',
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error 
      })
    });
  }
});

/**
 * POST /api/auth/signup
 * Create a new membership
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, membershipNumber } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'First name, last name, and email are required'
      });
    }

    if (!membershipNumber) {
      return res.status(400).json({ 
        error: 'Membership number required',
        message: 'Please provide a membership number'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'JWT_SECRET is not configured'
      });
    }

    // Check if Salesforce is connected
    if (!salesforceService.isConnected()) {
      console.error('Salesforce is not connected');
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Salesforce connection is not available. Please try again later.'
      });
    }

    console.log('Signup attempt:', { firstName, lastName, email, membershipNumber });

    // Check if membership number already exists
    const existingMember = await salesforceService.findMemberByNumber(membershipNumber);
    if (existingMember) {
      return res.status(409).json({ 
        error: 'Membership number already exists',
        message: `Membership number ${membershipNumber} is already taken. Please choose a different number.`
      });
    }

    // Find or create contact
    const contact = await salesforceService.findOrCreateContact(email, firstName, lastName);

    // Create loyalty program member
    const member = await salesforceService.createLoyaltyMember(
      membershipNumber,
      contact.Id
    );

    // Generate JWT token
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

    console.log('Signup successful for member:', member.MembershipNumber);

    // Return token and member info
    res.status(201).json({
      token,
      member: {
        id: member.Id,
        membershipNumber: member.MembershipNumber,
        name: `${firstName} ${lastName}`,
        email: email,
        status: member.MemberStatus,
        enrollmentDate: member.EnrollmentDate
      },
      message: 'Membership created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error stack:', error.stack);
    
    const errorMessage = error.message || 'Internal server error';
    const statusCode = error.statusCode || 500;
    
    res.status(statusCode).json({
      error: 'Signup failed',
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error 
      })
    });
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
