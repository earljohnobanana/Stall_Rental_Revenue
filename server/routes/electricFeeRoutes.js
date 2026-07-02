const express = require('express');
const router = express.Router();
const { getAll, upsert, markPaid, remove } = require('../controllers/electricFeeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/',         authMiddleware, getAll);
router.post('/',        authMiddleware, roleMiddleware('admin', 'cashier', 'staff'), upsert);
router.patch('/:id/pay',authMiddleware, roleMiddleware('admin', 'cashier'), markPaid);
router.delete('/:id',   authMiddleware, roleMiddleware('admin'), remove);

module.exports = router;
