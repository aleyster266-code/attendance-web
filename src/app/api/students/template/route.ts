import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  // Crear workbook con datos de ejemplo
  const wb = XLSX.utils.book_new()

  const data = [
    // Fila de encabezados con color (fila 1)
    ['Nombre completo', 'Grado', 'Seccion', 'Nombre del tutor', 'Telefono del tutor'],
    // Filas de ejemplo
    ['Ana Gonzalez',           '1er año', 'A', 'Maria Gonzalez',      '+595981111001'],
    ['Carlos Benitez',         '1er año', 'A', 'Luis Benitez',        '+595981111002'],
    ['Sofia Romero',           '2do año', 'B', 'Ana Romero',          '+595981111003'],
    ['Diego Martinez',         '3er año', 'C', 'Carmen Martinez',     '+595981111004'],
    ['Laura Perez',            '3er año', 'C', 'Jose Perez',          '+595981111005'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 30 }, // Nombre
    { wch: 12 }, // Grado
    { wch: 10 }, // Seccion
    { wch: 25 }, // Tutor
    { wch: 18 }, // Telefono
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')

  // Hoja de instrucciones
  const instrData = [
    ['INSTRUCCIONES PARA COMPLETAR LA PLANILLA'],
    [''],
    ['COLUMNA', 'DESCRIPCION', 'OBLIGATORIO', 'EJEMPLO'],
    ['Nombre completo', 'Nombre y apellido del alumno', 'SI', 'Ana Gonzalez'],
    ['Grado', 'Año o grado escolar', 'SI', '1er año'],
    ['Seccion', 'Division del grado', 'NO', 'A'],
    ['Nombre del tutor', 'Padre, madre o tutor', 'NO', 'Maria Gonzalez'],
    ['Telefono del tutor', 'Con codigo de pais para WhatsApp', 'NO', '+595981111001'],
    [''],
    ['GRADOS DISPONIBLES:'],
    ['1er año', '2do año', '3er año', '4to año', '5to año', '6to año'],
    [''],
    ['IMPORTANTE:'],
    ['- No borrar la fila de encabezados (fila 1 de la hoja Alumnos)'],
    ['- El telefono debe incluir el codigo de pais: +595 para Paraguay'],
    ['- Guardar el archivo como .xlsx antes de subir'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
  wsInstr['!cols'] = [{ wch: 35 }, { wch: 40 }, { wch: 15 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_alumnos.xlsx"',
    },
  })
}
