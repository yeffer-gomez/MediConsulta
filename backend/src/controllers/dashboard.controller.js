const { pool } = require('../config/database');

const getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.substring(0, 7) + '-01';

    const patients      = await pool.query('SELECT COUNT(*) FROM patients WHERE is_active = true');
    const professionals = await pool.query('SELECT COUNT(*) FROM professionals WHERE is_active = true');
    const todayAppts    = await pool.query('SELECT COUNT(*) FROM appointments WHERE scheduled_date = $1', [today]);
    const monthAppts    = await pool.query("SELECT COUNT(*) FROM appointments WHERE scheduled_date >= $1 AND status != 'cancelled'", [firstOfMonth]);
    const statusStats   = await pool.query('SELECT status, COUNT(*) as count FROM appointments WHERE scheduled_date = $1 GROUP BY status', [today]);
    const upcoming      = await pool.query(
      `SELECT a.scheduled_time, a.status,
              CONCAT(pt.first_name,' ',pt.last_name) AS patient_name,
              u.name AS professional_name, s.name AS specialty_name
       FROM appointments a
       JOIN patients pt     ON a.patient_id      = pt.id
       JOIN professionals p ON a.professional_id = p.id
       JOIN users u         ON p.user_id         = u.id
       JOIN specialties s   ON a.specialty_id    = s.id
       WHERE a.scheduled_date = $1
       ORDER BY a.scheduled_time LIMIT 10`, [today]);

    res.json({
      totalPatients:      parseInt(patients.rows[0].count),
      totalProfessionals: parseInt(professionals.rows[0].count),
      todayAppointments:  parseInt(todayAppts.rows[0].count),
      monthAppointments:  parseInt(monthAppts.rows[0].count),
      todayByStatus:      statusStats.rows,
      upcomingToday:      upcoming.rows
    });
  } catch (err) {
    console.error('[dashboard] Error:', err.message);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

module.exports = { getStats };