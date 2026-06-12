# ERP-ABOCA

Sistema de gestión interna (ERP) para el control de **trabajadores**, **materiales/hardware** y **líneas de teléfono** de la empresa. Permite a los administradores dar de alta y baja personal, asignar equipos informáticos y líneas móviles, generar documentación (actas de entrega/devolución, llaveros de credenciales en PDF), exportar listados a Excel y consultar un historial de auditoría de todos los cambios.

## Tecnologías

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- Autenticación con JWT (`jsonwebtoken`)
- Contraseñas cifradas con `bcryptjs` (administradores) y cifrado simétrico propio (credenciales de trabajadores)
- Generación de PDF (`pdfkit`, `pdfjs`) y Excel (`exceljs`)
- Envío de correos con `nodemailer`
- Tareas programadas con `node-cron` (activación automática de altas pendientes)
- Seguridad: `helmet`, `cors`, `express-rate-limit`

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Axios para las peticiones a la API
- `@zxing/library` para el escáner de códigos QR/barras desde la cámara
- `lucide-react` para iconos, `recharts` para gráficos

## Estructura del proyecto

```
ERP-ABOCA/
├── backend/
│   ├── config/          # Conexión a MongoDB
│   ├── controllers/      # Lógica de negocio de cada entidad (trabajadores, materiales, teléfonos, historial, auth, sistema)
│   ├── middleware/        # Autenticación (auth.js) y manejo de errores (errorHandler.js)
│   ├── models/             # Esquemas de Mongoose (Admin, Trabajador, Material, Telefono, Historial)
│   ├── routes/             # Definición de endpoints de la API REST
│   ├── services/           # Servicios auxiliares (cron de altas, generación de PDFs, onboarding)
│   ├── utils/               # Utilidades (cifrado de credenciales)
│   └── server.js            # Punto de entrada del backend
└── frontend/
    └── src/
        ├── components/   # Modales y componentes reutilizables (Tabla, Sidebar, Header, Scanner...)
        ├── contexts/       # Estado global (Auth, datos globales, notificaciones, sidebar)
        ├── hooks/           # Hooks reutilizables (useApi, useForm, usePagination)
        ├── pages/            # Páginas/rutas principales (Dashboard, Trabajadores, Materiales, Teléfonos, Historial, Login)
        ├── services/         # Funciones que llaman a la API (axios)
        ├── App.jsx            # Rutas y layout general
        └── main.jsx            # Punto de entrada de React
```

## Puesta en marcha

### Requisitos previos
- Node.js (v18 o superior recomendado)
- Una base de datos MongoDB (local o en MongoDB Atlas)

### 1. Backend

```bash
cd backend
npm install
```

Crea un archivo `.env` dentro de `backend/` con las siguientes variables (**todas son obligatorias**, el servidor no arrancará si falta alguna de las marcadas como tal):

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MONGODB_URI` | Sí | Cadena de conexión a tu base de datos MongoDB |
| `JWT_SECRET` | Sí | Clave secreta para firmar los tokens de sesión (administradores) |
| `PDF_OWNER_KEY` | Sí | Clave usada para proteger/firmar los PDFs generados |
| `ENCRYPTION_KEY` | Sí | Clave usada para cifrar las contraseñas de los trabajadores (Aboca/Apple) guardadas en BBDD |
| `SMTP_HOST` | Sí | Servidor SMTP para el envío de correos de onboarding |
| `SMTP_PORT` | No (por defecto 587) | Puerto del servidor SMTP |
| `SMTP_USER` | Sí | Usuario/cuenta del servidor SMTP |
| `SMTP_PASS` | Sí | Contraseña del servidor SMTP |
| `EMAIL_FALLBACK_RRHH` | No | Email de RRHH al que avisar si falla un envío de onboarding |
| `FRONTEND_URL` | No (recomendado) | URL(s) del frontend permitidas por CORS. Admite varias separadas por comas (útil para desarrollo + producción a la vez) |
| `PORT` | No (por defecto 5000) | Puerto en el que escucha el backend |
| `NODE_ENV` | No | `development` / `production` |

Arrancar en desarrollo:

```bash
npm run dev
```

Arrancar en producción:

```bash
npm start
```

### 2. Frontend

```bash
cd frontend
npm install
```

Crea un archivo `.env` dentro de `frontend/` con:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | Recomendada | URL base de la API del backend, por ejemplo `http://localhost:5000/api` en desarrollo o `https://tu-backend.onrender.com/api` en producción. Si no se define, se usa `http://localhost:5000/api` por defecto. |

Arrancar en desarrollo:

```bash
npm run dev
```

Compilar para producción:

```bash
npm run build
```

## Despliegue

- El **frontend** está pensado para desplegarse en un servicio tipo Vercel/Netlify. Es imprescindible configurar ahí la variable `VITE_API_URL` apuntando a la URL pública del backend; sin ella (o si apunta mal) el login y el resto de funcionalidades no funcionarán en producción.
- El **backend** está pensado para desplegarse en un servicio tipo Render/Railway. Hay que configurar todas las variables de entorno obligatorias listadas arriba, y `FRONTEND_URL` debe incluir el dominio real del frontend en producción para que CORS lo permita.

## Funcionalidades principales

- **Login** de administradores con JWT.
- **Trabajadores**: alta/baja/edición, activación automática de altas programadas (cron diario), credenciales corporativas (Aboca/Apple) cifradas en BBDD y reveladas solo bajo reconfirmación de contraseña, generación de "llavero" de credenciales en PDF, exportación a Excel.
- **Materiales**: inventario de hardware (portátiles, móviles, tablets, etc.), asignación a trabajadores, gestión de renting, generación de actas de entrega/devolución en PDF, exportación a Excel.
- **Teléfonos**: gestión de líneas y tarjetas SIM/eSIM, asignación a trabajadores, exportación a Excel.
- **Dashboard**: buscador global cruzado entre trabajadores, materiales y teléfonos, con escáner de código de barras/QR mediante la cámara, y estadísticas generales.
- **Historial**: registro de auditoría de todas las operaciones (altas, bajas, modificaciones, asignaciones).

## Notas de seguridad

- Las contraseñas de los administradores se almacenan con `bcryptjs`.
- Las contraseñas de cuentas de trabajadores (Aboca/Apple) se almacenan cifradas y nunca se devuelven por la API salvo a través de un flujo explícito de revelación que exige reconfirmar la contraseña del administrador.
- Todas las rutas de la API (salvo `/api/auth/login`) requieren un token JWT válido.