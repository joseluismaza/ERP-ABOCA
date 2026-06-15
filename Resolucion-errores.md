# Resolución de Errores — ERP-ABOCA

Documento que recoge todos los problemas detectados y corregidos durante la revisión completa del repositorio (backend y frontend), archivo por archivo.

Los errores están agrupados por tipo y ordenados de mayor a menor gravedad.

---

## 🔴 Errores críticos — El sistema falla o es inseguro

### 1. El login no funciona en producción
**Archivo:** `frontend/src/pages/Login.jsx`

El formulario de login usaba `axios` directamente con una URL relativa `/api/auth/login`. En desarrollo esto funciona porque el proxy de Vite reenvía esa URL al backend local. Pero en producción (Vercel), no existe ese proxy: la petición apuntaba al propio dominio del frontend, donde no hay ningún backend. **Nadie habría podido iniciar sesión en el despliegue real.**

**Solución:** Sustituido el `axios` directo por la instancia `api` configurada en `services/api.js`, que usa la variable de entorno `VITE_API_URL` tanto en desarrollo como en producción. También se eliminaron el `transformRequest` manual y la adaptación del manejo de errores al formato normalizado de `api.js`.

---

### 2. Las rutas de descarga de PDF apuntaban a `localhost:5000` en producción
**Archivos:** `frontend/src/components/ViewMaterialModal.jsx`, `ViewTelefonosModal.jsx`, `ViewTrabajadorModal.jsx`

Los tres modales de "Ver detalles" hacían peticiones de descarga de PDF con URLs absolutas hardcodeadas (`http://localhost:5000/api/...`) usando `axios` directamente y sin cabecera de autorización. En producción, esas URLs no existen y las descargas fallaban siempre. Además, sin el token JWT no habrían funcionado ni en local.

**Solución:** Los tres modales ahora usan funciones de sus respectivos servicios (`descargarActaMaterial`, `descargarLlaveroCredenciales`), que usan la instancia `api` configurada correctamente con la `baseURL` y el token de autenticación.

---

### 3. Rutas del backend sin protección de autenticación
**Archivo:** `backend/routes/sistemaRoutes.js`

Los endpoints bajo `/api/sistema/*` no tenían el middleware `auth` aplicado. Cualquier persona que conociera la URL podía acceder a información del estado del sistema sin necesidad de iniciar sesión.

**Solución:** Añadido `import auth from '../middleware/auth.js'` y aplicado `router.use(auth)` al inicio del archivo para proteger todos los endpoints del sistema.

---

### 4. Secretos hardcodeados como valores por defecto
**Archivo:** `backend/server.js`

Las variables `JWT_SECRET` y `PDF_OWNER_KEY` tenían valores de fallback escritos directamente en el código (`'aboca_jwt_secret_2024'` y `'AbocaOwnerPass2024'`). Si el archivo `.env` no estaba configurado, el servidor arrancaba igualmente usando esas claves inseguras y predecibles.

**Solución:** El servidor ahora comprueba al arrancar que todas las variables obligatorias (`JWT_SECRET`, `PDF_OWNER_KEY`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) están definidas y lanza un error explicativo si falta alguna, impidiendo el arranque sin configuración segura.

---

### 5. Las contraseñas cifradas de los trabajadores se enviaban en el correo de onboarding
**Archivo:** `backend/services/onboardingService.js`

El correo de bienvenida al nuevo trabajador incluía los campos `password` y `passwordApple` del objeto tal como estaban en la base de datos: cifrados con AES. El trabajador recibía texto incomprensible en lugar de su contraseña real.

**Solución:** Antes de construir el correo, se descifran las credenciales usando el helper `descifrarCredencialesTrabajador()`, de modo que el trabajador recibe sus contraseñas en texto legible.

---

### 6. Crash de React al abrir modales: "Rendered fewer hooks than expected"
**Archivos:** `CreateTrabajadorModal.jsx`, `EditTrabajadorModal.jsx`, `EditTelefonoModal.jsx`, `ViewMaterialModal.jsx`, `ViewTelefonosModal.jsx`, `ViewTrabajadorModal.jsx`

