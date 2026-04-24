import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Patient, Professional, Specialty, Appointment, PagedResponse, DashboardStats, TimeSlot, User } from '../models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PatientService {
  constructor(private http: HttpClient) {}
  getAll(params?: any)  { return this.http.get<PagedResponse<Patient>>(`${API}/patients`, { params }); }
  getById(id: string)   { return this.http.get<Patient>(`${API}/patients/${id}`); }
  getAppointments(id: string) { return this.http.get<Appointment[]>(`${API}/patients/${id}/appointments`); }
  create(data: any)     { return this.http.post<Patient>(`${API}/patients`, data); }
  update(id: string, d: any) { return this.http.put<Patient>(`${API}/patients/${id}`, d); }
  delete(id: string)    { return this.http.delete(`${API}/patients/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class SpecialtyService {
  constructor(private http: HttpClient) {}
  getAll()              { return this.http.get<Specialty[]>(`${API}/specialties`); }
  create(data: any)     { return this.http.post<Specialty>(`${API}/specialties`, data); }
  update(id: string, d: any) { return this.http.put<Specialty>(`${API}/specialties/${id}`, d); }
  delete(id: string)    { return this.http.delete(`${API}/specialties/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
  constructor(private http: HttpClient) {}
  getAll(params?: any)  { return this.http.get<Professional[]>(`${API}/professionals`, { params }); }
  getById(id: string)   { return this.http.get<Professional>(`${API}/professionals/${id}`); }
  create(data: any)     { return this.http.post<Professional>(`${API}/professionals`, data); }
  update(id: string, d: any) { return this.http.put(`${API}/professionals/${id}`, d); }
  getSlots(id: string, date: string) { return this.http.get<{ slots: TimeSlot[], duration: number }>(`${API}/professionals/${id}/available-slots`, { params: { date } }); }
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  constructor(private http: HttpClient) {}
  getAll(params?: any)  { return this.http.get<PagedResponse<Appointment>>(`${API}/appointments`, { params }); }
  getToday()            { return this.http.get<Appointment[]>(`${API}/appointments/today`); }
  getById(id: string)   { return this.http.get<Appointment>(`${API}/appointments/${id}`); }
  create(data: any)     { return this.http.post<Appointment>(`${API}/appointments`, data); }
  update(id: string, d: any) { return this.http.put(`${API}/appointments/${id}`, d); }
  cancel(id: string, reason?: string) { return this.http.patch(`${API}/appointments/${id}/cancel`, { cancellation_reason: reason }); }
  updateStatus(id: string, status: string) { return this.http.put(`${API}/appointments/${id}`, { status }); }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}
  getStats() { return this.http.get<DashboardStats>(`${API}/dashboard/stats`); }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}
  getAll()              { return this.http.get<User[]>(`${API}/users`); }
  create(data: any)     { return this.http.post<User>(`${API}/users`, data); }
  toggleActive(id: string) { return this.http.patch(`${API}/users/${id}/toggle-active`, {}); }
}
