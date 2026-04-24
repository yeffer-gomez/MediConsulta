const { pool } = require('../config/database');

const BASE_SELECT = `
  SELECT a.id, a.scheduled_date, a.scheduled_time, a.duration_minutes, a.status, a.reason, a.notes, a.cancellation_reason,
         a.patient_id, CONCAT(pt.first_name, ' ', pt.last_name) as patient_name, pt.document_number, pt.phone as patient_phone,
         a.professional_id, u.name as professional_name,
         a.specialty_id, s.name as specialty_name,
         a.created_at
  FROM appointments a
  JOIN patients pt ON a.patient_id = pt.id
  JOIN professionals p ON a.professional_id = p.id
  JOIN users u ON p.user_id = u.id
  JOIN specialties s ON a.specialty_id = s.id
`;

const getAll = async (req, res) => {
  const { date, status, professional_id, patient_id, page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (date) { params.push(date); where += ` AND a.scheduled_date = $${params.length}`; }
  if (status) { params.push(status); where += ` AND a.status = $${params.length}`; }
  if (professional_id) { params.push(professional_id); where += ` AND a.professional_id = $${params.length}`; }
  if (patient_id) { params.push(patient_id); where += ` AND a.patient_id = $${params.length}`; }

  // Restrict professional to own appointments
  if (req.user.role === 'professional' && req.user.professionalId) {
    params.push(req.user.professionalId);
    where += ` AND a.professional_id = $${params.length}`;
  }

  try {
    const count = await pool.query(`SELECT COUNT(*) FROM appointments a ${where}`, params);
    const result = await pool.query(
      `${BASE_SELECT} ${where} ORDER BY a.scheduled_date DESC, a.scheduled_time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
    const result = await pool.query(`${BASE_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const create = async (req, res) => {
  const { patient_id, professional_id, specialty_id, scheduled_date, scheduled_time, reason, notes } = req.body;

  try {
    // Check professional schedule on that day
    const scheduleCheck = await pool.query(
      'SELECT sc.start_time, sc.end_time, p.consultation_duration_minutes FROM schedules sc JOIN professionals p ON sc.professional_id = p.id WHERE sc.professional_id = $1 AND sc.day_of_week = EXTRACT(DOW FROM $2::date) AND sc.is_active = true',
      [professional_id, scheduled_date]
    );
    if (!scheduleCheck.rows.length) return res.status(400).json({ error: 'Professional is not available on this day' });

    // Check conflict
    const conflict = await pool.query(
      "SELECT id FROM appointments WHERE professional_id = $1 AND scheduled_date = $2 AND scheduled_time = $3 AND status NOT IN ('cancelled','no_show')",
      [professional_id, scheduled_date, scheduled_time]
    );
    if (conflict.rows.length) return res.status(409).json({ error: 'Time slot already taken' });

    const duration = scheduleCheck.rows[0].consultation_duration_minutes;
    const result = await pool.query(
      'INSERT INTO appointments (patient_id, professional_id, specialty_id, scheduled_date, scheduled_time, duration_minutes, reason, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [patient_id, professional_id, specialty_id, scheduled_date, scheduled_time, duration, reason, notes, req.user.id]
    );

    const full = await pool.query(`${BASE_SELECT} WHERE a.id = $1`, [result.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const update = async (req, res) => {
  const { scheduled_date, scheduled_time, reason, notes, status } = req.body;
  try {
    if (scheduled_date && scheduled_time) {
      const conflict = await pool.query(
        "SELECT id FROM appointments WHERE professional_id = (SELECT professional_id FROM appointments WHERE id=$1) AND scheduled_date=$2 AND scheduled_time=$3 AND status NOT IN ('cancelled','no_show') AND id != $1",
        [req.params.id, scheduled_date, scheduled_time]
      );
      if (conflict.rows.length) return res.status(409).json({ error: 'Time slot already taken' });
    }

    const result = await pool.query(
      'UPDATE appointments SET scheduled_date=COALESCE($1,scheduled_date), scheduled_time=COALESCE($2,scheduled_time), reason=COALESCE($3,reason), notes=COALESCE($4,notes), status=COALESCE($5,status) WHERE id=$6 RETURNING *',
      [scheduled_date, scheduled_time, reason, notes, status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const cancel = async (req, res) => {
  const { cancellation_reason } = req.body;
  try {
    const result = await pool.query(
      "UPDATE appointments SET status='cancelled', cancellation_reason=$1 WHERE id=$2 AND status NOT IN ('cancelled','completed') RETURNING *",
      [cancellation_reason || 'Cancelled by user', req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Appointment not found or already cancelled' });
    res.json({ message: 'Appointment cancelled', appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getToday = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let where = `WHERE a.scheduled_date = '${today}'`;
  const params = [];

  if (req.user.role === 'professional' && req.user.professionalId) {
    params.push(req.user.professionalId);
    where += ` AND a.professional_id = $${params.length}`;
  }

  try {
    const result = await pool.query(`${BASE_SELECT} ${where} ORDER BY a.scheduled_time ASC`, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, cancel, getToday };
