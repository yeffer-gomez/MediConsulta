# MediConsulta – Sistema de Gestión de Consultorio Médico

Aplicación web completa para gestión de consultorios médicos construida con **Node.js**, **Angular 17** y **PostgreSQL**, desplegada mediante **Docker Compose**.

---

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Angular 17     │────▶│  Node.js API     │────▶│  PostgreSQL   │
│  (Puerto 4200)  │     │  (Puerto 3000)   │     │  (Puerto 5432)│
│  nginx:alpine   │     │  Express + JWT   │     │  v15-alpine   │
└─────────────────┘     └──────────────────┘     └───────────────┘
```

---

## 🚀 Inicio rápido

### Pre-requisitos
- [Docker](https://docs.docker.com/get-docker/) y Docker Compose instalados

### Ejecutar la aplicación

```bash
# Clonar o descomprimir el proyecto
cd medical-clinic

# Levantar todos los servicios
docker compose up --build

# Acceder en el navegador:
# Frontend: http://localhost:4200
# API:      http://localhost:3000/api/health
```

### Detener la aplicación
```bash
docker compose down

# Para eliminar también los datos de la base de datos:
docker compose down -v
```

---

## 👤 Credenciales de acceso

| Rol             | Usuario                    | Contraseña   |
|-----------------|----------------------------|--------------|
| Administrador   | admin@clinica.com          | Admin123!    |
| Recepcionista   | recepcion@clinica.com      | Admin123!    |
| Dr. Pérez       | dr.perez@clinica.com       | Admin123!    |
| Dra. Martínez   | dra.martinez@clinica.com   | Admin123!    |

---

## 📦 Estructura del proyecto

```
medical-clinic/
├── docker-compose.yml          # Orquestación de servicios
├── database/
│   └── init.sql                # Schema + datos iniciales
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Punto de entrada
│       ├── config/
│       │   └── database.js     # Conexión PostgreSQL (pool)
│       ├── middleware/
│       │   └── auth.middleware.js  # JWT + RBAC
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── patient.controller.js
│       │   ├── professional.controller.js
│       │   ├── appointment.controller.js
│       │   ├── specialty.controller.js
│       │   ├── dashboard.controller.js
│       │   └── user.controller.js
│       └── routes/
│           ├── auth.routes.js
│           ├── patient.routes.js
│           ├── professional.routes.js
│           ├── appointment.routes.js
│           ├── specialty.routes.js
│           ├── dashboard.routes.js
│           └── user.routes.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── angular.json
    ├── package.json
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css          # Estilos globales
        └── app/
            ├── app.component.ts
            ├── app.config.ts
            ├── app.routes.ts
            ├── models/index.ts
            ├── interceptors/auth.interceptor.ts
            ├── guards/auth.guard.ts
            ├── services/
            │   ├── auth.service.ts
            │   └── api.service.ts
            ├── components/
            │   └── shell/shell.component.ts   # Layout principal
            └── pages/
                ├── login/login.component.ts
                ├── dashboard/dashboard.component.ts
                ├── patients/
                │   ├── patients.component.ts
                │   └── patient-detail.component.ts
                ├── professionals/professionals.component.ts
                ├── specialties/specialties.component.ts
                ├── appointments/appointments.component.ts
                └── users/users.component.ts
