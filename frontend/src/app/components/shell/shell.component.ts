import { Component, computed, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface NavItem { label: string; icon: string; route: string; roles?: string[]; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell">
      <!-- SIDEBAR -->
      <nav class="sidebar" [class.open]="sidebarOpen()">
        <div class="sidebar-logo">
          <span class="logo-icon">⚕</span>
          <div>
            <div class="logo-title">MediConsulta</div>
            <div class="logo-sub">Sistema de Gestión</div>
          </div>
        </div>

        <div class="sidebar-nav">
          <ng-container *ngFor="let item of visibleNav()">
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-item" (click)="sidebarOpen.set(false)">
              <span class="nav-icon">{{item.icon}}</span>
              <span>{{item.label}}</span>
            </a>
          </ng-container>
        </div>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">{{initials()}}</div>
            <div class="user-details">
              <div class="user-name">{{user()?.name}}</div>
              <div class="user-role">{{roleLabel()}}</div>
            </div>
          </div>
          <button class="btn-logout" (click)="logout()" title="Cerrar sesión">⏻</button>
        </div>
      </nav>

      <!-- OVERLAY (mobile) -->
      <div class="sidebar-overlay" *ngIf="sidebarOpen()" (click)="sidebarOpen.set(false)"></div>

      <!-- MAIN AREA -->
      <div class="main-area">
        <header class="topbar">
          <button class="btn btn-ghost btn-icon mobile-menu-btn" (click)="sidebarOpen.set(!sidebarOpen())">☰</button>
          <div class="topbar-breadcrumb">{{pageTitle()}}</div>
          <div style="flex:1"></div>
          <div class="topbar-date">{{todayLabel}}</div>
        </header>
        <main class="page-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-logo {
      display: flex; align-items: center; gap: 12px;
      padding: 24px 20px 20px;
      border-bottom: 1px solid rgba(255,255,255,.12);
    }
    .logo-icon { font-size: 1.8rem; }
    .logo-title { font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 300; color: #fff; letter-spacing: .01em; }
    .logo-sub { font-size: .72rem; color: rgba(255,255,255,.5); letter-spacing: .06em; text-transform: uppercase; }
    .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: rgba(255,255,255,.7);
      font-size: .88rem; font-weight: 400;
      text-decoration: none;
      transition: background .15s, color .15s;
    }
    .nav-item:hover { background: rgba(255,255,255,.1); color: #fff; }
    .nav-item.active { background: rgba(255,255,255,.18); color: #fff; font-weight: 500; }
    .nav-icon { font-size: 1.05rem; width: 22px; text-align: center; }
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,.12);
      display: flex; align-items: center; gap: 10px;
    }
    .user-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .user-avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: rgba(255,255,255,.2);
      color: #fff; font-weight: 500; font-size: .85rem;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .user-name { font-size: .82rem; color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: .72rem; color: rgba(255,255,255,.5); text-transform: capitalize; }
    .btn-logout {
      background: rgba(255,255,255,.1); border: none; color: rgba(255,255,255,.7);
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
      transition: background .15s;
    }
    .btn-logout:hover { background: rgba(255,255,255,.2); color: #fff; }
    .topbar-breadcrumb { font-size: .9rem; font-weight: 500; color: var(--text-secondary); }
    .topbar-date { font-size: .8rem; color: var(--text-muted); }
    .mobile-menu-btn { display: none; }
    .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 99; }
    @media (max-width: 768px) {
      .mobile-menu-btn { display: flex !important; }
      .sidebar-overlay { display: block; }
    }
  `]
})
export class ShellComponent {
  sidebarOpen = signal(false);
  today = new Date();
  todayLabel = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  private nav: NavItem[] = [
    { label: 'Dashboard',      icon: '◈',  route: '/dashboard' },
    { label: 'Citas',          icon: '📅', route: '/appointments' },
    { label: 'Pacientes',      icon: '👤', route: '/patients' },
    { label: 'Profesionales',  icon: '🩺', route: '/professionals', roles: ['admin', 'receptionist'] },
    { label: 'Especialidades', icon: '🏥', route: '/specialties', roles: ['admin'] },
    { label: 'Usuarios',       icon: '🔑', route: '/users', roles: ['admin'] },
  ];

  user = this.auth.currentUser;
  visibleNav = computed(() => {
    const role = this.user()?.role;
    return this.nav.filter(n => !n.roles || (role && n.roles.includes(role)));
  });
  initials = computed(() => {
    const name = this.user()?.name || '';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  });
  roleLabel = computed(() => {
    const map: Record<string, string> = { admin: 'Administrador', receptionist: 'Recepcionista', professional: 'Profesional' };
    return map[this.user()?.role || ''] || '';
  });
  pageTitle = computed(() => {
    const route = window.location.pathname;
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard', '/appointments': 'Gestión de Citas',
      '/patients': 'Pacientes', '/professionals': 'Profesionales',
      '/specialties': 'Especialidades', '/users': 'Usuarios'
    };
    return Object.entries(map).find(([k]) => route.startsWith(k))?.[1] || 'MediConsulta';
  });

  constructor(private auth: AuthService, private router: Router) {}
  logout() { this.auth.logout(); }
}
