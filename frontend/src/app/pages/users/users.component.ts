import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/api.service';
import { User } from '../../models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Usuarios del Sistema</h1>
        <p class="page-subtitle">Gestión de accesos y roles</p>
      </div>
      <button class="btn btn-primary" (click)="openModal()">+ Nuevo Usuario</button>
    </div>

    <div *ngIf="loading()" class="loading-wrap"><div class="spinner"></div></div>

    <div class="card" style="padding:0" *ngIf="!loading()">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users()">
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="avatar">{{initials(u)}}</div>
                  <span style="font-weight:500;font-size:.88rem">{{u.name}}</span>
                </div>
              </td>
              <td class="fs-sm">{{u.email}}</td>
              <td>
                <span class="badge" [ngClass]="roleBadge(u.role)">{{roleLabel(u.role)}}</span>
              </td>
              <td>
                <span class="badge" [class.badge-success]="u.is_active" [class.badge-neutral]="!u.is_active">
                  {{u.is_active ? 'Activo' : 'Inactivo'}}
                </span>
              </td>
              <td class="text-muted fs-sm">{{u.created_at | date:'dd/MM/yyyy'}}</td>
              <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" (click)="toggleActive(u)">
                  {{u.is_active ? 'Desactivar' : 'Activar'}}
                </button>
              </td>
            </tr>
            <tr *ngIf="!users().length">
              <td colspan="6"><div class="empty-state"><div class="empty-icon">🔑</div><p>No hay usuarios</p></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL -->
    <div class="modal-backdrop" *ngIf="showModal()" (click)="closeOnBackdrop($event)">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <h2>Nuevo Usuario</h2>
          <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
        </div>
        <div *ngIf="formError()" class="alert alert-danger" style="margin-bottom:16px">{{formError()}}</div>
        <form (ngSubmit)="save()" #uf="ngForm">
          <div class="form-group">
            <label class="form-label">Nombre completo *</label>
            <input class="form-control" [(ngModel)]="form.name" name="name" required />
          </div>
          <div class="form-group">
            <label class="form-label">Correo electrónico *</label>
            <input type="email" class="form-control" [(ngModel)]="form.email" name="email" required />
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña *</label>
            <input type="password" class="form-control" [(ngModel)]="form.password" name="password" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select class="form-control" [(ngModel)]="form.role" name="role" required>
              <option value="admin">Administrador</option>
              <option value="receptionist">Recepcionista</option>
              <option value="professional">Profesional de Salud</option>
            </select>
          </div>
          <div class="alert alert-warning" style="margin-top:8px">
            ⚠ Para profesionales de salud, se recomienda crearlos desde el módulo de <strong>Profesionales</strong> para configurar también su especialidad y horarios.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || uf.invalid">
              {{saving() ? 'Creando...' : 'Crear Usuario'}}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`.avatar{width:32px;height:32px;border-radius:50%;background:#dbeeff;color:#0f4c75;font-weight:600;font-size:.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}`]
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');
  form = { name: '', email: '', password: '', role: 'receptionist' };

  initials = (u: User) => u.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  roleLabel = (r: string) => ({ admin:'Administrador', receptionist:'Recepcionista', professional:'Profesional' }[r] || r);
  roleBadge = (r: string) => ({ admin:'badge-purple', receptionist:'badge-info', professional:'badge-success' }[r] || 'badge-neutral');

  constructor(private svc: UserService) {}
  ngOnInit() { this.load(); }
  load() { this.svc.getAll().subscribe({ next: u => { this.users.set(u); this.loading.set(false); } }); }

  openModal() { this.form = { name:'', email:'', password:'', role:'receptionist' }; this.formError.set(''); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }
  closeOnBackdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closeModal(); }

  save() {
    this.saving.set(true); this.formError.set('');
    this.svc.create(this.form).subscribe({
      next: () => { this.closeModal(); this.load(); this.saving.set(false); },
      error: (e) => { this.formError.set(e.error?.error || 'Error'); this.saving.set(false); }
    });
  }

  toggleActive(u: User) {
    const action = u.is_active ? 'desactivar' : 'activar';
    if (confirm(`¿${action} al usuario ${u.name}?`)) {
      this.svc.toggleActive(u.id).subscribe({ next: () => this.load() });
    }
  }
}