Los seis modales tenían un `return null` condicional (`if (!isOpen || !item) return null`) situado **antes** de las declaraciones de `useState`, `useEffect` o `useMemo`. Las reglas de React prohíben esto: los hooks deben ejecutarse siempre en el mismo orden en cada renderizado. Cuando el modal pasaba de cerrado a abierto, React detectaba que el número de hooks había cambiado y **rompía la pantalla completamente** con el error "Rendered fewer hooks than expected".

**Solución:** En los seis archivos, el `return null` se ha movido al final del componente, justo antes del `return (` del JSX, después de declarar todos los hooks. Los hooks que antes asumían que `item` existía se han hecho seguros usando `?.` y valores por defecto (`item || {}`, `item ? [...] : []`).

---

### 7. Error `ReferenceError` al eliminar un material
**Archivo:** `backend/controllers/materialController.js`

La función `deleteMaterial` intentaba usar una variable `material` que nunca se había declarado en ese scope. Al intentar borrar cualquier material desde el frontend, el servidor devolvía un error 500.

**Solución:** Corregida la variable al nombre correcto que sí existía en el ámbito de esa función.

---

### 8. El login devolvía error 500 si el campo password estaba excluido del modelo
**Archivo:** `backend/models/Admin.js` + `backend/controllers/authController.js`

El campo `password` del modelo `Admin` tenía `select: false` para que no se devolviera en las consultas normales. Pero la consulta de login hacía `Admin.findOne({ username })` sin añadir `.select('+password')`, de modo que bcrypt recibía `undefined` como hash y lanzaba `Error: Illegal arguments: string, undefined`.

**Solución:** Añadido `.select('+password')` en la consulta de `authController.js` (login) y en `trabajadorController.js` (revelación de credenciales).

---

## 🟠 Errores funcionales — La funcionalidad no hace lo que promete

### 9. El escáner de códigos del Dashboard no hacía nada al detectar un código
**Archivo:** `frontend/src/pages/Dashboard.jsx`

El componente `ZXingScanner` se llamaba con la prop `onScanSuccess`, pero el componente espera `onDetected` y `onClose`. Al escanear un código, el texto detectado nunca llegaba a la función de búsqueda.

**Solución:** Cambiado a `onDetected={handleScanSuccess} onClose={() => setScannerOpen(false)}`.

---

### 10. El buscador del Dashboard siempre mostraba "Stock Disponible" en materiales
**Archivo:** `frontend/src/pages/Dashboard.jsx`

El cruce de datos trabajador↔material usaba `m.asignadoA`, un campo que fue renombrado a `m.TrabajadorId` durante una migración anterior del modelo. Como `asignadoA` ya no existe, el lookup del custodio siempre devolvía `undefined`, y la columna "Custodio" mostraba "Stock Disponible" para todos los materiales, estuvieran asignados o no.

**Solución:** Todos los usos de `m.asignadoA` en `Dashboard.jsx` sustituidos por `m.TrabajadorId?._id || m.TrabajadorId`.

---

### 11. El cruce material↔teléfono en el Dashboard nunca encontraba nada
**Archivo:** `frontend/src/pages/Dashboard.jsx`

El buscador cruzado intentaba enlazar materiales con teléfonos comparando `m.numeroTelefono === p.numeroTelefono`. El modelo `Material` no tiene un campo `numeroTelefono`: tiene `telefonoId`, que es una referencia al `_id` del documento `Telefono`.

**Solución:** El cruce ahora compara `m.telefonoId` (el ObjectId de referencia) con `p._id`, usando `String()` para evitar problemas de comparación de tipos.

---

### 12. La tabla de teléfonos nunca mostraba el indicador de carga
**Archivo:** `frontend/src/pages/TelefonosPage.jsx`

El componente `Table` recibía `loading={!!loading.telefonos}`. La variable `loading` de `useGlobalData()` es un booleano simple (`true`/`false`), no un objeto con claves por colección. `loading.telefonos` siempre era `undefined`, así que la tabla mostraba "No se encontraron registros" mientras los datos cargaban.

**Solución:** Cambiado a `loading={loading}`.

---

### 13. La ficha del trabajador mostraba una tarjeta "[object Object]"
**Archivo:** `frontend/src/pages/TrabajadoresPage.jsx`

