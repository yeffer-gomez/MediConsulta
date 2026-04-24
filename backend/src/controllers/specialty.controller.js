const { pool } = require('../config/database');

const getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM specialties WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const create = async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query('INSERT INTO specialties (name, description) VALUES ($1, $2) RETURNING *', [name, description]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Specialty already exists' });
    res.status(500).json({ error: 'Server error' });
  }
};

const update = async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query('UPDATE specialties SET name=$1, description=$2 WHERE id=$3 RETURNING *', [name, description, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Specialty not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    await pool.query('UPDATE specialties SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Specialty deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, create, update, remove };
