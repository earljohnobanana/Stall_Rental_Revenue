const express = require('express');
const router  = express.Router();
const { getOwnerBalance, settleBalance, getAllBalances } = require('../controllers/balanceController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/',                     authMiddleware, getAllBalances);
router.get('/owner/:owner_id',      authMiddleware, getOwnerBalance);
router.patch('/:balance_id/settle', authMiddleware, roleMiddleware('admin','cashier'), settleBalance);

module.exports = router;