const db = require('../database/db');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT b.*, COUNT(s.id) AS stall_count
      FROM buildings b
      LEFT JOIN stalls s ON s.building_id = b.id
      GROUP BY b.id
      ORDER BY b.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM buildings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Building not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  const { name, description, location } = req.body;
  if (!name) return res.status(400).json({ message: 'Building name is required.' });
  try {
    const [result] = await db.execute(
      'INSERT INTO buildings (name, description, location) VALUES (?, ?, ?)',
      [name, description || null, location || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Building created.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  const { name, description, location } = req.body;
  try {
    await db.execute(
      'UPDATE buildings SET name = ?, description = ?, location = ? WHERE id = ?',
      [name, description || null, location || null, req.params.id]
    );
    res.json({ message: 'Building updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await db.execute('DELETE FROM buildings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Building deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
