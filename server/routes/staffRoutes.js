const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/staffController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All staff routes are admin-only
router.get('/', authMiddleware, roleMiddleware('admin'), getAll);
router.post('/', authMiddleware, roleMiddleware('admin'), create);
router.put('/:id', authMiddleware, roleMiddleware('admin'), update);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), remove);

module.exports = router;
