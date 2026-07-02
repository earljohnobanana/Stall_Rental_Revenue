const express = require('express');
const router = express.Router();
const { getStats, getRevenueByMonth, getByBuilding } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/stats', authMiddleware, getStats);
router.get('/revenue', authMiddleware, getRevenueByMonth);
router.get('/buildings', authMiddleware, getByBuilding);

module.exports = router;