Al abrir "Ver detalles" de un trabajador, se pasaba al modal `{ ...t, telefonoAsignado: telefonoAsignado || null }`. El modal `ViewTrabajadorModal` muestra todos los campos del objeto como tarjetas genéricas, pero no excluye `telefonoAsignado`. Resultado: si el trabajador tenía línea, aparecía una tarjeta extra "TELEFONOASIGNADO: [object Object]".

**Solución:** Eliminado el campo extra. Ahora se pasa directamente `t` al modal: `setSelectedTrabajador(t)`.

---

### 14. Crear un teléfono siempre fallaba con error de validación
**Archivo:** `frontend/src/components/CreateTelefonoModal.jsx`

El formulario de alta de teléfono enviaba `estado: 'activo'` en minúsculas. El esquema de Mongoose solo acepta los valores `['Disponible', 'Asignado', 'disponible', 'asignado']`. El valor `'activo'` no estaba entre ellos, así que MongoDB rechazaba la inserción con un error de validación.

**Solución:** Cambiado el valor inicial a `estado: 'Disponible'`.

---

### 15. El selector de teléfono en el modal de editar material mostraba paréntesis vacíos
**Archivos:** `frontend/src/components/EditMaterialModal.jsx`, `frontend/src/components/EditTelefonoModal.jsx`

El selector mostraba cada línea como `{tel.numeroTelefono} ({tel.operador})`. El modelo `Telefono` no tiene ningún campo `operador`, siempre era `undefined`. El resultado era una lista con entradas del tipo "600 123 456 ()" con paréntesis vacíos.

**Solución:** Sustituido `tel.operador` por `tel.tipoSIM` (que sí existe y muestra un dato útil: "eSIM" o "SIM Física").

---

### 16. El cron de activación de trabajadores no registraba en el Historial
**Archivo:** `backend/services/cronService.js`

La activación automática de altas pendientes usaba `Trabajador.updateMany(...)`, que modifica los documentos directamente en la base de datos sin crear ningún registro en el historial de auditoría. Si un trabajador aparecía como "Activo" sin que nadie lo hubiera activado manualmente, no había ninguna traza de cuándo ni cómo ocurrió.

**Solución:** Refactorizado para activar cada trabajador individualmente con `findByIdAndUpdate` y crear un registro en `Historial` por cada activación. Esta misma función se reutiliza ahora también cuando se carga la página de trabajadores.

---

### 17. El filtro de búsqueda del historial incluía un campo inexistente
**Archivo:** `frontend/src/pages/HistorialPage.jsx`

El filtro de texto buscaba en `r.usuario`, un campo que no existe en el modelo `Historial` y nunca se ha guardado. El placeholder decía "Filtrar por operador, acción o detalle..." pero la búsqueda por "operador" no funcionaba nunca.

**Solución:** Eliminada la referencia a `r.usuario` del filtro. El placeholder se ha actualizado a "Filtrar por acción o detalle...".

---

### 18. El estado de la tabla en MaterialesPage nunca llegaba al componente Table
**Archivo:** `frontend/src/pages/MaterialesPage.jsx`

Se pasaba `loading={loading?.materiales}` al componente `Table`. `loading` es un booleano, no un objeto, así que `loading?.materiales` siempre era `undefined`. La tabla tampoco recibía el estado de carga.

**Solución:** Eliminado el prop `loading` de la tabla (la página ya muestra un spinner de pantalla completa mientras `loading === true`).

---

### 19. Resetear el formulario de alta de trabajador dejaba los inputs sin valor
**Archivo:** `frontend/src/components/CreateTrabajadorModal.jsx`

Tras dar de alta un trabajador con éxito, el código ejecutaba `setFormData({})`, dejando todos los campos del formulario sin valor definido. Esto convertía los inputs de "controlados" (con `value=`) a "no controlados", generando errores en la consola de React y comportamientos extraños si el modal se volvía a abrir.

**Solución:** Extraídos los valores iniciales a una función `getInitialFormData()` reutilizable. Ahora el reset llama a `setFormData(getInitialFormData())`, que repone todos los campos con sus valores por defecto correctos.

