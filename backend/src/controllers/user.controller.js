const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, is_active, created_at FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const create = async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role',
      [email.toLowerCase(), hash, name, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
};

const toggleActive = async (req, res) => {
  try {
    const result = await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, create, toggleActive };
