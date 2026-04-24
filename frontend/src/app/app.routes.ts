import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./components/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'patients',      loadComponent: () => import('./pages/patients/patients.component').then(m => m.PatientsComponent) },
      { path: 'patients/:id',  loadComponent: () => import('./pages/patients/patient-detail.component').then(m => m.PatientDetailComponent) },
      { path: 'professionals', loadComponent: () => import('./pages/professionals/professionals.component').then(m => m.ProfessionalsComponent) },
      { path: 'specialties',   loadComponent: () => import('./pages/specialties/specialties.component').then(m => m.SpecialtiesComponent) },
      { path: 'appointments',  loadComponent: () => import('./pages/appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'users',         loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
