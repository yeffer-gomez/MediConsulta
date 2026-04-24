-- ============================================
-- MEDICAL CLINIC DATABASE SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES & USERS
CREATE TYPE user_role AS ENUM ('admin', 'receptionist', 'professional');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'receptionist',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SPECIALTIES
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PROFESSIONALS (linked to users)
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id),
  license_number VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(30),
  consultation_duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PROFESSIONAL SCHEDULES
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_professional_day UNIQUE (professional_id, day_of_week)
);

-- PATIENTS
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type VARCHAR(20) NOT NULL DEFAULT 'CC',
  document_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(150) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  birth_date DATE,
  gender VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  city VARCHAR(100),
  blood_type VARCHAR(5),
  allergies TEXT,
  medical_history TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- APPOINTMENTS
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  professional_id UUID REFERENCES professionals(id),
  specialty_id UUID REFERENCES specialties(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status appointment_status DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_professional ON appointments(professional_id, scheduled_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_patients_document ON patients(document_number);
CREATE INDEX idx_professionals_specialty ON professionals(specialty_id);

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_professionals_updated BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_specialties_updated BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED: SPECIALTIES & PATIENTS ONLY
-- Users/professionals are seeded by the backend
-- with correct bcrypt hashes on first startup
-- ============================================

INSERT INTO specialties (name, description) VALUES
  ('Medicina General', 'Atención médica general y preventiva'),
  ('Cardiología', 'Diagnóstico y tratamiento de enfermedades cardiovasculares'),
  ('Pediatría', 'Atención médica para niños y adolescentes'),
  ('Ginecología', 'Salud femenina y reproducción'),
  ('Dermatología', 'Enfermedades de la piel, cabello y uñas'),
  ('Traumatología', 'Lesiones del sistema músculo-esquelético'),
  ('Neurología', 'Enfermedades del sistema nervioso'),
  ('Oftalmología', 'Salud ocular y visual');

INSERT INTO patients (document_type, document_number, first_name, last_name, birth_date, gender, email, phone, blood_type, allergies) VALUES
  ('CC', '1234567890', 'Juan',  'López',     '1985-03-15', 'M', 'juan.lopez@email.com', '3101234567', 'O+', 'Penicilina'),
  ('CC', '0987654321', 'Laura', 'Rodríguez', '1992-07-22', 'F', 'laura.r@email.com',    '3209876543', 'A-', NULL),
  ('CC', '1122334455', 'Pedro', 'Gómez',     '1978-11-30', 'M', 'pedro.g@email.com',    '3151122334', 'B+', 'Aspirina, Ibuprofeno'),
  ('TI', '5544332211', 'Sofía', 'Torres',    '2010-05-18', 'F', NULL,                   '3005544332', 'AB+', NULL);
