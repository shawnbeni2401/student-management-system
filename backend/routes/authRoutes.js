const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isRole } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Publicly available to authenticated users to get list of users (e.g. students)
router.get('/users', [verifyToken], authController.getUsers);

// Admin only: verify user
router.put('/verify-user', [verifyToken, isRole(['admin'])], authController.updateUserStatus);

// Admin only: delete user
router.delete('/users/:id', [verifyToken, isRole(['admin'])], authController.deleteUser);

module.exports = router;