---

### 20. La variable de recarga de datos en TelefonosPage no existía
**Archivo:** `frontend/src/pages/TelefonosPage.jsx`

El componente desestructuraba `reloadGlobalData` de `useGlobalData()`, pero ese nombre no existe en el contexto (solo existe `refreshGlobalData`). La variable siempre era `undefined`. El código hacía `ejecutarRefrescoBBDD = refreshGlobalData || reloadGlobalData`, lo que funcionaba "de casualidad" porque `refreshGlobalData` sí existía, pero generaba una variable intermedia innecesaria con dead code.

**Solución:** Eliminada la variable muerta. Todos los usos sustituidos directamente por `refreshGlobalData`.

---

### 21. La columna "Custodio" del Dashboard siempre mostraba "Stock Disponible" para teléfonos
**Archivo:** `frontend/src/pages/Dashboard.jsx`

El cruce de teléfonos usaba `p.asignadoA` para encontrar al titular. El modelo `Telefono` renombró ese campo a `TrabajadorId` (con un virtual de compatibilidad `asignadoA` que solo funciona en el servidor, no en el objeto JSON que llega al frontend).

**Solución:** Sustituido por `p.TrabajadorId?._id || p.TrabajadorId` en el lookup del titular.

---

## 🟡 Mejoras de código y limpieza

### 22. `createHistorial` era código muerto inutilizado
**Archivos:** `backend/controllers/historialController.js`, `backend/routes/historial.js`, `frontend/src/services/historialService.js`

La función `createHistorialEntry` del frontend llamaba a `POST /api/historial`, pero ningún componente ni hook la importaba o usaba en ningún sitio. El endpoint existía pero era inalcanzable.

**Solución:** Eliminados `createHistorial` del controlador, la ruta `POST /` del router de historial, y `createHistorialEntry` del servicio del frontend.

---

### 23. El servicio SMTP tenía valores de placeholder hardcodeados como fallback
**Archivo:** `backend/services/onboardingService.js`

Si las variables de entorno SMTP no estaban definidas, el código usaba como fallback `'tu-correo-corporativo@aboca.es'` y similar. Esto hacía que el servidor arrancara sin avisar y los correos fallaran silenciosamente apuntando a direcciones inventadas.

**Solución:** Eliminados los valores de fallback. Las variables `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` se han añadido a la lista de variables obligatorias del servidor: si no están, el servidor no arranca.

---

### 24. Código muerto en `trabajadorController.js`
**Archivo:** `backend/controllers/trabajadorController.js`

La función `createTrabajador` tenía este bloque:
```javascript
if (!nuevoTrabajador.id) {
  nuevoTrabajador.id = nuevoTrabajador._id.toString();
}
```
Tras eliminar el campo `id` personalizado del modelo (que duplicaba el `_id` de MongoDB), el virtual `id` que genera Mongoose automáticamente siempre existe y siempre es truthy. El bloque era inalcanzable.

**Solución:** Eliminado el bloque.

---

### 25. Columnas de contraseñas en el Excel de trabajadores siempre vacías
**Archivo:** `backend/controllers/trabajadorController.js`

El export a Excel incluía columnas "Password Aboca" y "Password Apple". Con `select: false` en el modelo, esos campos nunca llegan al controlador, por lo que las columnas siempre estaban vacías en el archivo descargado.

**Solución:** Eliminadas las dos columnas del Excel con acuerdo del usuario.

---

### 26. Ruta duplicada en las rutas de trabajadores
**Archivo:** `backend/routes/trabajadores.js`

Existían dos rutas para las credenciales: `POST /:id/credenciales` y `POST /:id/credenciales-lote`. Solo la segunda (`credenciales-lote`) se usa desde el frontend. La primera era un alias muerto que podía causar confusión.

**Solución:** Eliminada la ruta `/:id/credenciales` duplicada.

---

### 27. Ruta SMTP duplicada en las rutas del sistema
**Archivo:** `backend/routes/sistemaRoutes.js`

Había dos entradas para `GET /smtp-status`, y el import de `checkSMTPStatus` estaba duplicado. El frontend ya usa la ruta equivalente bajo `/api/trabajadores/smtp-status`.

