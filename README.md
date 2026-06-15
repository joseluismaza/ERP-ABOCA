# ERP-ABOCA

Sistema de gestión interna (ERP) para el control de **trabajadores**, **materiales/hardware** y **líneas de teléfono** de la empresa Aboca. Permite a los administradores dar de alta y baja personal, asignar equipos informáticos y líneas móviles, generar documentación (actas de entrega/devolución, llaveros de credenciales en PDF), exportar listados a Excel y consultar un historial de auditoría de todos los cambios.

---

## Tecnologías

### Backend

| Paquete | Para qué sirve |
|---|---|
| Node.js + Express | Servidor de la API REST |
| MongoDB + Mongoose | Base de datos y modelos de datos |
| `jsonwebtoken` | Autenticación de administradores mediante tokens JWT |
| `bcryptjs` | Cifrado seguro de contraseñas de administradores |
| `dotenv` | Gestión de variables de entorno |
| `exceljs` | Generación de exportaciones Excel |
| `pdfkit` + `pdfjs` | Generación de PDFs (actas, llavero de credenciales) |
| `nodemailer` | Envío de correos de onboarding a nuevos trabajadores |
| `node-cron` | Tarea diaria que activa automáticamente las altas programadas |
| `helmet` | Cabeceras de seguridad HTTP |
| `cors` | Control de orígenes permitidos (CORS) |
| `express-rate-limit` | Protección contra ataques de fuerza bruta en el login |

### Frontend

| Paquete | Para qué sirve |
|---|---|
| React 18 + Vite | Framework de interfaz y bundler |
| React Router v6 | Navegación entre páginas |
| Tailwind CSS | Estilos y diseño |
| Axios | Peticiones HTTP a la API |
| `@zxing/library` | Escáner de códigos QR y de barras desde la cámara del dispositivo |
| `lucide-react` | Librería de iconos |
| `recharts` | Gráficos (incluida en el proyecto, uso futuro) |

---

## Estructura del proyecto

```
ERP-ABOCA/
├── backend/
│   ├── config/
│   │   └── db.js                   # Conexión a MongoDB
│   ├── controllers/
│   │   ├── authController.js        # Login de administradores
│   │   ├── historialController.js   # Auditoría de operaciones
│   │   ├── materialController.js    # CRUD de materiales/hardware
│   │   ├── sistemaController.js     # Estado del sistema (SMTP, etc.)
│   │   ├── telefonoController.js    # CRUD de líneas telefónicas
│   │   └── trabajadorController.js  # CRUD de trabajadores + credenciales
│   ├── middleware/
│   │   ├── auth.js                  # Guardián JWT (protege las rutas)
│   │   └── errorHandler.js          # Manejo centralizado de errores
│   ├── models/
│   │   ├── Admin.js                 # Esquema del administrador
│   │   ├── Historial.js             # Esquema del registro de auditoría
│   │   ├── Material.js              # Esquema de materiales/hardware
│   │   ├── Telefono.js              # Esquema de líneas telefónicas
│   │   └── Trabajador.js            # Esquema de trabajadores
│   ├── routes/
│   │   ├── auth.js                  # POST /api/auth/login
│   │   ├── historial.js             # GET /api/historial
│   │   ├── materiales.js            # CRUD /api/materiales
│   │   ├── sistemaRoutes.js         # GET /api/sistema
│   │   ├── telefonos.js             # CRUD /api/telefonos
│   │   └── trabajadores.js          # CRUD /api/trabajadores
│   ├── services/
│   │   ├── cronService.js           # Tarea programada de activación de altas
│   │   ├── materialesDocumentService.js  # Generación de actas PDF
│   │   └── onboardingService.js     # Envío de correo de bienvenida
│   ├── utils/
│   │   └── crypto.js                # Cifrado/descifrado de credenciales de trabajadores
│   ├── vercel.json                  # Configuración de despliegue en Vercel (backend)
│   └── server.js                    # Punto de entrada del backend
└── frontend/
    └── src/
        ├── components/
        │   ├── CreateMaterialModal.jsx
        │   ├── CreateTelefonoModal.jsx
        │   ├── CreateTrabajadorModal.jsx
        │   ├── EditMaterialModal.jsx
        │   ├── EditTelefonoModal.jsx
        │   ├── EditTrabajadorModal.jsx
        │   ├── Header.jsx
        │   ├── NotificationDropdown.jsx
        │   ├── PrivateRoute.jsx          # Protege las rutas que requieren sesión
        │   ├── ScannerModal.jsx
        │   ├── Sidebar.jsx
        │   ├── Table.jsx
        │   ├── ViewMaterialModal.jsx
        │   ├── ViewTelefonosModal.jsx
        │   ├── ViewTrabajadorModal.jsx
        │   └── ZXingScanner.jsx          # Escáner de cámara integrado
        ├── contexts/
        │   ├── AuthContext.jsx            # Estado de sesión del administrador
        │   ├── GlobalDataContext.jsx      # Datos globales (trabajadores, materiales, teléfonos)
        │   ├── NotificationContext.jsx    # Alertas y notificaciones de inventario
        │   └── SidebarContext.jsx         # Control de apertura del sidebar en móvil
        ├── hooks/
        │   ├── useApi.js                  # Hook genérico para llamadas a la API con cancelación
        │   ├── useForm.js                 # Hook genérico para gestión de formularios
        │   └── usePagination.js           # Hook de paginación de listados
        ├── pages/
        │   ├── Dashboard.jsx              # Buscador global y estadísticas
        │   ├── HistorialPage.jsx          # Libro de auditoría
        │   ├── Login.jsx                  # Pantalla de acceso
        │   ├── MaterialesPage.jsx         # Gestión de hardware
        │   ├── TelefonosPage.jsx          # Gestión de telefonía
        │   └── TrabajadoresPage.jsx       # Gestión de personal
        ├── services/
        │   ├── api.js                     # Instancia Axios configurada (baseURL, token, interceptores)
        │   ├── historialService.js
        │   ├── materialService.js
        │   ├── telefonoService.js
        │   └── trabajadorService.js
        ├── App.jsx                        # Rutas y layout general de la aplicación
        └── main.jsx                       # Punto de entrada de React
```

