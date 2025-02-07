const Event = require('../models/Event');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Create new event
// @route   POST /api/events
// @access  Private
const createEvent = asyncHandler(async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      res.status(401);
      throw new Error('User not authenticated');
    }

    const event = new Event({
      ...req.body,
      creator: req.user._id
    });

    if (!event) {
      res.status(400);
      throw new Error('Invalid event data');
    }

    await event.save();

    // Add event to user's created events
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdEvents: event._id }
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    if (!populatedEvent) {
      res.status(500);
      throw new Error('Event created but could not retrieve details');
    }

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500);
    throw new Error(error.message || 'Error creating event');
  }
});

// @desc    Get all events
// @route   GET /api/events
// @access  Private
const getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find()
    .populate('creator', 'name email')
    .populate('attendees', 'name email')
    .populate({
      path: 'comments',
      populate: { path: 'user', select: 'name email' }
    });
  res.json(events);
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('creator', 'name email')
    .populate('attendees', 'name email')
    .populate({
      path: 'comments',
      populate: { path: 'user', select: 'name email' }
    });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  res.json(event);
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  if (event.creator.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  Object.assign(event, req.body);
  await event.save();
  res.json(event);
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id });
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  if (event.creator.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  await Event.findByIdAndDelete(req.params.id);
  
  // Remove event from user's created events
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { createdEvents: event._id }
  });

  // Remove event from all attendees' attending events
  await User.updateMany(
    { attendingEvents: event._id },
    { $pull: { attendingEvents: event._id } }
  );

  res.json({ message: 'Event deleted' });
});

const attendEvent = asyncHandler(async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Check if user is the creator
    if (event.creator.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('Cannot attend your own event');
    }

    if (event.attendees.includes(req.user._id)) {
      res.status(400);
      throw new Error('Already attending this event');
    }

    if (event.attendees.length >= event.maxAttendees) {
      res.status(400);
      throw new Error('Event is full');
    }

    event.attendees.push(req.user._id);
    await event.save();

    // Add event to user's attending events
    await User.findByIdAndUpdate(req.user._id, {
      $push: { attendingEvents: event._id }
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    res.json(populatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error attending event' });
  }
});

// @desc    Add comment to event
// @route   POST /api/events/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  const comment = {
    content: req.body.content,
    user: req.user._id
  };

  event.comments.push(comment);
  await event.save();

  const populatedEvent = await Event.findById(req.params.id)
    .populate('creator', 'name email')
    .populate('attendees', 'name email')
    .populate({
      path: 'comments',
      populate: { path: 'user', select: 'name email' }
    });

  res.status(201).json(populatedEvent);
});

// @desc    Delete comment
// @route   DELETE /api/events/:id/comments/:commentId
// @access  Private
const deleteComment = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  event.comments = event.comments.filter(
    comment => comment._id.toString() !== req.params.commentId
  );

  await event.save();
  res.json({ message: 'Comment removed' });
});

// Add this controller function
const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creator', 'name')
      .populate('attendees', 'name');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events' });
  }
};

const getPublicEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name')
      .populate('attendees', 'name');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event' });
  }
};

module.exports = {
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
}; 