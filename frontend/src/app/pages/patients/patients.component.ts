import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PatientService } from '../../services/api.service';
import { Patient } from '../../models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Pacientes</h1>
        <p class="page-subtitle">{{total()}} pacientes registrados</p>
      </div>
      <button class="btn btn-primary" *ngIf="canEdit()" (click)="openModal()">+ Nuevo Paciente</button>
    </div>

    <!-- SEARCH -->
    <div class="card" style="margin-bottom:20px;padding:16px 20px">
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" [(ngModel)]="search" (ngModelChange)="onSearch()" placeholder="Buscar por nombre o documento..." />
        </div>
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
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Tipo de Sangre</th>
                <th>Alergias</th>
                <th>Registrado</th>
                <th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of patients()">
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="avatar">{{initials(p)}}</div>
                    <div>
                      <div style="font-weight:500">{{p.first_name}} {{p.last_name}}</div>
                      <div style="font-size:.78rem;color:var(--text-muted)">{{p.email || '—'}}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-neutral">{{p.document_type}}: {{p.document_number}}</span></td>
                <td>{{p.phone || '—'}}</td>
                <td>
                  <span *ngIf="p.blood_type" class="badge badge-danger">{{p.blood_type}}</span>
                  <span *ngIf="!p.blood_type" class="text-muted">—</span>
                </td>
                <td>
                  <span *ngIf="p.allergies" class="badge badge-warning" [title]="p.allergies">
                    ⚠ {{p.allergies | slice:0:20}}{{p.allergies!.length > 20 ? '...' : ''}}
                  </span>
                  <span *ngIf="!p.allergies" class="text-muted">Ninguna</span>
                </td>
                <td class="text-muted fs-sm">{{p.created_at | date:'dd/MM/yyyy'}}</td>
                <td style="text-align:right">
                  <div style="display:flex;gap:6px;justify-content:flex-end">
                    <a [routerLink]="['/patients', p.id]" class="btn btn-ghost btn-sm btn-icon" title="Ver detalle">👁</a>
                    <button *ngIf="canEdit()" class="btn btn-ghost btn-sm btn-icon" (click)="editPatient(p)" title="Editar">✏️</button>
                    <button *ngIf="isAdmin()" class="btn btn-ghost btn-sm btn-icon" (click)="deletePatient(p.id)" title="Desactivar">🗑</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!patients().length">
                <td colspan="7">
                  <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <p>No se encontraron pacientes</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- PAGINATION -->
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

    <!-- MODAL CREATE/EDIT -->
    <div class="modal-backdrop" *ngIf="showModal()" (click)="closeOnBackdrop($event)">
      <div class="modal modal-lg" role="dialog">
        <div class="modal-header">
          <h2>{{editingId() ? 'Editar Paciente' : 'Nuevo Paciente'}}</h2>
          <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
        </div>
        <div *ngIf="formError()" class="alert alert-danger" style="margin-bottom:16px">{{formError()}}</div>
        <form (ngSubmit)="savePatient()" #pf="ngForm">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">Tipo Doc. *</label>
              <select class="form-control" [(ngModel)]="form.document_type" name="doc_type" required>
                <option>CC</option><option>TI</option><option>CE</option><option>PA</option><option>RC</option>
              </select>
            </div>
            <div class="form-group" style="grid-column:span 2">
              <label class="form-label">Número de Documento *</label>
              <input class="form-control" [(ngModel)]="form.document_number" name="doc_num" required [disabled]="!!editingId()" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Nombres *</label>
              <input class="form-control" [(ngModel)]="form.first_name" name="fname" required />
            </div>
            <div class="form-group">
              <label class="form-label">Apellidos *</label>
              <input class="form-control" [(ngModel)]="form.last_name" name="lname" required />
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">Fecha Nacimiento</label>
              <input type="date" class="form-control" [(ngModel)]="form.birth_date" name="bdate" />
            </div>
            <div class="form-group">
              <label class="form-label">Género</label>
              <select class="form-control" [(ngModel)]="form.gender" name="gender">
                <option value="">-- Seleccionar --</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Sangre</label>
              <select class="form-control" [(ngModel)]="form.blood_type" name="blood">
                <option value="">—</option>
                <option *ngFor="let b of bloodTypes">{{b}}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input type="email" class="form-control" [(ngModel)]="form.email" name="email" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input class="form-control" [(ngModel)]="form.phone" name="phone" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Ciudad</label>
              <input class="form-control" [(ngModel)]="form.city" name="city" />
            </div>
            <div class="form-group">
              <label class="form-label">Dirección</label>
              <input class="form-control" [(ngModel)]="form.address" name="address" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Alergias conocidas</label>
            <input class="form-control" [(ngModel)]="form.allergies" name="allergies" placeholder="Ej: Penicilina, Ibuprofeno" />
          </div>
          <div class="form-group">
            <label class="form-label">Antecedentes médicos</label>
            <textarea class="form-control" [(ngModel)]="form.medical_history" name="mhist" rows="3" placeholder="Observaciones relevantes..."></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || pf.invalid">
              {{saving() ? 'Guardando...' : (editingId() ? 'Actualizar' : 'Registrar Paciente')}}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`.avatar{width:34px;height:34px;border-radius:50%;background:#dbeeff;color:#0f4c75;font-weight:600;font-size:.78rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}`]
})
export class PatientsComponent implements OnInit {
  patients = signal<Patient[]>([]);
  total = signal(0);
  loading = signal(true);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<string | null>(null);
  page = signal(1);
  search = '';
  private searchTimer: any;
  readonly limit = 20;

  bloodTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

  form: any = this.blankForm();
  blankForm() {
    return { document_type:'CC', document_number:'', first_name:'', last_name:'', birth_date:'', gender:'', email:'', phone:'', address:'', city:'', blood_type:'', allergies:'', medical_history:'' };
  }

  totalPages = () => Math.ceil(this.total() / this.limit);
  pageNumbers = () => Array.from({ length: this.totalPages() }, (_, i) => i + 1).filter(p => Math.abs(p - this.page()) <= 2);
  canEdit = () => this.auth.hasRole('admin','receptionist');
  isAdmin = () => this.auth.hasRole('admin');
  initials = (p: Patient) => (p.first_name[0] + p.last_name[0]).toUpperCase();

  constructor(private svc: PatientService, private auth: AuthService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = { page: this.page(), limit: this.limit };
    if (this.search) params.search = this.search;
    this.svc.getAll(params).subscribe({ next: r => { this.patients.set(r.data); this.total.set(r.total); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  setPage(p: number) { this.page.set(p); this.load(); }

  openModal() { this.form = this.blankForm(); this.editingId.set(null); this.formError.set(''); this.showModal.set(true); }

  editPatient(p: Patient) {
    this.editingId.set(p.id);
    this.form = { ...p, birth_date: p.birth_date ? p.birth_date.substring(0,10) : '' };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }
  closeOnBackdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closeModal(); }

  savePatient() {
    this.saving.set(true);
    this.formError.set('');
    const obs = this.editingId()
      ? this.svc.update(this.editingId()!, this.form)
      : this.svc.create(this.form);
    obs.subscribe({
      next: () => { this.closeModal(); this.load(); this.saving.set(false); },
      error: (e) => { this.formError.set(e.error?.error || 'Error al guardar'); this.saving.set(false); }
    });
  }

  deletePatient(id: string) {
    if (confirm('¿Desactivar este paciente?')) {
      this.svc.delete(id).subscribe({ next: () => this.load() });
    }
  }
}