---

## Puesta en marcha

### Requisitos previos

- Node.js v18 o superior
- Una base de datos MongoDB (local o en MongoDB Atlas)

### 1. Clonar el repositorio

```bash
git clone https://github.com/joseluismaza/ERP-ABOCA.git
cd ERP-ABOCA
```

### 2. Configurar y arrancar el backend

```bash
cd backend
npm install
```

Crea un archivo **`backend/.env`** con las siguientes variables. Las marcadas como obligatorias harán que el servidor no arranque si no están definidas.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MONGODB_URI` | ✅ Sí | Cadena de conexión a tu base de datos MongoDB |
| `JWT_SECRET` | ✅ Sí | Clave secreta para firmar los tokens de sesión de administradores |
| `PDF_OWNER_KEY` | ✅ Sí | Clave para proteger y firmar los PDFs generados |
| `ENCRYPTION_KEY` | ✅ Sí | Clave para cifrar las contraseñas de trabajadores (Aboca/Apple) en la base de datos |
| `SMTP_HOST` | ✅ Sí | Servidor SMTP para el envío de correos de onboarding |
| `SMTP_USER` | ✅ Sí | Usuario de la cuenta SMTP |
| `SMTP_PASS` | ✅ Sí | Contraseña de la cuenta SMTP |
| `SMTP_PORT` | No (587 por defecto) | Puerto del servidor SMTP |
| `EMAIL_FALLBACK_RRHH` | No | Email de RRHH al que avisar si falla un envío de onboarding |
| `FRONTEND_URL` | Recomendada | URL(s) del frontend permitidas por CORS. Admite varias separadas por comas. Ejemplo: `http://localhost:5173,https://erp-aboca.vercel.app` |
| `PORT` | No (5000 por defecto) | Puerto en el que escucha el servidor |
| `NODE_ENV` | No | `development` o `production` |

Arrancar el backend:

```bash
# Desarrollo (con reinicio automático al guardar)
npm run dev

# Producción
npm start
```

### 3. Configurar y arrancar el frontend

