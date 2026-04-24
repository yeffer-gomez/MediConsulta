import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatientService } from '../../services/api.service';
import { Patient, Appointment } from '../../models';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="margin-bottom:16px">
      <a routerLink="/patients" class="btn btn-ghost btn-sm">← Volver a Pacientes</a>
    </div>

    <div *ngIf="loading()" class="loading-wrap"><div class="spinner"></div></div>

    <ng-container *ngIf="patient() as p">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:16px">
          <div class="big-avatar">{{initials(p)}}</div>
          <div>
            <h1 style="font-size:1.6rem">{{p.first_name}} {{p.last_name}}</h1>
            <p class="page-subtitle">{{p.document_type}}: {{p.document_number}}
              <span *ngIf="p.blood_type" class="badge badge-danger" style="margin-left:8px">{{p.blood_type}}</span>
            </p>
          </div>
        </div>
        <a routerLink="/appointments" [queryParams]="{patient_id: p.id}" class="btn btn-primary">+ Agendar Cita</a>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- Info card -->
        <div class="card">
          <div class="card-header"><span class="card-title">Información Personal</span></div>
          <dl class="info-list">
            <div class="info-row"><dt>Nombre completo</dt><dd>{{p.first_name}} {{p.last_name}}</dd></div>
            <div class="info-row"><dt>Fecha de nacimiento</dt><dd>{{p.birth_date ? (p.birth_date | date:'dd/MM/yyyy') : '—'}}</dd></div>
            <div class="info-row"><dt>Género</dt><dd>{{genderLabel(p.gender)}}</dd></div>
            <div class="info-row"><dt>Correo electrónico</dt><dd>{{p.email || '—'}}</dd></div>
            <div class="info-row"><dt>Teléfono</dt><dd>{{p.phone || '—'}}</dd></div>
            <div class="info-row"><dt>Ciudad</dt><dd>{{p.city || '—'}}</dd></div>
            <div class="info-row"><dt>Dirección</dt><dd>{{p.address || '—'}}</dd></div>
            <div class="info-row"><dt>Registrado</dt><dd>{{p.created_at | date:'dd/MM/yyyy'}}</dd></div>
          </dl>
        </div>

        <!-- Medical card -->
        <div class="card">
          <div class="card-header"><span class="card-title">Información Médica</span></div>
          <dl class="info-list">
            <div class="info-row"><dt>Tipo de sangre</dt>
              <dd><span *ngIf="p.blood_type" class="badge badge-danger">{{p.blood_type}}</span><span *ngIf="!p.blood_type">—</span></dd>
            </div>
          </dl>
          <div style="margin-top:12px">
            <div class="section-label">Alergias</div>
            <div *ngIf="p.allergies" class="alert alert-warning" style="margin-top:6px">⚠ {{p.allergies}}</div>
            <div *ngIf="!p.allergies" class="text-muted fs-sm" style="margin-top:6px">Sin alergias registradas</div>
          </div>
          <div style="margin-top:16px">
            <div class="section-label">Antecedentes médicos</div>
            <p style="margin-top:6px;font-size:.875rem;color:var(--text-secondary);line-height:1.6">{{p.medical_history || 'Sin antecedentes registrados'}}</p>
          </div>
        </div>
      </div>

      <!-- Appointments history -->
      <div class="card" style="margin-top:20px">
        <div class="card-header">
          <span class="card-title">Historial de Citas</span>
          <span class="badge badge-neutral">{{appointments().length}} citas</span>
        </div>
        <div *ngIf="apptLoading()" class="loading-wrap"><div class="spinner"></div></div>
        <div *ngIf="!apptLoading()">
          <div class="table-wrap" *ngIf="appointments().length; else noAppts">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Hora</th><th>Profesional</th><th>Especialidad</th><th>Motivo</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let a of appointments()">
                  <td>{{a.scheduled_date | date:'dd/MM/yyyy'}}</td>
                  <td>{{a.scheduled_time | slice:0:5}}</td>
                  <td>{{a.professional_name}}</td>
                  <td>{{a.specialty_name}}</td>
                  <td class="text-muted fs-sm">{{a.reason || '—'}}</td>
                  <td><span class="badge" [class]="'status-' + a.status">{{statusLabel(a.status)}}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noAppts>
            <div class="empty-state"><div class="empty-icon">📋</div><p>Sin historial de citas</p></div>
          </ng-template>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .big-avatar { width:60px;height:60px;border-radius:50%;background:#dbeeff;color:#0f4c75;font-weight:600;font-size:1.2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0 }
    .info-list { display:flex;flex-direction:column;gap:0 }
    .info-row { display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);gap:12px }
    .info-row:last-child { border-bottom:none }
    dt { font-size:.78rem;color:var(--text-muted);font-weight:500;flex-shrink:0 }
    dd { font-size:.875rem;color:var(--text-primary);text-align:right }
    .section-label { font-size:.75rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted) }
  `]
})
export class PatientDetailComponent implements OnInit {
  patient = signal<Patient | null>(null);
  appointments = signal<Appointment[]>([]);
  loading = signal(true);
  apptLoading = signal(true);

  constructor(private route: ActivatedRoute, private svc: PatientService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getById(id).subscribe({ next: p => { this.patient.set(p); this.loading.set(false); } });
    this.svc.getAppointments(id).subscribe({ next: a => { this.appointments.set(a); this.apptLoading.set(false); } });
  }

  initials(p: Patient) { return (p.first_name[0] + p.last_name[0]).toUpperCase(); }
  genderLabel(g?: string) { return g === 'M' ? 'Masculino' : g === 'F' ? 'Femenino' : g === 'O' ? 'Otro' : '—'; }
  statusLabel(s: string) {
    const m: Record<string,string> = { scheduled:'Programada', confirmed:'Confirmada', in_progress:'En curso', completed:'Completada', cancelled:'Cancelada', no_show:'No asistió' };
    return m[s] || s;
  }
}
