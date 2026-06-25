// backend/services/vmfExcelService.js
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Trabajador from '../models/Trabajador.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta fija donde se guarda el Excel VMF
const RUTA_EXPORTS = path.join(__dirname, '../exports');
const RUTA_ARCHIVO = path.join(RUTA_EXPORTS, 'VMF_trabajadores.xlsx');

// Estados que se incluyen en el Excel VMF
const ESTADOS_INCLUIDOS = ['Activo', 'activo', 'De Baja', 'de baja'];

/**
 * Genera o sobreescribe el Excel con todos los trabajadores VMF activos o de baja.
 * Se llama automáticamente al crear un trabajador con cargo VMF.
 *
 * // INPUTS: ninguno (consulta la BD internamente)
 * // PROCESO: filtra trabajadores VMF por estado, construye el workbook y lo escribe en disco
 * // OUTPUTS: archivo VMF_trabajadores.xlsx guardado en backend/exports/
 */
export const generarExcelVMF = async () => {
  // Crear carpeta exports/ si no existe
  if (!fs.existsSync(RUTA_EXPORTS)) {
    fs.mkdirSync(RUTA_EXPORTS, { recursive: true });
  }

  // Consultar solo trabajadores VMF con estado Activo o De Baja
  const trabajadores = await Trabajador.find({
    cargo: 'VMF',
    estado: { $in: ESTADOS_INCLUIDOS }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('VMF Trabajadores');

  worksheet.columns = [
    { header: 'Nombre',            key: 'nombre',       width: 18 },
    { header: 'Apellidos',         key: 'apellidos',    width: 25 },
    { header: 'Estado',            key: 'estado',       width: 15 },
    { header: 'Cargo / Puesto',    key: 'cargo',        width: 20 },
    { header: 'Agente',            key: 'agente',       width: 12 },
    { header: 'Código Zona',       key: 'codigoZona',   width: 12 },
    { header: 'Zona / Delegación', key: 'zona',         width: 20 },
    { header: 'Nº Comercial',      key: 'codComercial', width: 15 },
    { header: 'Agente Médico',     key: 'agentMedico',  width: 15 },
  ];

  // Cabecera estilizada
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  trabajadores.forEach(t => {
    worksheet.addRow({
      nombre:       t.nombre       || '',
      apellidos:    t.apellidos    || '',
      estado:       t.estado       || '',
      cargo:        t.cargo        || '',
      agente:       t.agente       || '',
      codigoZona:   t.codigoZona   || '',
      zona:         t.zona         || '',
      codComercial: t.codComercial || '',
      agentMedico:  t.agentMedico  || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.font = { name: 'Segoe UI', size: 10 };
      row.alignment = { vertical: 'middle' };
    }
  });

  console.log(`📝 [VMF] Escribiendo Excel en: ${RUTA_ARCHIVO} con ${trabajadores.length} registros...`);
  await workbook.xlsx.writeFile(RUTA_ARCHIVO);
  console.log(`✅ [VMF] Excel escrito correctamente.`);
};
