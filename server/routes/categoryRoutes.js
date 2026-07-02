const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM stall_categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Category name required.' });
  try {
    const [result] = await db.execute('INSERT INTO stall_categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, message: 'Category created.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    await db.execute('DELETE FROM stall_categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
