const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT token
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No authorization header',
        message: 'Please provide a valid JWT token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Authorization header must include a Bearer token'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      memberId: decoded.memberId,
      membershipNumber: decoded.membershipNumber,
      contactId: decoded.contactId,
      programId: decoded.programId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please log in again'
      });
    }

    return res.status(401).json({ 
      error: 'Invalid token',
      message: error.message
    });
  }
}

module.exports = { authenticate };
