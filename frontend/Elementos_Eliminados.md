# Limpieza de Proyecto — ERP Aboca Frontend
**Fecha:** 2026-06-23

---

## 1. Paquetes npm eliminados

| Paquete | Versión | Motivo |
|---|---|---|
| `@zxing/library` | ^0.23.0 | Reemplazado por `@undecaf/zbar-wasm`. El escáner fue migrado al motor ZBar (WASM) que es más rápido y funciona en PWA/Windows. La librería ZXing en JavaScript puro ya no se referenciaba en ningún archivo. |
| `react-hook-form` | ^7.45.4 | Nunca se utilizó. El proyecto dispone de su propio hook personalizado `src/hooks/useForm.js` que cumple la misma función. Ningún archivo importaba `react-hook-form`. |
| `react-is` | ^19.2.6 | Sin ninguna importación en el código fuente. Dependencia residual sin uso. |

---

## 2. Archivos eliminados

### `src/pages/HistorialPage.jsx`
Página completa para mostrar el historial de auditoría interna del sistema. Estaba desarrollada y funcional, pero **nunca se registró como ruta en `App.jsx`**, por lo que era completamente inaccesible desde la aplicación. `historialService.js` **no se eliminó** porque sí es usado por `ViewMaterialModal` y `ViewTelefonosModal` para cargar el historial individual de cada elemento.

---

## 3. Props inutilizadas eliminadas

Archivo: `src/pages/Dashboard.jsx`

| Prop eliminada | Componente | Motivo |
|---|---|---|
| `title="Colaborador"` | `<ViewTrabajadorModal>` | El componente `ViewTrabajadorModal` no recibe ni utiliza ninguna prop `title`. Se pasaba sin efecto. |
| `title="Línea Telefónica"` | `<ViewTelefonosModal>` | Igual que el anterior. `ViewTelefonosModal` no acepta ni procesa esta prop. |

---

## 4. Comentarios con emojis eliminados del código fuente

Los emojis en la interfaz de usuario (botones, opciones de select, iconos del sidebar) se han mantenido intactos. Solo se han eliminado los que aparecían en comentarios de código, donde no aportan ningún valor técnico.

| Archivo | Comentario original |
|---|---|
| `src/components/CreateMaterialModal.jsx` | `// 🟢 UNA ÚNICA DECLARACIÓN COHESIVA DE useForm` |
| `src/components/EditMaterialModal.jsx` | `// 🛡️ SANEAMIENTO DE PAYLOAD: Convertimos las cadenas vacías en valores null válidos para MongoDB` |
| `src/pages/MaterialesPage.jsx` | `// 👥 FILTRAR OPERARIOS (SOLO ACTIVOS O DE BAJA) Y ORDENAR ALFABÉTICAMENTE` |
| `src/pages/MaterialesPage.jsx` | `// 🛠️ MOTOR DE FILTRADO COMBINADO Y RESPONSIVE` |
| `src/pages/TelefonosPage.jsx` | `// 🎛️ ESTADOS DE FILTRADO` |
| `src/pages/TelefonosPage.jsx` | `// 👥 ORDENAR TRABAJADORES ALFABÉTICAMENTE PARA EL SELECT` |
| `src/pages/TelefonosPage.jsx` | `// 🚀 LÓGICA DE FILTRADO COMBINADO Y MULTI-CRITERIO` |
| `src/pages/TelefonosPage.jsx` | `{/* 🛠️ CONTENEDOR FLUIDO DE FILTROS AVANZADOS */}` |

Los comentarios que sí describen un motivo no obvio (workarounds, restricciones de MongoDB, decisiones de diseño) se han conservado o reescrito sin emoji.

---

## Resultado

- **Build:** sin errores tras la limpieza
- **Funcionalidades:** sin cambios
- **Tamaño del bundle:** sin variación significativa (los paquetes eliminados ya no se cargaban en producción al no estar importados)
