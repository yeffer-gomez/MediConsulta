import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalService, SpecialtyService } from '../../services/api.service';
import { Professional, Specialty, Schedule } from '../../models';
import { AuthService } from '../../services/auth.service';

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

@Component({
  selector: 'app-professionals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Profesionales de Salud</h1>
        <p class="page-subtitle">{{professionals().length}} profesionales registrados</p>
      </div>
      <button class="btn btn-primary" *ngIf="isAdmin()" (click)="openModal()">+ Nuevo Profesional</button>
    </div>

    <!-- FILTER -->
    <div class="card" style="margin-bottom:20px;padding:14px 20px">
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" [(ngModel)]="search" (ngModelChange)="load()" placeholder="Buscar por nombre..." />
        </div>
        <select class="form-control" [(ngModel)]="filterSpecialty" (ngModelChange)="load()" style="width:220px">
          <option value="">Todas las especialidades</option>
          <option *ngFor="let s of specialties()" [value]="s.id">{{s.name}}</option>
        </select>
      </div>
    </div>

    <div *ngIf="loading()" class="loading-wrap"><div class="spinner"></div></div>

    <!-- PROFESSIONALS GRID -->
    <div class="prof-grid" *ngIf="!loading()">
      <div *ngFor="let p of professionals()" class="prof-card">
        <div class="prof-header">
          <div class="prof-avatar">{{initials(p)}}</div>
          <div class="prof-info">
            <div class="prof-name">{{p.name}}</div>
            <div class="prof-specialty">
              <span class="badge badge-primary">{{p.specialty_name}}</span>
            </div>
          </div>
          <button *ngIf="isAdmin()" class="btn btn-ghost btn-sm btn-icon" (click)="editProf(p)" title="Editar">✏️</button>
        </div>
        <div class="prof-details">
          <div class="prof-detail-row"><span>📧</span>{{p.email}}</div>
          <div class="prof-detail-row" *ngIf="p.phone"><span>📞</span>{{p.phone}}</div>
          <div class="prof-detail-row"><span>🪪</span>Reg. {{p.license_number}}</div>
          <div class="prof-detail-row"><span>⏱</span>{{p.consultation_duration_minutes}} min por consulta</div>
        </div>
        <div class="prof-schedule" *ngIf="p.schedules?.length">
          <div class="schedule-label">Horario de atención</div>
          <div class="schedule-days">
            <span *ngFor="let s of p.schedules" class="schedule-chip">
              {{dayShort(s.day_of_week)}} {{s.start_time | slice:0:5}}–{{s.end_time | slice:0:5}}
            </span>
          </div>
        </div>
        <div class="prof-schedule" *ngIf="!p.schedules?.length">
          <span class="text-muted fs-sm">Sin horario configurado</span>
        </div>
      </div>
      <div *ngIf="!professionals().length" class="card">
        <div class="empty-state"><div class="empty-icon">🩺</div><p>No se encontraron profesionales</p></div>
      </div>
    </div>

    <!-- MODAL -->
    <div class="modal-backdrop" *ngIf="showModal()" (click)="closeOnBackdrop($event)">
      <div class="modal modal-lg" role="dialog">
        <div class="modal-header">
          <h2>{{editingId() ? 'Editar Profesional' : 'Nuevo Profesional'}}</h2>
          <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
        </div>
        <div *ngIf="formError()" class="alert alert-danger" style="margin-bottom:16px">{{formError()}}</div>
        <form (ngSubmit)="save()" #pf="ngForm">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Nombre completo *</label>
              <input class="form-control" [(ngModel)]="form.name" name="name" required />
            </div>
            <div class="form-group">
              <label class="form-label">Correo electrónico *</label>
              <input type="email" class="form-control" [(ngModel)]="form.email" name="email" required />
            </div>
          </div>
          <div class="form-row form-row-2" *ngIf="!editingId()">
            <div class="form-group">
              <label class="form-label">Contraseña inicial *</label>
              <input type="password" class="form-control" [(ngModel)]="form.password" name="password" [required]="!editingId()" />
            </div>
            <div class="form-group">
              <label class="form-label">N° Registro Médico *</label>
              <input class="form-control" [(ngModel)]="form.license_number" name="lic" required />
            </div>
          </div>
          <div class="form-row form-row-2" *ngIf="editingId()">
            <div class="form-group">
              <label class="form-label">N° Registro Médico *</label>
              <input class="form-control" [(ngModel)]="form.license_number" name="lic" required />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input class="form-control" [(ngModel)]="form.phone" name="phone" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Especialidad *</label>
              <select class="form-control" [(ngModel)]="form.specialty_id" name="spec" required>
                <option value="">-- Seleccionar --</option>
                <option *ngFor="let s of specialties()" [value]="s.id">{{s.name}}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Duración consulta (min) *</label>
              <select class="form-control" [(ngModel)]="form.consultation_duration_minutes" name="dur">
                <option [ngValue]="15">15 min</option>
                <option [ngValue]="20">20 min</option>
                <option [ngValue]="30">30 min</option>
                <option [ngValue]="45">45 min</option>
                <option [ngValue]="60">60 min</option>
              </select>
            </div>
          </div>

          <!-- Schedules -->
          <div class="form-group">
            <label class="form-label">Días de atención</label>
            <div class="day-chips">
              <span *ngFor="let d of allDays; let i = index" class="day-chip" [class.active]="isDayActive(i)" (click)="toggleDay(i)">{{d.short}}</span>
            </div>
          </div>
          <div *ngFor="let s of form.schedules; let i = index" class="form-row form-row-2" style="align-items:flex-end">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">{{allDays[s.day_of_week].name}} – Entrada</label>
              <input type="time" class="form-control" [(ngModel)]="s.start_time" [name]="'st'+i" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Salida</label>
              <input type="time" class="form-control" [(ngModel)]="s.end_time" [name]="'et'+i" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || pf.invalid">
              {{saving() ? 'Guardando...' : (editingId() ? 'Actualizar' : 'Crear Profesional')}}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .prof-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
    .prof-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; display:flex; flex-direction:column; gap:14px; }
    .prof-header { display:flex; align-items:flex-start; gap:12px; }
    .prof-avatar { width:46px;height:46px;border-radius:50%;background:#dbeeff;color:#0f4c75;font-weight:600;font-size:.9rem;display:flex;align-items:center;justify-content:center;flex-shrink:0 }
    .prof-info { flex:1; min-width:0; }
    .prof-name { font-weight:500; font-size:.95rem; }
    .prof-specialty { margin-top:4px; }
    .prof-details { display:flex; flex-direction:column; gap:6px; padding-top:8px; border-top:1px solid var(--border); }
    .prof-detail-row { display:flex; align-items:center; gap:8px; font-size:.82rem; color:var(--text-secondary); }
    .prof-detail-row span { width:16px; text-align:center; }
    .prof-schedule { padding-top:8px; border-top:1px solid var(--border); }
    .schedule-label { font-size:.72rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--text-muted); margin-bottom:6px; }
    .schedule-days { display:flex; flex-wrap:wrap; gap:4px; }
    .schedule-chip { background:#eef4fb; color:#0f4c75; font-size:.75rem; padding:3px 8px; border-radius:4px; font-weight:500; }
  `]
})
export class ProfessionalsComponent implements OnInit {
  professionals = signal<Professional[]>([]);
  specialties = signal<Specialty[]>([]);
  loading = signal(true);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<string | null>(null);
  search = '';
  filterSpecialty = '';

  allDays = [
    { name:'Domingo', short:'Dom' }, { name:'Lunes', short:'Lun' }, { name:'Martes', short:'Mar' },
    { name:'Miércoles', short:'Mié' }, { name:'Jueves', short:'Jue' }, { name:'Viernes', short:'Vie' }, { name:'Sábado', short:'Sáb' }
  ];

  form: any = this.blankForm();
  blankForm() { return { name:'', email:'', password:'', license_number:'', phone:'', specialty_id:'', consultation_duration_minutes:30, schedules:[] }; }

  isAdmin = () => this.auth.hasRole('admin');
  initials = (p: Professional) => p.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase();
  dayShort = (d: number) => this.allDays[d]?.short || '';
  isDayActive = (d: number) => this.form.schedules.some((s: Schedule) => s.day_of_week === d);

  constructor(private svc: ProfessionalService, private specSvc: SpecialtyService, private auth: AuthService) {}

  ngOnInit() {
    this.load();
    this.specSvc.getAll().subscribe(s => this.specialties.set(s));
  }

  load() {
    this.loading.set(true);
    const p: any = {};
    if (this.search) p.search = this.search;
    if (this.filterSpecialty) p.specialty_id = this.filterSpecialty;
    this.svc.getAll(p).subscribe({ next: r => { this.professionals.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openModal() { this.form = this.blankForm(); this.editingId.set(null); this.formError.set(''); this.showModal.set(true); }

  editProf(p: Professional) {
    this.editingId.set(p.id);
    this.form = { name: p.name, email: p.email, license_number: p.license_number, phone: p.phone || '', specialty_id: p.specialty_id, consultation_duration_minutes: p.consultation_duration_minutes, schedules: p.schedules.map(s => ({ ...s })) };
    this.formError.set('');
    this.showModal.set(true);
  }

  toggleDay(d: number) {
    const idx = this.form.schedules.findIndex((s: Schedule) => s.day_of_week === d);
    if (idx >= 0) this.form.schedules.splice(idx, 1);
    else this.form.schedules.push({ day_of_week: d, start_time: '08:00', end_time: '17:00' });
    this.form.schedules.sort((a: Schedule, b: Schedule) => a.day_of_week - b.day_of_week);
  }

  closeModal() { this.showModal.set(false); }
  closeOnBackdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closeModal(); }

  save() {
    this.saving.set(true); this.formError.set('');
    const obs = this.editingId() ? this.svc.update(this.editingId()!, this.form) : this.svc.create(this.form);
    obs.subscribe({
      next: () => { this.closeModal(); this.load(); this.saving.set(false); },
      error: (e) => { this.formError.set(e.error?.error || 'Error al guardar'); this.saving.set(false); }
    });
  }
}