```

---

## 🔌 API REST – Endpoints

### Autenticación
| Método | Ruta                        | Descripción              |
|--------|-----------------------------|--------------------------|
| POST   | /api/auth/login             | Iniciar sesión           |
| PUT    | /api/auth/change-password   | Cambiar contraseña       |

### Pacientes
| Método | Ruta                         | Acceso                   |
|--------|------------------------------|--------------------------|
| GET    | /api/patients                | Todos                    |
| GET    | /api/patients/:id            | Todos                    |
| GET    | /api/patients/:id/appointments | Todos                  |
| POST   | /api/patients                | Admin, Recepcionista     |
| PUT    | /api/patients/:id            | Admin, Recepcionista     |
| DELETE | /api/patients/:id            | Admin                    |

### Profesionales
| Método | Ruta                              | Acceso                |
|--------|-----------------------------------|-----------------------|
| GET    | /api/professionals                | Todos                 |
| GET    | /api/professionals/:id            | Todos                 |
| GET    | /api/professionals/:id/available-slots | Todos            |
| POST   | /api/professionals                | Admin                 |
| PUT    | /api/professionals/:id            | Admin                 |

### Citas
| Método | Ruta                          | Acceso                  |
|--------|-------------------------------|-------------------------|
| GET    | /api/appointments             | Todos (filtrado por rol)|
| GET    | /api/appointments/today       | Todos                   |
| GET    | /api/appointments/:id         | Todos                   |
| POST   | /api/appointments             | Admin, Recepcionista    |
| PUT    | /api/appointments/:id         | Admin, Recepcionista    |
| PATCH  | /api/appointments/:id/cancel  | Todos                   |

### Especialidades
| Método | Ruta                    | Acceso  |
|--------|-------------------------|---------|
| GET    | /api/specialties        | Todos   |
| POST   | /api/specialties        | Admin   |
| PUT    | /api/specialties/:id    | Admin   |
| DELETE | /api/specialties/:id    | Admin   |

### Dashboard
| Método | Ruta                  | Acceso |
|--------|-----------------------|--------|
| GET    | /api/dashboard/stats  | Todos  |

---

## 🔒 Roles y permisos

| Funcionalidad              | Admin | Recepcionista | Profesional |
|----------------------------|:-----:|:-------------:|:-----------:|
| Ver dashboard              | ✅    | ✅            | ✅          |
| Ver pacientes              | ✅    | ✅            | ✅          |
| Crear/editar pacientes     | ✅    | ✅            | ❌          |
| Eliminar pacientes         | ✅    | ❌            | ❌          |
| Ver citas                  | ✅    | ✅            | Solo propias|
| Agendar/reprogramar citas  | ✅    | ✅            | ❌          |
| Cancelar citas             | ✅    | ✅            | ✅          |
| Cambiar estado de cita     | ✅    | ✅            | ✅          |
| Gestionar profesionales    | ✅    | ❌            | ❌          |
| Gestionar especialidades   | ✅    | ❌            | ❌          |
| Gestionar usuarios         | ✅    | ❌            | ❌          |

---

## 🗄️ Modelo de base de datos

```
users ──────────────────┐
  id, email, name,      │
  password_hash, role   │
                        ▼
specialties         professionals
  id, name,           id, user_id (FK),
  description         specialty_id (FK),
       │              license_number,
       │              consultation_duration_minutes
       │                    │
       └────────────────────┤
                            ▼
                        schedules
                          id, professional_id (FK),
                          day_of_week, start_time, end_time

patients
  id, document_type, document_number,
  first_name, last_name, birth_date,
  phone, email, blood_type, allergies,
  medical_history

        ┌──────────┬─────────────┐
        │          │             │
    patients   professionals  specialties
        │          │             │
        └──────────┴─────────────┘
                   │
              appointments
                id, patient_id, professional_id,
                specialty_id, scheduled_date,
                scheduled_time, duration_minutes,
                status, reason, notes
```

---

## 🛠️ Desarrollo local (sin Docker)

### Backend
```bash
cd backend
npm install
# Crear archivo .env con:
# DB_HOST=localhost DB_PORT=5432 DB_USER=clinic_user
# DB_PASSWORD=clinic_pass DB_NAME=clinic_db JWT_SECRET=dev_secret
npm run dev
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

---

## 📋 Variables de entorno (backend)

| Variable         | Descripción                     | Default           |
|------------------|---------------------------------|-------------------|
| PORT             | Puerto del servidor             | 3000              |
| DB_HOST          | Host de PostgreSQL              | postgres          |
| DB_PORT          | Puerto de PostgreSQL            | 5432              |
| DB_USER          | Usuario de la base de datos     | clinic_user       |
| DB_PASSWORD      | Contraseña de la BD             | clinic_pass       |
| DB_NAME          | Nombre de la base de datos      | clinic_db         |
| JWT_SECRET       | Clave secreta para JWT          | (requerida)       |
| JWT_EXPIRES_IN   | Expiración del token            | 24h               |

---

## 🔧 Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Acceder al contenedor de la BD
docker compose exec postgres psql -U clinic_user -d clinic_db

# Reconstruir un servicio específico
docker compose up --build backend

# Ver estado de los contenedores
docker compose ps
```
