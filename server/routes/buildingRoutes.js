const express = require('express');
const router = express.Router();
const { getAll, getOne, create, update, remove } = require('../controllers/buildingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, getAll);
router.get('/:id', authMiddleware, getOne);
router.post('/', authMiddleware, roleMiddleware('admin', 'cashier'), create);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'cashier'), update);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), remove);

module.exports = router;
