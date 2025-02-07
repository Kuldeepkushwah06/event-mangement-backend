const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

exports.register = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('All fields are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(500);
    throw new Error('Error creating user: ' + error.message);
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // If email and password are correct
  try {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(401);
    throw new Error('Error during login: ' + error.message);
  }
});

exports.getMe = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('createdEvents')
      .populate('attendingEvents');
    res.json(user);
  } catch (error) {
    res.status(500);
    throw new Error('Error fetching user data');
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign(
    { userId: id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}; 