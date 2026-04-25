const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { verifyToken, isRole } = require('../middlewares/auth');

// Apply for an out-going permission (Student)
router.post('/apply', [verifyToken], permissionController.applyForPermission);

// Get a student's own permissions
router.get('/mine', [verifyToken], permissionController.getMyPermissions);

// Get all permissions (HOD sees their department's students)
router.get('/', [verifyToken, isRole(['hod', 'admin'])], permissionController.getPermissions);

// Update status (HOD)
router.put('/:id/status', [verifyToken, isRole(['hod', 'admin'])], permissionController.updatePermissionStatus);

module.exports = router;
