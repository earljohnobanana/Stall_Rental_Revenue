const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/nightMarketController');
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleMiddleware');

// Stalls
router.get('/stalls',             auth, ctrl.getAllStalls);
router.post('/stalls',            auth, role('admin','cashier','staff'), ctrl.createStall);
router.put('/stalls/:id',         auth, role('admin','cashier','staff'), ctrl.updateStall);
router.delete('/stalls/:id',      auth, role('admin'), ctrl.deleteStall);
router.get('/stalls/:id/summary', auth, ctrl.getStallSummary);

// Payments
router.get('/payments',           auth, ctrl.getAllPayments);
router.post('/payments',          auth, role('admin','cashier','staff'), ctrl.createPayment);
router.delete('/payments/:id',    auth, role('admin'), ctrl.deletePayment);

// Stats & Reports
router.get('/stats',              auth, ctrl.getStats);
router.get('/report',             auth, ctrl.getReport);

module.exports = router;