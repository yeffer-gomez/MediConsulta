import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppointmentService, PatientService, ProfessionalService, SpecialtyService } from '../../services/api.service';
import { Appointment, Patient, Professional, Specialty, TimeSlot } from '../../models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Gestión de Citas</h1>
        <p class="page-subtitle">{{total()}} citas encontradas</p>
      </div>
      <button class="btn btn-primary" *ngIf="canCreate()" (click)="openCreate()">+ Agendar Cita</button>
    </div>

    <!-- FILTERS -->
    <div class="card" style="margin-bottom:20px;padding:16px 20px">
      <div class="search-bar" style="flex-wrap:wrap">
        <input type="date" class="form-control" [(ngModel)]="filterDate" (ngModelChange)="load()" style="width:180px" />
        <select class="form-control" [(ngModel)]="filterStatus" (ngModelChange)="load()" style="width:180px">
          <option value="">Todos los estados</option>
          <option value="scheduled">Programadas</option>
          <option value="confirmed">Confirmadas</option>
          <option value="in_progress">En curso</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="no_show">No asistió</option>
        </select>
        <select class="form-control" [(ngModel)]="filterProfessional" (ngModelChange)="load()" style="width:220px" *ngIf="!isProfessional()">
          <option value="">Todos los profesionales</option>
          <option *ngFor="let p of professionals()" [value]="p.id">{{p.name}}</option>
        </select>
        <button class="btn btn-secondary btn-sm" (click)="clearFilters()">Limpiar</button>
      </div>
    </div>

    <!-- TABLE -->
    <div class="card" style="padding:0">
      <div *ngIf="loading()" class="loading-wrap"><div class="spinner"></div></div>
      <div *ngIf="!loading()">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Fecha / Hora</th>
                <th>Profesional</th>
                <th>Especialidad</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of appointments()">
                <td>
                  <div style="font-weight:500;font-size:.88rem">{{a.patient_name}}</div>
                  <div style="font-size:.75rem;color:var(--text-muted)">{{a.document_number}}</div>
                </td>
                <td>
                  <div style="font-weight:500;font-size:.88rem">{{a.scheduled_date | date:'dd/MM/yyyy'}}</div>
                  <div style="font-size:.8rem;color:var(--primary);font-weight:500">{{a.scheduled_time | slice:0:5}}</div>
                </td>
                <td style="font-size:.88rem">{{a.professional_name}}</td>
                <td><span class="badge badge-primary">{{a.specialty_name}}</span></td>
                <td class="text-muted fs-sm">{{a.reason || '—'}}</td>
                <td>
                  <select class="status-select" [value]="a.status" (change)="changeStatus(a, $event)" *ngIf="canChangeStatus(a); else statusBadge">
                    <option value="scheduled">Programada</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="in_progress">En curso</option>
                    <option value="completed">Completada</option>
                    <option value="no_show">No asistió</option>
                  </select>
                  <ng-template #statusBadge>
                    <span class="badge" [class]="'status-' + a.status">{{statusLabel(a.status)}}</span>
                  </ng-template>
                </td>
                <td style="text-align:right">
                  <div style="display:flex;gap:6px;justify-content:flex-end">
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openEdit(a)" *ngIf="canCreate() && a.status !== 'cancelled' && a.status !== 'completed'" title="Reprogramar">📅</button>
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openCancel(a)" *ngIf="a.status !== 'cancelled' && a.status !== 'completed'" title="Cancelar">✕</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!appointments().length">
                <td colspan="7">
                  <div class="empty-state"><div class="empty-icon">📅</div><p>No se encontraron citas</p></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="padding:12px 20px" *ngIf="totalPages() > 1">
          <div class="pagination">
            <button [disabled]="page() === 1" (click)="setPage(page()-1)">‹</button>
            <ng-container *ngFor="let p of pageNumbers()">
              <button [class.active]="p === page()" (click)="setPage(p)">{{p}}</button>
            </ng-container>
            <button [disabled]="page() === totalPages()" (click)="setPage(page()+1)">›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT MODAL -->
    <div class="modal-backdrop" *ngIf="showModal()" (click)="closeOnBackdrop($event)">
      <div class="modal modal-lg" role="dialog">
        <div class="modal-header">
          <h2>{{editingId() ? 'Reprogramar Cita' : 'Agendar Nueva Cita'}}</h2>
          <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
        </div>
        <div *ngIf="formError()" class="alert alert-danger" style="margin-bottom:16px">{{formError()}}</div>

        <form (ngSubmit)="saveAppt()" #af="ngForm">
          <!-- Step 1: Patient -->
          <div class="form-group">
            <label class="form-label">Paciente *</label>
            <div style="position:relative">
              <input class="form-control" [(ngModel)]="patientSearch" name="pSearch" placeholder="Buscar paciente por nombre o documento..." (input)="searchPatients()" autocomplete="off" />
              <div class="patient-dropdown" *ngIf="patientResults().length">
                <div *ngFor="let p of patientResults()" class="patient-option" (click)="selectPatient(p)">
                  <strong>{{p.first_name}} {{p.last_name}}</strong>
                  <span class="text-muted"> · {{p.document_type}}: {{p.document_number}}</span>
                  <span *ngIf="p.allergies" class="badge badge-warning" style="margin-left:6px;font-size:.7rem">⚠ Alergia</span>
                </div>
              </div>
            </div>
            <div *ngIf="form.patient_id" class="selected-patient">
              <span>✅ {{selectedPatientName()}}</span>
              <button type="button" class="btn btn-ghost btn-sm" (click)="clearPatient()">✕</button>
            </div>
          </div>

          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Especialidad *</label>
              <select class="form-control" [(ngModel)]="form.specialty_id" name="spec" required (ngModelChange)="onSpecialtyChange()">
                <option value="">-- Seleccionar --</option>
                <option *ngFor="let s of specialties()" [value]="s.id">{{s.name}}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Profesional *</label>
              <select class="form-control" [(ngModel)]="form.professional_id" name="prof" required (ngModelChange)="onProfessionalChange()" [disabled]="!form.specialty_id">
                <option value="">-- Seleccionar --</option>
                <option *ngFor="let p of filteredProfessionals()" [value]="p.id">{{p.name}}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input type="date" class="form-control" [(ngModel)]="form.scheduled_date" name="sdate" required [min]="minDate" (ngModelChange)="loadSlots()" style="max-width:220px" />
          </div>

          <!-- Time slots -->
          <div class="form-group" *ngIf="form.scheduled_date && form.professional_id">
            <label class="form-label">Hora disponible * <span *ngIf="slots().length" class="text-muted fs-sm">({{slotDuration()}} min por consulta)</span></label>
            <div *ngIf="slotsLoading()" style="display:flex;align-items:center;gap:8px;padding:10px 0;color:var(--text-muted);font-size:.85rem">
              <div style="width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .7s linear infinite"></div>
              Cargando horarios...
            </div>
            <div *ngIf="!slotsLoading() && slots().length" class="slots-grid">
              <button *ngFor="let s of slots()" type="button"
                class="slot-btn"
                [class.slot-taken]="!s.available"
                [class.slot-selected]="form.scheduled_time === s.time"
                (click)="s.available && selectSlot(s.time)">
                {{s.time}}
              </button>
            </div>
            <div *ngIf="!slotsLoading() && !slots().length" class="alert alert-warning" style="margin-top:8px">
              El profesional no tiene disponibilidad para esta fecha.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Motivo de consulta</label>
            <input class="form-control" [(ngModel)]="form.reason" name="reason" placeholder="Ej: Control médico, dolor de cabeza..." />
          </div>
          <div class="form-group">
            <label class="form-label">Notas adicionales</label>
            <textarea class="form-control" [(ngModel)]="form.notes" name="notes" rows="2"></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || !form.patient_id || !form.scheduled_time">
              {{saving() ? 'Guardando...' : (editingId() ? 'Reprogramar' : 'Confirmar Cita')}}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CANCEL MODAL -->
    <div class="modal-backdrop" *ngIf="showCancelModal()" (click)="closeCancelOnBackdrop($event)">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <h2>Cancelar Cita</h2>
          <button class="btn btn-ghost btn-icon" (click)="showCancelModal.set(false)">✕</button>
        </div>
        <p style="margin-bottom:16px;color:var(--text-secondary)">¿Seguro que deseas cancelar la cita de <strong>{{cancelTarget()?.patient_name}}</strong> el {{cancelTarget()?.scheduled_date | date:'dd/MM/yyyy'}} a las {{cancelTarget()?.scheduled_time | slice:0:5}}?</p>
        <div class="form-group">
          <label class="form-label">Motivo de cancelación</label>
          <textarea class="form-control" [(ngModel)]="cancelReason" rows="3" placeholder="Opcional..."></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showCancelModal.set(false)">Volver</button>
          <button class="btn btn-danger" (click)="confirmCancel()" [disabled]="saving()">
            {{saving() ? 'Cancelando...' : 'Confirmar Cancelación'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-select { padding:4px 8px; border:1.5px solid var(--border); border-radius:var(--radius-sm); font-size:.8rem; font-family:inherit; background:var(--bg-card); color:var(--text-primary); cursor:pointer; }
    .patient-dropdown { position:absolute; top:100%; left:0; right:0; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); z-index:50; box-shadow:var(--shadow-md); max-height:220px; overflow-y:auto; }
    .patient-option { padding:10px 14px; cursor:pointer; font-size:.87rem; transition:background .12s; }
    .patient-option:hover { background:var(--bg-page); }
    .selected-patient { display:flex; align-items:center; justify-content:space-between; margin-top:6px; padding:8px 12px; background:#eef4fb; border-radius:var(--radius-sm); font-size:.875rem; color:var(--primary); font-weight:500; }
  `]
})
export class AppointmentsComponent implements OnInit {
  appointments = signal<Appointment[]>([]);
  professionals = signal<Professional[]>([]);
  specialties = signal<Specialty[]>([]);
  slots = signal<TimeSlot[]>([]);
  slotDuration = signal(30);
  patientResults = signal<Patient[]>([]);

  total = signal(0);
  loading = signal(true);
  slotsLoading = signal(false);
  showModal = signal(false);
  showCancelModal = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<string | null>(null);
  cancelTarget = signal<Appointment | null>(null);
  cancelReason = '';
  page = signal(1);
  readonly limit = 25;

  filterDate = '';
  filterStatus = '';
  filterProfessional = '';
  patientSearch = '';
  minDate = new Date().toISOString().split('T')[0];

  form: any = this.blankForm();
  private selectedPatient: Patient | null = null;
  private patientSearchTimer: any;

  totalPages = () => Math.ceil(this.total() / this.limit);
  pageNumbers = () => Array.from({ length: this.totalPages() }, (_, i) => i + 1).filter(p => Math.abs(p - this.page()) <= 2);
  canCreate = () => this.auth.hasRole('admin','receptionist');
  isProfessional = () => this.auth.hasRole('professional');
  selectedPatientName = () => this.selectedPatient ? `${this.selectedPatient.first_name} ${this.selectedPatient.last_name}` : '';
  canChangeStatus = (a: Appointment) => this.auth.hasRole('admin','receptionist','professional') && a.status !== 'cancelled';

  filteredProfessionals = computed(() => {
    if (!this.form.specialty_id) return this.professionals();
    return this.professionals().filter(p => p.specialty_id === this.form.specialty_id);
  });

  constructor(
    private svc: AppointmentService, private patSvc: PatientService,
    private profSvc: ProfessionalService, private specSvc: SpecialtyService,
    private auth: AuthService, private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['date']) this.filterDate = params['date'];
      if (params['patient_id']) { /* pre-fill */ }
    });
    this.load();
    this.profSvc.getAll().subscribe(p => this.professionals.set(p));
    this.specSvc.getAll().subscribe(s => this.specialties.set(s));
  }

  load() {
    this.loading.set(true);
    const params: any = { page: this.page(), limit: this.limit };
    if (this.filterDate) params.date = this.filterDate;
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.filterProfessional) params.professional_id = this.filterProfessional;
    this.svc.getAll(params).subscribe({
      next: r => { this.appointments.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  clearFilters() { this.filterDate = ''; this.filterStatus = ''; this.filterProfessional = ''; this.page.set(1); this.load(); }
  setPage(p: number) { this.page.set(p); this.load(); }

  blankForm() { return { patient_id:'', specialty_id:'', professional_id:'', scheduled_date:'', scheduled_time:'', reason:'', notes:'' }; }

  openCreate() { this.form = this.blankForm(); this.editingId.set(null); this.slots.set([]); this.selectedPatient = null; this.patientSearch = ''; this.patientResults.set([]); this.formError.set(''); this.showModal.set(true); }

  openEdit(a: Appointment) {
    this.editingId.set(a.id);
    this.form = { patient_id: a.patient_id, specialty_id: a.specialty_id, professional_id: a.professional_id, scheduled_date: a.scheduled_date, scheduled_time: a.scheduled_time, reason: a.reason || '', notes: a.notes || '' };
    this.selectedPatient = { id: a.patient_id, first_name: a.patient_name.split(' ')[0], last_name: a.patient_name.split(' ').slice(1).join(' ') } as Patient;
    this.patientSearch = a.patient_name;
    this.patientResults.set([]);
    this.slots.set([]);
    this.formError.set('');
    this.showModal.set(true);
    this.loadSlots();
  }

  closeModal() { this.showModal.set(false); }
  closeOnBackdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closeModal(); }
  closeCancelOnBackdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.showCancelModal.set(false); }

  searchPatients() {
    clearTimeout(this.patientSearchTimer);
    if (!this.patientSearch || this.patientSearch.length < 2) { this.patientResults.set([]); return; }
    this.patientSearchTimer = setTimeout(() => {
      this.patSvc.getAll({ search: this.patientSearch, limit: 8 }).subscribe(r => this.patientResults.set(r.data));
    }, 300);
  }

  selectPatient(p: Patient) { this.selectedPatient = p; this.form.patient_id = p.id; this.patientSearch = `${p.first_name} ${p.last_name}`; this.patientResults.set([]); }
  clearPatient() { this.selectedPatient = null; this.form.patient_id = ''; this.patientSearch = ''; }

  onSpecialtyChange() { this.form.professional_id = ''; this.form.scheduled_time = ''; this.slots.set([]); }
  onProfessionalChange() { this.form.scheduled_time = ''; this.slots.set([]); if (this.form.scheduled_date) this.loadSlots(); }

  loadSlots() {
    if (!this.form.professional_id || !this.form.scheduled_date) return;
    this.slotsLoading.set(true);
    this.form.scheduled_time = '';
    this.profSvc.getSlots(this.form.professional_id, this.form.scheduled_date).subscribe({
      next: r => { this.slots.set(r.slots); this.slotDuration.set(r.duration); this.slotsLoading.set(false); },
      error: () => this.slotsLoading.set(false)
    });
  }

  selectSlot(t: string) { this.form.scheduled_time = t; }

  saveAppt() {
    this.saving.set(true); this.formError.set('');
    const obs = this.editingId()
      ? this.svc.update(this.editingId()!, { scheduled_date: this.form.scheduled_date, scheduled_time: this.form.scheduled_time, reason: this.form.reason, notes: this.form.notes })
      : this.svc.create(this.form);
    obs.subscribe({
      next: () => { this.closeModal(); this.load(); this.saving.set(false); },
      error: (e) => { this.formError.set(e.error?.error || 'Error al guardar'); this.saving.set(false); }
    });
  }

  openCancel(a: Appointment) { this.cancelTarget.set(a); this.cancelReason = ''; this.showCancelModal.set(true); }
  confirmCancel() {
    if (!this.cancelTarget()) return;
    this.saving.set(true);
    this.svc.cancel(this.cancelTarget()!.id, this.cancelReason).subscribe({
      next: () => { this.showCancelModal.set(false); this.load(); this.saving.set(false); },
      error: () => this.saving.set(false)
    });
  }

  changeStatus(a: Appointment, event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.svc.updateStatus(a.id, status).subscribe({ next: () => this.load() });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { scheduled:'Programada', confirmed:'Confirmada', in_progress:'En curso', completed:'Completada', cancelled:'Cancelada', no_show:'No asistió' };
    return m[s] || s;
  }
}
