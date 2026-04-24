const { pool } = require('../config/database');

const getAll = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = 'WHERE p.is_active = true';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.document_number ILIKE $${params.length})`;
  }

  try {
    const count = await pool.query(`SELECT COUNT(*) FROM patients p ${where}`, params);
    const result = await pool.query(
      `SELECT p.*, CONCAT(p.first_name, ' ', p.last_name) as full_name
       FROM patients p ${where}
       ORDER BY p.last_name, p.first_name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1 AND is_active = true', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const create = async (req, res) => {
  const { document_type, document_number, first_name, last_name, birth_date, gender, email, phone, address, city, blood_type, allergies, medical_history } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM patients WHERE document_number = $1', [document_number]);
    if (existing.rows.length) return res.status(409).json({ error: 'Patient with this document already exists' });

    const result = await pool.query(
      `INSERT INTO patients (document_type, document_number, first_name, last_name, birth_date, gender, email, phone, address, city, blood_type, allergies, medical_history)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [document_type, document_number, first_name, last_name, birth_date || null, gender, email, phone, address, city, blood_type, allergies, medical_history]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const update = async (req, res) => {
  const { first_name, last_name, birth_date, gender, email, phone, address, city, blood_type, allergies, medical_history } = req.body;
  try {
    const result = await pool.query(
      `UPDATE patients SET first_name=$1, last_name=$2, birth_date=$3, gender=$4, email=$5, phone=$6, address=$7, city=$8, blood_type=$9, allergies=$10, medical_history=$11
       WHERE id=$12 AND is_active=true RETURNING *`,
      [first_name, last_name, birth_date || null, gender, email, phone, address, city, blood_type, allergies, medical_history, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    await pool.query('UPDATE patients SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Patient deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, CONCAT(u.name) as professional_name, s.name as specialty_name
       FROM appointments a
       JOIN professionals p ON a.professional_id = p.id
       JOIN users u ON p.user_id = u.id
       JOIN specialties s ON a.specialty_id = s.id
       WHERE a.patient_id = $1
       ORDER BY a.scheduled_date DESC, a.scheduled_time DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, remove, getAppointments };
