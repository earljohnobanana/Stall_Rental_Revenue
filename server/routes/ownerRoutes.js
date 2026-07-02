const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/ownerController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, getAll);
router.post('/', authMiddleware, roleMiddleware('admin', 'cashier', 'staff'), create);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'cashier', 'staff'), update);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), remove);

module.exports = router;
