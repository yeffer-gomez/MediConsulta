import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpecialtyService } from '../../services/api.service';
import { Specialty } from '../../models';

@Component({
  selector: 'app-specialties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Especialidades Médicas</h1>
        <p class="page-subtitle">Gestión de especialidades del consultorio</p>
      </div>
      <button class="btn btn-primary" (click)="openModal()">+ Nueva Especialidad</button>
    </div>

    <div *ngIf="loading()" class="loading-wrap"><div class="spinner"></div></div>

    <div class="spec-grid" *ngIf="!loading()">
      <div *ngFor="let s of specialties()" class="spec-card">
        <div class="spec-icon">🏥</div>
        <div class="spec-body">
          <div class="spec-name">{{s.name}}</div>
          <div class="spec-desc">{{s.description || 'Sin descripción'}}</div>
        </div>
        <div class="spec-actions">
          <button class="btn btn-ghost btn-sm btn-icon" (click)="editSpec(s)" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm btn-icon" (click)="deleteSpec(s.id)" title="Eliminar">🗑</button>
        </div>
      </div>
      <div *ngIf="!specialties().length" class="card">
        <div class="empty-state"><div class="empty-icon">🏥</div><p>No hay especialidades registradas</p></div>
      </div>
    </div>

    <!-- MODAL -->
    <div class="modal-backdrop" *ngIf="showModal()" (click)="closeOnBackdrop($event)">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <h2>{{editingId() ? 'Editar Especialidad' : 'Nueva Especialidad'}}</h2>
          <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
        </div>
        <div *ngIf="formError()" class="alert alert-danger" style="margin-bottom:16px">{{formError()}}</div>
        <form (ngSubmit)="save()" #sf="ngForm">
          <div class="form-group">
            <label class="form-label">Nombre de la especialidad *</label>
            <input class="form-control" [(ngModel)]="form.name" name="name" required placeholder="Ej: Cardiología" />
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-control" [(ngModel)]="form.description" name="desc" rows="3" placeholder="Breve descripción..."></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || sf.invalid">
              {{saving() ? 'Guardando...' : (editingId() ? 'Actualizar' : 'Crear')}}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .spec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
    .spec-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:18px 20px; display:flex; align-items:flex-start; gap:14px; transition:box-shadow .15s; }
    .spec-card:hover { box-shadow:var(--shadow-md); }
    .spec-icon { font-size:1.6rem; flex-shrink:0; margin-top:2px; }
    .spec-body { flex:1; min-width:0; }
    .spec-name { font-weight:500; font-size:.95rem; color:var(--text-primary); }
    .spec-desc { font-size:.82rem; color:var(--text-muted); margin-top:4px; line-height:1.5; }
    .spec-actions { display:flex; gap:4px; flex-shrink:0; }
  `]
})
export class SpecialtiesComponent implements OnInit {
  specialties = signal<Specialty[]>([]);
  loading = signal(true);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<string | null>(null);
  form = { name: '', description: '' };

  constructor(private svc: SpecialtyService) {}
  ngOnInit() { this.load(); }
  load() { this.svc.getAll().subscribe({ next: s => { this.specialties.set(s); this.loading.set(false); } }); }

  openModal() { this.form = { name:'', description:'' }; this.editingId.set(null); this.formError.set(''); this.showModal.set(true); }
  editSpec(s: Specialty) { this.editingId.set(s.id); this.form = { name: s.name, description: s.description || '' }; this.formError.set(''); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }
  closeOnBackdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closeModal(); }

  save() {
    this.saving.set(true); this.formError.set('');
    const obs = this.editingId() ? this.svc.update(this.editingId()!, this.form) : this.svc.create(this.form);
    obs.subscribe({
      next: () => { this.closeModal(); this.load(); this.saving.set(false); },
      error: (e) => { this.formError.set(e.error?.error || 'Error'); this.saving.set(false); }
    });
  }

  deleteSpec(id: string) {
    if (confirm('¿Eliminar esta especialidad?')) {
      this.svc.delete(id).subscribe({ next: () => this.load() });
    }
  }
}
