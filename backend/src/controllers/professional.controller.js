const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const getAll = async (req, res) => {
  const { specialty_id, search } = req.query;
  let where = 'WHERE p.is_active = true';
  const params = [];

  if (specialty_id) { params.push(specialty_id); where += ` AND p.specialty_id = $${params.length}`; }
  if (search) { params.push(`%${search}%`); where += ` AND u.name ILIKE $${params.length}`; }

  try {
    const result = await pool.query(
      `SELECT p.id, p.license_number, p.phone, p.consultation_duration_minutes, p.is_active, p.specialty_id,
              u.id as user_id, u.name, u.email,
              s.name as specialty_name,
              COALESCE(json_agg(json_build_object('day_of_week', sc.day_of_week, 'start_time', sc.start_time, 'end_time', sc.end_time) ORDER BY sc.day_of_week) FILTER (WHERE sc.id IS NOT NULL), '[]') as schedules
       FROM professionals p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN specialties s ON p.specialty_id = s.id
       LEFT JOIN schedules sc ON sc.professional_id = p.id AND sc.is_active = true
       ${where}
       GROUP BY p.id, u.id, s.name
       ORDER BY u.name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name, u.email, s.name as specialty_name,
              COALESCE(json_agg(json_build_object('id', sc.id, 'day_of_week', sc.day_of_week, 'start_time', sc.start_time, 'end_time', sc.end_time)) FILTER (WHERE sc.id IS NOT NULL), '[]') as schedules
       FROM professionals p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN specialties s ON p.specialty_id = s.id
       LEFT JOIN schedules sc ON sc.professional_id = p.id AND sc.is_active = true
       WHERE p.id = $1
       GROUP BY p.id, u.name, u.email, s.name`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Professional not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const create = async (req, res) => {
  const { name, email, password, specialty_id, license_number, phone, consultation_duration_minutes, schedules } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password || 'Clinic123!', 10);
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email.toLowerCase(), hash, name, 'professional']
    );
    const user = userResult.rows[0];
    const profResult = await client.query(
      'INSERT INTO professionals (user_id, specialty_id, license_number, phone, consultation_duration_minutes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [user.id, specialty_id, license_number, phone, consultation_duration_minutes || 30]
    );
    const prof = profResult.rows[0];

    if (schedules && schedules.length) {
      for (const s of schedules) {
        await client.query(
          'INSERT INTO schedules (professional_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4) ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time=$3, end_time=$4, is_active=true',
          [prof.id, s.day_of_week, s.start_time, s.end_time]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ ...prof, name: user.name, email: user.email });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Email or license number already exists' });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

const update = async (req, res) => {
  const { name, email, specialty_id, license_number, phone, consultation_duration_minutes, schedules } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const profRes = await client.query('SELECT user_id FROM professionals WHERE id = $1', [req.params.id]);
    if (!profRes.rows.length) return res.status(404).json({ error: 'Professional not found' });

    await client.query('UPDATE users SET name=$1, email=$2 WHERE id=$3', [name, email, profRes.rows[0].user_id]);
    await client.query(
      'UPDATE professionals SET specialty_id=$1, license_number=$2, phone=$3, consultation_duration_minutes=$4 WHERE id=$5',
      [specialty_id, license_number, phone, consultation_duration_minutes, req.params.id]
    );

    if (schedules) {
      await client.query('UPDATE schedules SET is_active=false WHERE professional_id=$1', [req.params.id]);
      for (const s of schedules) {
        await client.query(
          'INSERT INTO schedules (professional_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4) ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time=$3, end_time=$4, is_active=true',
          [req.params.id, s.day_of_week, s.start_time, s.end_time]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Professional updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

const getAvailableSlots = async (req, res) => {
  const { date } = req.query;
  const { id } = req.params;
  if (!date) return res.status(400).json({ error: 'Date required' });

  try {
    const profResult = await pool.query(
      'SELECT p.consultation_duration_minutes, sc.start_time, sc.end_time FROM professionals p LEFT JOIN schedules sc ON sc.professional_id = p.id AND sc.is_active = true WHERE p.id = $1 AND sc.day_of_week = EXTRACT(DOW FROM $2::date)',
      [id, date]
    );

    if (!profResult.rows.length || !profResult.rows[0].start_time) {
      return res.json({ slots: [], message: 'Professional not available on this day' });
    }

    const { start_time, end_time, consultation_duration_minutes } = profResult.rows[0];
    const bookedResult = await pool.query(
      "SELECT scheduled_time FROM appointments WHERE professional_id = $1 AND scheduled_date = $2 AND status NOT IN ('cancelled', 'no_show')",
      [id, date]
    );

    const booked = new Set(bookedResult.rows.map(r => r.scheduled_time.substring(0, 5)));
    const slots = [];
    let current = start_time.substring(0, 5);
    const end = end_time.substring(0, 5);

    while (current < end) {
      const [h, m] = current.split(':').map(Number);
      const totalMin = h * 60 + m + consultation_duration_minutes;
      const nextH = Math.floor(totalMin / 60);
      const nextM = totalMin % 60;
      const next = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
      if (next > end) break;

      slots.push({ time: current, available: !booked.has(current) });
      current = next;
    }
    res.json({ slots, duration: consultation_duration_minutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, getAvailableSlots };
