// backend/services/materialesDocumentService.js
import pdf from 'pdfjs';
import Helvetica from 'pdfjs/font/Helvetica.js';

/**
 * Genera un PDF en memoria (Buffer) para actas de entrega o devolución de materiales.
 * Maquetación optimizada: Firmas arriba con fecha contigua, Cláusulas al pie.
 */
export const generarActaMaterial = async (trabajador, materiales, tipo) => {
  const esEntrega = tipo === 'ENTREGA';

  // 1. Instanciar documento PDF
  const doc = new pdf.Document({
    font: Helvetica,
    padding: 35 
  });

  // --- TÍTULO DEL DOCUMENTO ---
  const tituloDocumento = esEntrega 
    ? 'DOCUMENTO DE ENTREGA DE MATERIAL' 
    : 'DOCUMENTO DE DEVOLUCIÓN DE MATERIAL';
  
  doc.cell({ paddingBottom: 20 }).text(tituloDocumento, { 
    fontSize: 13, 
    bold: true, 
    color: esEntrega ? 0x1e3a8a : 0xb91c1c 
  });

  // --- DATOS DEL TRABAJADOR ---
  doc.cell({ paddingBottom: 4 }).text(`Nombre: ${trabajador.nombre} ${trabajador.apellidos || ''}`, { fontSize: 10.5, bold: true });
  doc.cell({ paddingBottom: 20 }).text(`Cargo: ${trabajador.cargo || 'No registrado'}`, { fontSize: 10.5 });

  // --- TABLA DE MATERIALES ---
  const tituloTabla = esEntrega ? 'DETALLE DEL MATERIAL:' : 'DETALLE DEL MATERIAL DEVUELTO:';
  doc.cell({ paddingBottom: 8 }).text(tituloTabla, { fontSize: 9.5, bold: true, color: 0x475569 });
  
  const tabla = doc.table({
    widths: [250, 250],
    paddingBottom: 20
  });
  
  const filaHeader = tabla.row({ bg: 0xf1f5f9 });
  filaHeader.cell({ padding: 6 }).text('Elemento / Material', { bold: true, fontSize: 9.5 });
  filaHeader.cell({ padding: 6 }).text('Número de Serie', { bold: true, fontSize: 9.5 });

  materiales.forEach(mat => {
    const fila = tabla.row();
    fila.cell({ padding: 6, borderBottom: 0.5, borderColor: 0xe2e8f0 }).text(mat.nombre || 'Material Técnico', { fontSize: 9 });
    fila.cell({ padding: 6, borderBottom: 0.5, borderColor: 0xe2e8f0 }).text(mat.numeroSerie || 'S/N', { fontSize: 9 });
  });

  // Espacio controlado tras la tabla para iniciar el bloque de aceptación
  doc.cell({ paddingTop: 15 });

  // --- SECCIÓN: FECHA Y FIRMA (CONTIGUOS) Y NOMBRE ABAJO ---
  const poblacion = trabajador.poblacion || trabajador.localidad || 'Barcelona';
  const fechaHoy = new Date().toLocaleDateString('es-ES');

  // Tabla invisible de dos columnas para forzar a la población y fecha a quedarse pegada a la derecha del texto
  const tablaAceptacion = doc.table({
    widths: [500], 
    paddingBottom: 45 // Espacio vertical para la firma manuscrita
  });
  
  const filaCierre = tablaAceptacion.row();
  
  // Ahora cabe perfectamente en una sola línea continua
  filaCierre.cell().text(`Fecha y firma entrega y aceptación: ${poblacion.toUpperCase()} a ${fechaHoy}`, { 
    fontSize: 10, 
    bold: true, 
    color: 0x1e3a8a 
  });

  // El nombre del trabajador ("Fdo: ...") aparece JUSTO debajo del hueco dejado por el padding anterior
  doc.cell({ paddingBottom: 50 }).text(`Fdo: ${trabajador.nombre} ${trabajador.apellidos || ''}`, { fontSize: 9.5, color: 0x475569 });


  // --- SECCIÓN: CLÁUSULAS INFORMATIVAS AL FINAL DEL ACTA ---
  const clausulaEntrega = `El material mencionado anteriormente es un instrumento de trabajo de la empresa, para uso exclusivamente profesional. Está prohibido descargar e instalar software no validado previamente por la empresa.\n\nEstá prohibido hacer cualquier tipo de cambios en los equipos informáticos de la Empresa. Se requiere adoptar medidas necesarias para garantizar la integridad y funcionamiento de los equipos.\n\nEn caso de pérdida, robo, avería o rotura, la empresa se reserva el derecho de solicitar el reembolso.\n\nEn caso de terminación de la relación de trabajo, todo el material deberá ser devuelto.`;

  const clausulaDevolucion = `El departamento de logística confirma la recepción de los materiales que se detallan a continuación. Tras la verificación de su estado técnico y componentes, el activo operativo vuelve a quedar bajo custody del almacén central, cerrando el expediente de responsabilidad de cargo del trabajador.`;

  const textoPolitica = esEntrega ? clausulaEntrega : clausulaDevolucion;

  // Añadimos una línea sutil de separación antes de las cláusulas para simular un pie de página limpio
  doc.cell({ borderTop: 0.5, borderColor: 0xe2e8f0, paddingTop: 10 });
  
  doc.text(textoPolitica, { 
    fontSize: 8.5, // Un punto más pequeño para que actúe como letra pequeña legal elegante
    color: 0x64748b, // Gris slate más suave
    alignment: 'justify',
    lineSpacing: 1.2
  });

  // Compilar y retornar el flujo binario
  return await doc.asBuffer();
};