import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-bg"></div>
      <div class="login-card">
        <div class="login-brand">
          <span class="brand-icon">⚕</span>
          <h1>MediConsulta</h1>
          <p>Sistema de Gestión de Consultorio</p>
        </div>

        <form (ngSubmit)="onSubmit()" #f="ngForm" class="login-form">
          <div *ngIf="error()" class="alert alert-danger">
            ⚠ {{error()}}
          </div>

          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="email" class="form-control" [(ngModel)]="email" name="email" placeholder="usuario@clinica.com" required autocomplete="username" />
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div style="position:relative">
              <input [type]="showPass() ? 'text' : 'password'" class="form-control" [(ngModel)]="password" name="password" placeholder="••••••••" required autocomplete="current-password" style="padding-right:44px" />
              <button type="button" class="pass-toggle" (click)="showPass.set(!showPass())">{{showPass() ? '🙈' : '👁'}}</button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary login-btn" [disabled]="loading()">
            <span *ngIf="loading()" class="btn-spinner"></span>
            {{loading() ? 'Ingresando...' : 'Ingresar'}}
          </button>
        </form>

        <div class="login-hint">
          <small>Demo: admin&#64;clinica.com / Admin123!</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0a3352 0%, #0f4c75 50%, #1565a0 100%);
      padding: 20px;
      position: relative; overflow: hidden;
    }
    .login-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at 30% 50%, rgba(0,180,216,.15) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 20%, rgba(21,101,192,.2) 0%, transparent 50%);
    }
    .login-card {
      background: #fff; border-radius: 20px;
      padding: 40px 44px;
      width: 100%; max-width: 420px;
      box-shadow: 0 24px 60px rgba(0,0,0,.25);
      position: relative; z-index: 1;
    }
    .login-brand { text-align: center; margin-bottom: 32px; }
    .brand-icon { font-size: 2.4rem; }
    .login-brand h1 { font-family: 'Fraunces', serif; font-weight: 300; font-size: 1.8rem; color: #0f4c75; margin: 4px 0 6px; }
    .login-brand p { color: var(--text-muted); font-size: .85rem; }
    .login-form { display: flex; flex-direction: column; gap: 4px; }
    .login-btn { width: 100%; justify-content: center; padding: 12px; font-size: .95rem; margin-top: 8px; }
    .pass-toggle {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: .9rem; color: var(--text-muted);
    }
    .btn-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .login-hint { text-align: center; margin-top: 20px; color: var(--text-muted); font-size: .78rem; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) this.router.navigate(['/dashboard']);
  }

  onSubmit() {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(err.error?.error || 'Credenciales inválidas');
        this.loading.set(false);
      }
    });
  }
}
