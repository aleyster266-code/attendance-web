'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface ParsedStudent {
  name:           string
  grade:          string
  section:        string
  guardian_name:  string
  guardian_phone: string
  _error?:        string
}

interface Props { onClose: () => void }
type Step = 'upload' | 'preview' | 'done'

export default function ImportStudents({ onClose }: Props) {
  const router      = useRouter()
  const fileRef     = useRef<HTMLInputElement>(null)
  const [step,      setStep]     = useState<Step>('upload')
  const [students,  setStudents] = useState<ParsedStudent[]>([])
  const [loading,   setLoading]  = useState(false)
  const [result,    setResult]   = useState<{ inserted: number; errors: string[] } | null>(null)
  const [fileError, setFileError] = useState('')

  // ── Parsear Excel (.xlsx) ──────────────────────────────────────────────
  function parseExcel(buffer: ArrayBuffer): ParsedStudent[] {
    const wb   = XLSX.read(buffer, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: '' })

    // Detectar fila de encabezado (buscar la fila que tiene "nombre" o "name")
    let startRow = 0
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i] as any[]
      const first = String(row[0] ?? '').toLowerCase()
      if (first.includes('nombre') || first.includes('name')) {
        startRow = i + 1
        break
      }
    }

    return (rows.slice(startRow) as any[][])
      .filter(row => row.some(cell => String(cell).trim() !== ''))
      .map((row, idx) => {
        const name  = String(row[0] ?? '').trim()
        const grade = String(row[1] ?? '').trim()
        if (!name || !grade) {
          return {
            name, grade,
            section: '', guardian_name: '', guardian_phone: '',
            _error: `Fila ${idx + startRow + 2}: nombre y grado son obligatorios`,
          }
        }
        return {
          name,
          grade,
          section:        String(row[2] ?? '').trim(),
          guardian_name:  String(row[3] ?? '').trim(),
          guardian_phone: String(row[4] ?? '').trim(),
        }
      })
  }

  // ── Parsear CSV con soporte para tildes y ñ ────────────────────────────
  function parseCSV(text: string): ParsedStudent[] {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes('nombre') || firstLine.includes('grado')
    const dataLines = hasHeader ? lines.slice(1) : lines
    return dataLines.map((line, idx) => {
      const cols  = line.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)
        ?.map(v => v.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? []
      const name  = cols[0] ?? ''
      const grade = cols[1] ?? ''
      if (!name || !grade) {
        return { name, grade, section: '', guardian_name: '', guardian_phone: '',
          _error: `Fila ${idx + 2}: nombre y grado son obligatorios` }
      }
      return {
        name, grade,
        section:        cols[2] ?? '',
        guardian_name:  cols[3] ?? '',
        guardian_phone: cols[4] ?? '',
      }
    })
  }

  // ── Leer archivo ──────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setFileError('Solo se aceptan archivos .xlsx o .csv')
      return
    }

    const reader = new FileReader()

    if (ext === 'csv') {
      reader.onload = ev => {
        const text   = ev.target?.result as string
        const parsed = parseCSV(text)
        if (parsed.length === 0) { setFileError('Archivo vacio o formato incorrecto'); return }
        setStudents(parsed)
        setStep('preview')
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.onload = ev => {
        const parsed = parseExcel(ev.target?.result as ArrayBuffer)
        if (parsed.length === 0) { setFileError('Archivo vacio o formato incorrecto'); return }
        setStudents(parsed)
        setStep('preview')
      }
      reader.readAsArrayBuffer(file)
    }
  }

  async function handleImport() {
    setLoading(true)
    const valid = students.filter(s => !s._error)
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: valid }),
      })
      const data = await res.json()
      setResult(data)
      setStep('done')
    } catch { setFileError('Error de conexion. Intenta de nuevo.') }
    finally  { setLoading(false) }
  }

  const validCount   = students.filter(s => !s._error).length
  const invalidCount = students.filter(s =>  s._error).length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Importar alumnos</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload'  && 'Sube un archivo Excel o CSV'}
              {step === 'preview' && `${validCount} alumnos listos${invalidCount > 0 ? `, ${invalidCount} con errores` : ''}`}
              {step === 'done'    && 'Importacion completada'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {step === 'upload' && (
            <div className="space-y-4">
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center
                           cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">Clic para seleccionar archivo</p>
                <p className="text-xs text-gray-400 mt-1">Excel (.xlsx) o CSV — hasta 2000 alumnos</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                  className="hidden" onChange={handleFile} />
              </div>

              {fileError && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                  {fileError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <a href="/api/students/template" download
                  className="flex items-center justify-center gap-2 border border-blue-200 bg-blue-50
                             rounded-lg py-3 text-sm text-blue-700 hover:bg-blue-100 transition-colors font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Descargar plantilla Excel
                </a>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-600">Columnas requeridas:</p>
                  <p>nombre, grado, seccion</p>
                  <p>nombre_tutor, telefono_tutor</p>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-semibold text-gray-900">{students.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total filas</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-semibold text-green-600">{validCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Listos para importar</div>
                </div>
                <div className={`${invalidCount > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
                  <div className={`text-xl font-semibold ${invalidCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {invalidCount}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Con errores</div>
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  {['Nombre','Grado','Seccion','Tutor'].map(h => (
                    <div key={h} className="text-xs font-medium text-gray-500">{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {students.map((s, i) => (
                    <div key={i} className={`grid grid-cols-4 px-4 py-2.5 ${s._error ? 'bg-red-50' : 'hover:bg-gray-50/50'}`}>
                      <div className="text-sm text-gray-900 truncate pr-2">
                        {s._error ? <span className="text-red-500 text-xs">{s._error}</span> : s.name}
                      </div>
                      <div className="text-xs text-gray-500">{s.grade}</div>
                      <div className="text-xs text-gray-500">{s.section || '-'}</div>
                      <div className="text-xs text-gray-500 truncate">{s.guardian_name || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{result.inserted} alumnos importados</p>
                <p className="text-sm text-gray-500 mt-1">QR generado automaticamente para cada uno.</p>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 text-left">
                  <p className="text-sm font-medium text-red-700 mb-2">Errores:</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
          {step === 'upload' && (
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
                Volver
              </button>
              <button onClick={handleImport} disabled={loading || validCount === 0}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? `Importando...` : `Importar ${validCount} alumnos`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={() => { router.refresh(); onClose() }}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">
              Ver alumnos
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