```bash
cd ../frontend
npm install
```

Crea un archivo **`frontend/.env`** con:

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API del backend. En desarrollo: `http://localhost:5000/api`. En producción: la URL pública del backend desplegado. Si no se define, usa `http://localhost:5000/api` por defecto. |

Arrancar el frontend:

```bash
# Desarrollo
npm run dev

# Compilar para producción
npm run build
```

---

## Despliegue en producción

### Frontend (Vercel / Netlify)

1. Conecta el repositorio y selecciona la carpeta `frontend` como raíz del proyecto.
2. **Configura la variable de entorno `VITE_API_URL`** apuntando a la URL pública del backend (por ejemplo `https://tu-backend.onrender.com/api`). **Sin esta variable el login no funcionará.**
3. El comando de build es `npm run build` y el directorio de salida es `dist`.

### Backend (Render / Railway)

1. Configura todas las variables de entorno obligatorias listadas arriba.
2. La variable `FRONTEND_URL` debe incluir el dominio real del frontend en producción para que CORS lo permita.
3. El comando de inicio es `npm start`.

---

## Funcionalidades principales

### Trabajadores
- Alta, edición y baja de personal con todos sus datos (DNI, cargo, zona, matrícula SAP, etc.)
- Activación automática de altas programadas mediante tarea diaria `node-cron`: si se crea un trabajador con estado "Pendiente de alta" y una fecha de alta futura, el sistema lo activa automáticamente ese día.
- Credenciales corporativas (cuenta Aboca y Apple ID) cifradas en la base de datos. Solo se revelan bajo reconfirmación explícita de la contraseña del administrador.
- Generación de "llavero de credenciales" en PDF protegido con el DNI del trabajador.
- Exportación del listado completo a Excel.

### Materiales / Hardware
- Inventario de activos (portátiles, móviles, tablets, monitores, teclados, ratones).
- Asignación y desasignación a trabajadores con registro automático de fechas.
- Gestión de contratos de renting con fecha de vencimiento calculada y campo de devolución.
- Gestión de siniestros (dispositivos robados con número de denuncia).
- Generación de actas de entrega y devolución en PDF.
- Exportación a Excel.

### Teléfonos
- Gestión de líneas móviles corporativas con datos de la SIM (ICC, PIN, PUK, tipo eSIM/SIM Física).
- Asignación a trabajadores.
- Exportación a Excel.

### Dashboard
- Buscador global que cruza trabajadores, materiales y teléfonos en tiempo real.
- Escáner de código QR/barras integrado mediante la cámara del dispositivo.
- Estadísticas de estado del inventario.

### Historial
- Registro inmutable de todas las operaciones: altas, bajas, modificaciones y asignaciones.
- Filtrable por acción y detalle.

---

## Seguridad

- Las contraseñas de administradores se almacenan con `bcryptjs` (hash + salt).
- Las contraseñas de cuentas de trabajadores (Aboca/Apple) se almacenan cifradas con AES y **nunca se devuelven por la API** salvo a través del flujo explícito de revelación que exige reconfirmar la contraseña del administrador en ese mismo momento.
- Todas las rutas de la API (salvo `/api/auth/login`) requieren un token JWT válido en la cabecera `Authorization`.
- El token JWT se almacena exclusivamente en memoria de la aplicación React (no en `localStorage` ni `sessionStorage`), lo que lo protege frente a ataques XSS.
- Rate limiting activo en todos los endpoints y especialmente reforzado en `/api/auth/login` (máximo 20 intentos por ventana de 15 minutos).
- CORS configurado para aceptar solo los orígenes declarados en `FRONTEND_URL`.

---

## Notas de base de datos

Si el proyecto fue migrado desde una versión anterior en la que los modelos `Trabajador` y `Telefono` tenían un campo `id` propio, es posible que la colección en MongoDB Atlas conserve un índice único `id_1`. Ese índice puede provocar errores `E11000` (clave duplicada) al crear el segundo documento nuevo. Hay que eliminarlo manualmente desde la consola de Atlas:

```
db.trabajadores.dropIndex("id_1")
db.telefonos.dropIndex("id_1")
```