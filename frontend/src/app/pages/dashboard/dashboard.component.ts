import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.service';
import { DashboardStats } from '../../models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Bienvenido, {{firstName()}}</h1>
        <p class="page-subtitle">{{todayLabel}} · Resumen del día</p>
      </div>
      <a routerLink="/appointments" class="btn btn-primary">+ Nueva Cita</a>
    </div>

    <!-- ERROR STATE -->
    <div *ngIf="loadError()" class="alert alert-warning" style="margin-bottom:20px">
      ⚠ No se pudo cargar el resumen. Verifica que el backend esté activo.
      <button class="btn btn-sm btn-secondary" style="margin-left:12px" (click)="load()">Reintentar</button>
    </div>

    <!-- STATS -->
    <ng-container *ngIf="!loading(); else loadingTpl">
      <div class="stats-grid">
        <div class="stat-card accent-blue">
          <div class="stat-label">Pacientes registrados</div>
          <div class="stat-value">{{stats()?.totalPatients ?? 0}}</div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-top:4px">Total activos</div>
        </div>
        <div class="stat-card accent-teal">
          <div class="stat-label">Profesionales</div>
          <div class="stat-value">{{stats()?.totalProfessionals ?? 0}}</div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-top:4px">En el consultorio</div>
        </div>
        <div class="stat-card accent-green">
          <div class="stat-label">Citas hoy</div>
          <div class="stat-value">{{stats()?.todayAppointments ?? 0}}</div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-top:4px">Programadas para hoy</div>
        </div>
        <div class="stat-card accent-amber">
          <div class="stat-label">Citas este mes</div>
          <div class="stat-value">{{stats()?.monthAppointments ?? 0}}</div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-top:4px">Mes en curso</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">
        <!-- Today status breakdown -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Estado de citas hoy</span>
          </div>
          <div *ngIf="stats()?.todayByStatus?.length; else noData">
            <div *ngFor="let s of stats()!.todayByStatus" class="status-row">
              <span class="badge" [class]="'status-' + s.status">{{statusLabel(s.status)}}</span>
              <span class="status-count">{{s.count}}</span>
            </div>
          </div>
          <ng-template #noData>
            <div class="empty-state" style="padding:30px">
              <div class="empty-icon">📅</div>
              <p>Sin citas programadas para hoy</p>
            </div>
          </ng-template>
        </div>

        <!-- Upcoming today -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Próximas citas del día</span>
            <a routerLink="/appointments" class="btn btn-ghost btn-sm">Ver todas →</a>
          </div>
          <div *ngIf="stats()?.upcomingToday?.length; else noAppts">
            <div *ngFor="let a of stats()!.upcomingToday" class="appt-row">
              <div class="appt-time">{{a.scheduled_time | slice:0:5}}</div>
              <div class="appt-info">
                <div class="appt-patient">{{a.patient_name}}</div>
                <div class="appt-prof">{{a.professional_name}} · {{a.specialty_name}}</div>
              </div>
              <span class="badge" [class]="'status-' + a.status">{{statusLabel(a.status)}}</span>
            </div>
          </div>
          <ng-template #noAppts>
            <div class="empty-state" style="padding:30px">
              <div class="empty-icon">✅</div>
              <p>No hay más citas hoy</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Quick access -->
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title">Acceso rápido</span></div>
        <div class="quick-grid">
          <a routerLink="/appointments" class="quick-card">
            <span class="quick-icon">📅</span>
            <span>Nueva Cita</span>
          </a>
          <a routerLink="/patients" class="quick-card">
            <span class="quick-icon">👤</span>
            <span>Registrar Paciente</span>
          </a>
          <a routerLink="/professionals" class="quick-card">
            <span class="quick-icon">🩺</span>
            <span>Ver Profesionales</span>
          </a>
          <a routerLink="/appointments" [queryParams]="{date: todayStr}" class="quick-card">
            <span class="quick-icon">🗓</span>
            <span>Agenda de Hoy</span>
          </a>
        </div>
      </div>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="loading-wrap"><div class="spinner"></div></div>
    </ng-template>
  `,
  styles: [`
    .status-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border); }
    .status-row:last-child { border-bottom:none; }
    .status-count { font-weight:600; font-size:1.1rem; color:var(--text-primary); }
    .appt-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border); }
    .appt-row:last-child { border-bottom:none; }
    .appt-time { font-size:.95rem; font-weight:600; color:var(--primary); min-width:44px; }
    .appt-info { flex:1; min-width:0; }
    .appt-patient { font-weight:500; font-size:.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .appt-prof { font-size:.78rem; color:var(--text-muted); }
    .quick-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
    .quick-card {
      display:flex; flex-direction:column; align-items:center; gap:10px;
      padding:20px 16px; border-radius:var(--radius-md);
      border:1.5px solid var(--border); text-decoration:none;
      color:var(--text-primary); font-size:.88rem; font-weight:500;
      transition:all .15s; text-align:center;
    }
    .quick-card:hover { border-color:var(--primary-light); background:#eef4fb; color:var(--primary); }
    .quick-icon { font-size:1.6rem; }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  loadError = signal(false);
  today = new Date();
  todayLabel = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  todayStr = this.today.toISOString().split('T')[0];

  firstName = () => this.auth.currentUser()?.name?.split(' ')[0] || 'Usuario';

  constructor(private dashService: DashboardService, private auth: AuthService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError.set(false);
    this.dashService.getStats().subscribe({
      next: s => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        // Show empty stats instead of infinite spinner
        this.stats.set({
          totalPatients: 0,
          totalProfessionals: 0,
          todayAppointments: 0,
          monthAppointments: 0,
          todayByStatus: [],
          upcomingToday: []
        });
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      scheduled: 'Programada', confirmed: 'Confirmada', in_progress: 'En curso',
      completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió'
    };
    return m[s] || s;
  }
}
