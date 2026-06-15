// Convierte cualquier valor de fecha (ISO string, Date) a DD/MM/YYYY.
// Devuelve 'N/A' si el valor es nulo/vacío, o el string original si no es una fecha.
export const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Detecta si un valor es un ISO date string (p.ej. "1996-08-23T00:00:00.000Z")
export const isIsoDate = (value) => {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}/.test(value);
};

// Formatea cualquier valor de campo para mostrar en la UI
export const formatFieldValue = (value) => {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return 'N/A';
  if (isIsoDate(String(value))) return formatDate(value);
  return String(value);
};

// Calcula el tiempo entre dos fechas en formato legible (ej: "3 meses 5 días")
export const calcularTiempo = (inicio, fin) => {
  if (!inicio) return null;
  const desde = new Date(inicio);
  const hasta = fin ? new Date(fin) : new Date();
  if (isNaN(desde.getTime())) return null;
  const diffMs = hasta - desde;
  if (diffMs < 0) return null;
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias < 30) return `${dias} día${dias !== 1 ? 's' : ''}`;
  const meses = Math.floor(dias / 30);
  const diasResto = dias % 30;
  if (diasResto === 0) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
  return `${meses} mes${meses !== 1 ? 'es' : ''} ${diasResto} día${diasResto !== 1 ? 's' : ''}`;
};