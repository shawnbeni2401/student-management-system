const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isRole } = require('../middlewares/auth');

router.get('/stats', [verifyToken, isRole(['admin'])], adminController.getDashboardStats);

module.exports = router;
