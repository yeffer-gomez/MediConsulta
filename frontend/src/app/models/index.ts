// =====================================================
// MODELS – clinic-frontend
// =====================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'receptionist' | 'professional';
  is_active?: boolean;
  professionalId?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Specialty {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Professional {
  id: string;
  user_id: string;
  name: string;
  email: string;
  license_number: string;
  phone?: string;
  specialty_id: string;
  specialty_name?: string;
  consultation_duration_minutes: number;
  is_active: boolean;
  schedules: Schedule[];
}

export interface Patient {
  id: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  birth_date?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  blood_type?: string;
  allergies?: string;
  medical_history?: string;
  is_active: boolean;
  created_at: string;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  document_number?: string;
  patient_phone?: string;
  professional_id: string;
  professional_name: string;
  specialty_id: string;
  specialty_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
}

export interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DashboardStats {
  totalPatients: number;
  totalProfessionals: number;
  todayAppointments: number;
  monthAppointments: number;
  todayByStatus: { status: string; count: string }[];
  upcomingToday: Appointment[];
}
