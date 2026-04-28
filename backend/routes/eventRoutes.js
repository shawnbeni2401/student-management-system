const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, isRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Create event (Staff, Admin, HOD)
router.post('/', [verifyToken, isRole(['staff', 'admin', 'hod']), upload.single('poster')], eventController.createEvent);

// Update event (Staff, Admin, HOD)
router.put('/:id', [verifyToken, isRole(['staff', 'admin', 'hod']), upload.single('poster')], eventController.updateEvent);

// Get all events
router.get('/', [verifyToken], eventController.getEvents);

// Get specific event
router.get('/:id', [verifyToken], eventController.getEventById);

// Delete event (Staff, Admin, HOD - ownership check in controller)
router.delete('/:id', [verifyToken, isRole(['staff', 'admin', 'hod'])], eventController.deleteEvent);

module.exports = router;
