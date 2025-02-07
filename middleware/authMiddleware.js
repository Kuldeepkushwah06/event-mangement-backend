const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  console.log('Auth Headers:', req.headers.authorization);
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token:', token);

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded Token:', decoded);
      if (!decoded.userId) {
        throw new Error('Invalid token payload');
      }

      // Get user from token
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      req.user = user;

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized: ' + error.message);
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

module.exports = { protect }; 