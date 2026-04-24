const bcrypt = require('bcryptjs');
const { pool } = require('./database');

async function seedUsers() {
  const users = [
    { email: 'admin@clinica.com',       name: 'Administrador Sistema', role: 'admin',         password: 'Admin123!' },
    { email: 'recepcion@clinica.com',   name: 'María García',          role: 'receptionist',  password: 'Recep123!' },
    { email: 'dr.perez@clinica.com',    name: 'Dr. Carlos Pérez',      role: 'professional',  password: 'Admin123!' },
    { email: 'dra.martinez@clinica.com',name: 'Dra. Ana Martínez',     role: 'professional',  password: 'Admin123!' },
  ];

  for (const u of users) {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (exists.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [u.email, hash, u.name, u.role]
      );
      console.log(`[seed] Created user: ${u.email}`);
    }
  }

  // Assign professionals after users exist
  await pool.query(`
    INSERT INTO professionals (user_id, specialty_id, license_number, phone, consultation_duration_minutes)
    SELECT u.id, s.id, 'MED-001', '3001234567', 30
    FROM users u, specialties s
    WHERE u.email = 'dr.perez@clinica.com' AND s.name = 'Medicina General'
    ON CONFLICT DO NOTHING
  `);

  await pool.query(`
    INSERT INTO professionals (user_id, specialty_id, license_number, phone, consultation_duration_minutes)
    SELECT u.id, s.id, 'CARD-001', '3009876543', 45
    FROM users u, specialties s
    WHERE u.email = 'dra.martinez@clinica.com' AND s.name = 'Cardiología'
    ON CONFLICT DO NOTHING
  `);

  // Schedules for Dr. Pérez (Mon-Fri)
  await pool.query(`
    INSERT INTO schedules (professional_id, day_of_week, start_time, end_time)
    SELECT p.id, d.day, '08:00', '17:00'
    FROM professionals p
    JOIN users u ON p.user_id = u.id
    CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(day)
    WHERE u.email = 'dr.perez@clinica.com'
    ON CONFLICT (professional_id, day_of_week) DO NOTHING
  `);

  // Schedules for Dra. Martínez (Mon-Wed)
  await pool.query(`
    INSERT INTO schedules (professional_id, day_of_week, start_time, end_time)
    SELECT p.id, d.day, '09:00', '18:00'
    FROM professionals p
    JOIN users u ON p.user_id = u.id
    CROSS JOIN (VALUES (1),(2),(3)) AS d(day)
    WHERE u.email = 'dra.martinez@clinica.com'
    ON CONFLICT (professional_id, day_of_week) DO NOTHING
  `);

  console.log('[seed] Users and professionals ready.');
}

module.exports = { seedUsers };
