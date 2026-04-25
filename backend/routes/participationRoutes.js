const express = require('express');
const router = express.Router();
const participationController = require('../controllers/participationController');
const { verifyToken, isRole } = require('../middlewares/auth');

// Apply to an event (Student)
router.post('/apply', [verifyToken], participationController.applyForEvent);

// Get event IDs a student has already applied to (for button state)
router.get('/my-events', [verifyToken], participationController.getMyAppliedEventIds);

// Get participations (Role-based filtering handled in controller)
router.get('/', [verifyToken], participationController.getParticipations);

// Update status (HOD)
router.put('/:id/status', [verifyToken, isRole(['hod', 'admin'])], participationController.updateParticipationStatus);

module.exports = router;