**Solución:** Eliminada la ruta y el import duplicados.

---

### 28. El helper de descifrado de credenciales estaba triplicado
**Archivos:** `backend/controllers/trabajadorController.js`, `backend/services/onboardingService.js`

El bloque de código para descifrar `password` y `passwordApple` de un trabajador (con su `try/catch` por campo) se repetía en tres lugares distintos del código, copiado literalmente.

**Solución:** Extraído a una función reutilizable `descifrarCredencialesTrabajador(trabajador)` en `backend/utils/crypto.js`, y sustituidos los tres usos por llamadas a esa función.

---

### 29. La capa de caché del frontend era código muerto
**Archivos:** `frontend/src/utils/dataCache.js`, `frontend/src/services/materialService.js`, `telefonoService.js`, `trabajadorService.js`

Las funciones `getMateriales()`, `getTrabajadores()` y `getTelefonos()` de los servicios usaban un sistema de caché propio (`dataCache.js`). Pero `GlobalDataContext.jsx` —que es quien realmente carga y distribuye esos datos a toda la aplicación— nunca llamaba a esas funciones: hacía sus propias peticiones directamente con `api.get()`.

**Solución:** Eliminado `dataCache.js` por completo. Eliminadas las funciones `getXxx` de los tres servicios (se conservan solo las de crear, actualizar, eliminar y exportar, que sí se usan).

---

### 30. `useTrabajadorForm.js` no lo usaba nadie
**Archivo:** `frontend/src/hooks/useTrabajadorForm.js`

Este hook personalizado existía en el repositorio pero ningún componente lo importaba ni usaba.

**Solución:** Eliminado.

---

### 31. La detección de peticiones canceladas en `useApi` no funcionaba
**Archivos:** `frontend/src/services/api.js`, `frontend/src/hooks/useApi.js`

El interceptor de errores de `api.js` normalizaba todos los errores (incluyendo las cancelaciones de `AbortController`) a un objeto `{status, message}` antes de que `useApi.js` pudiera comprobar si la petición había sido cancelada. Cuando `useApi` recibía el error ya normalizado y comprobaba `err.code === 'ERR_CANCELED'`, el código original ya no estaba disponible.

**Solución:** El interceptor ahora comprueba si el error es una cancelación (`axios.isCancel` o `err.code === 'ERR_CANCELED'`) antes de normalizarlo, y en ese caso lo deja pasar sin modificar para que `useApi` pueda detectarlo correctamente.

---

### 32. El nombre de la función de normalización en `historialController.js` tenía una errata
**Archivo:** `backend/controllers/historialController.js`

El helper interno que normalizaba el tipo de elemento del historial tenía como comentario interno "descrucijando", una palabra inventada.

**Solución:** Corregido a "descartando".

---

### 33. El mensaje de modificación de teléfono tenía errores gramaticales
**Archivo:** `backend/controllers/telefonoController.js`

El mensaje de confirmación decía `"Número ${...} modificados..."` (plural incorrecto) y `telefono.estado.toUpperCase()` sin protección frente a valores vacíos o nulos.

**Solución:** Corregido a `"Línea ${...} modificada..."` y protegido con `String(telefono.estado || '').toUpperCase()`.

---

## 📋 Pendiente (acciones manuales requeridas)

Estas cosas no se pueden corregir desde el código, requieren acción manual:

1. **Variable `VITE_API_URL` en Vercel**: debe estar configurada en el panel de Vercel del proyecto frontend apuntando a la URL pública del backend. Sin ella el login no funciona en producción.

2. **Variables SMTP en el backend**: `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` son ahora obligatorias. El servidor no arrancará sin ellas.

3. **Índice huérfano en MongoDB Atlas**: si la colección fue creada cuando los modelos `Trabajador` y `Telefono` tenían un campo `id` propio con índice único, ese índice puede seguir existiendo en la base de datos. Provocaría un error `E11000` (clave duplicada) al crear el segundo documento nuevo. Verificar y eliminar desde la consola de Atlas si existe:
   ```
   db.trabajadores.dropIndex("id_1")
   db.telefonos.dropIndex("id_1")
   ```