const express = require('express');
const router  = express.Router();
const { getAll, getOne, create, update, remove, getHistory, addHistory, getAllHistory, deleteHistory } = require('../controllers/stallController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ⚠ Static routes MUST come before dynamic /:id routes
router.get('/',              authMiddleware, getAll);
router.get('/all-history',   authMiddleware, getAllHistory);  // all past owners — must be before /:id
router.get('/:id',           authMiddleware, getOne);
router.get('/:id/history',   authMiddleware, getHistory);
router.post('/:id/history',         authMiddleware, roleMiddleware('admin','cashier','staff'), addHistory);
router.delete('/:id/history/:hid',  authMiddleware, roleMiddleware('admin'), deleteHistory);
router.post('/',          authMiddleware, roleMiddleware('admin','cashier','staff'), create);
router.put('/:id',        authMiddleware, roleMiddleware('admin','cashier','staff'), update);
router.delete('/:id',     authMiddleware, roleMiddleware('admin'), remove);

module.exports = router;