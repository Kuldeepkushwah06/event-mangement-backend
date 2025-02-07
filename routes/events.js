const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  attendEvent,
  addComment,
  deleteComment,
  getPublicEvents,
  getPublicEvent
} = require('../controllers/eventController');
const Event = require('../models/Event');

// Public routes (must be defined before protected routes)
router.get('/public', getPublicEvents);
router.get('/public/:id', getPublicEvent);

// Protected routes
router.route('/').get(protect, getEvents).post(protect, createEvent);
router.route('/:id').get(protect, getEvent).put(protect, updateEvent).delete(protect, deleteEvent);
router.route('/:id/attend').post(protect, attendEvent);
router.route('/:id/comments').post(protect, addComment);
router.route('/:id/comments/:commentId').delete(protect, deleteComment);

module.exports = router; 