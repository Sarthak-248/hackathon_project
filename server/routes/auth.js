const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'medicine-companion-secret-key';

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('Register request body:', req.body);
    const { name, email, password, role, caregiverPIN } = req.body;

    const userPayload = { name, email, password, role };
    if (role === 'elderly') {
      if (!caregiverPIN) {
        return res.status(400).json({ error: 'Caregiver PIN is required for elderly users' });
      }
      userPayload.caregiverPIN = caregiverPIN;
    }

    console.log('Checking for existing user with email:', email);
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    console.log('Creating new user with payload:', userPayload);
    const user = new User(userPayload);
    await user.save();
    console.log('User saved successfully:', user);

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, caregiverPIN } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // If the user is an elderly user, a caregiver PIN is required
    if (user.role === 'elderly') {
      if (!caregiverPIN) {
        return res.status(400).json({ error: 'Caregiver PIN is required' });
      }
      const isPinMatch = await user.comparePIN(caregiverPIN);
      if (!isPinMatch) {
        return res.status(400).json({ error: 'Invalid Caregiver PIN' });
      }
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify caregiver PIN
router.post('/verify-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    const isValid = await req.user.comparePIN(pin);
    if (!isValid) return res.status(403).json({ error: 'Invalid PIN' });
    
    // Return a short-lived token for caregiver actions (5 min)
    const caregiverToken = jwt.sign(
      { userId: req.user._id, caregiverVerified: true },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    res.json({ verified: true, caregiverToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

module.exports = router;
