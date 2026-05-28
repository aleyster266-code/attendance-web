'use client'
import { useState, useEffect } from 'react'
import QRDisplay from './qr-display'

interface Student {
  id:            string
  name:          string
  grade:         string
  section:       string | null
  qr_expires_at: string
  svg:           string
}

interface Props {
  institutionName: string
  grades:          string[]
}

export default function CarnetsClient({ institutionName, grades }: Props) {
  const [selectedGrade, setSelectedGrade] = useState<string>(grades[0] ?? 'all')
  const [students,      setStudents]      = useState<Student[]>([])
  const [loading,       setLoading]       = useState(false)
  const [view,          setView]          = useState<'table' | 'preview'>('table')
  const [sending,       setSending]       = useState(false)
  const [sendResult,    setSendResult]    = useState('')

  useEffect(() => {
    setLoading(true)
    setSendResult('')
    fetch(`/api/carnets?grade=${encodeURIComponent(selectedGrade)}`)
      .then(r => r.json())
      .then(d => { setStudents(d.students ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedGrade])

  // ── Imprimir todos los del grado seleccionado ──────────────────────────
  function handlePrint() {
    const svgCards = students.map(s => {
      const expires = new Date(s.qr_expires_at).toLocaleDateString('es-PY')
      const svg = s.svg
        .replace(/width="[^"]*"/, 'width="116"')
        .replace(/height="[^"]*"/, 'height="116"')
      return `
        <div class="carnet">
          <div class="inst">${institutionName}</div>
          <div class="qr">${svg}</div>
          <div class="name">${s.name}</div>
          <div class="grade">${s.grade}${s.section ? ' - ' + s.section : ''}</div>
          <div class="exp">Vence: ${expires}</div>
        </div>`
    }).join('')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
<title>Carnets QR - ${institutionName}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; font-family: Arial, sans-serif; }
  h3 { margin: 0 0 14px; font-size: 13px; color: #374151; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .carnet {
    border: 1px solid #d1d5db; border-radius: 10px;
    padding: 10px 8px; width: 158px;
    display: flex; flex-direction: column; align-items: center;
    break-inside: avoid; text-align: center;
  }
  .inst { font-size: 8.5px; font-weight: 700; color: #1d4ed8;
          margin-bottom: 4px; line-height: 1.3; word-break: break-word; width: 100%; }
  .qr { width: 116px; height: 116px; display: flex;
        align-items: center; justify-content: center; }
  .qr svg { display: block; }
  .name { font-size: 10px; font-weight: 700; color: #111827;
          margin-top: 5px; line-height: 1.3; }
  .grade { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .exp { font-size: 8px; color: #9ca3af; margin-top: 2px; }
  @media print { body { padding: 8px; } }
</style>
</head><body>
  <h3>Carnets QR &mdash; ${institutionName} &mdash; ${selectedGrade === 'all' ? 'Todos los alumnos' : selectedGrade} (${students.length} alumnos)</h3>
  <div class="grid">${svgCards}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body></html>`)
    win.document.close()
  }

  // ── Imprimir un solo alumno ────────────────────────────────────────────
  function handlePrintOne(s: Student) {
    const expires = new Date(s.qr_expires_at).toLocaleDateString('es-PY')
    const svg = s.svg
      .replace(/width="[^"]*"/, 'width="116"')
      .replace(/height="[^"]*"/, 'height="116"')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
<title>Carnet - ${s.name}</title>
<style>
  body { margin: 20px; font-family: Arial, sans-serif; }
  .carnet { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 8px;
            width: 158px; display: flex; flex-direction: column;
            align-items: center; text-align: center; }
  .inst { font-size: 8.5px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px;
          line-height: 1.3; word-break: break-word; width: 100%; }
  .qr { width: 116px; height: 116px; display: flex;
        align-items: center; justify-content: center; }
  .qr svg { display: block; }
  .name { font-size: 10px; font-weight: 700; color: #111827; margin-top: 5px; }
  .grade { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .exp { font-size: 8px; color: #9ca3af; margin-top: 2px; }
</style>
</head><body>
  <div class="carnet">
    <div class="inst">${institutionName}</div>
    <div class="qr">${svg}</div>
    <div class="name">${s.name}</div>
    <div class="grade">${s.grade}${s.section ? ' - ' + s.section : ''}</div>
    <div class="exp">Vence: ${expires}</div>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body></html>`)
    win.document.close()
  }

  // ── Enviar WA a un alumno ──────────────────────────────────────────────
  async function handleSendOne(studentId: string) {
    const res = await fetch('/api/qr/send-whatsapp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ student_id: studentId }),
    })
    const d = await res.json()
    if (d.sent > 0) {
      setSendResult('QR enviado por WhatsApp correctamente.')
    } else {
      setSendResult('No se pudo enviar. Verificar que el alumno tenga telefono cargado.')
    }
    setTimeout(() => setSendResult(''), 4000)
  }

  // ── Enviar WA a todos los del grado ────────────────────────────────────
  async function handleSendAll() {
    const target = selectedGrade === 'all' ? 'todos los alumnos' : selectedGrade
    if (!confirm(`Enviar QR por WhatsApp a los padres de ${target}? (${students.length} mensajes)`)) return
    setSending(true)
    setSendResult('')
    let sent = 0, failed = 0
    try {
      for (const s of students) {
        const res = await fetch('/api/qr/send-whatsapp', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ student_id: s.id }),
        })
        const d = await res.json()
        sent   += d.sent   ?? 0
        failed += d.failed ?? 0
      }
      setSendResult(`Enviados: ${sent} · Fallidos: ${failed}`)
    } catch {
      setSendResult('Error al enviar. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Carnets QR</h1>
        <p className="text-sm text-gray-500 mt-0.5">{institutionName}</p>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">

          {/* Selector de grado */}
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <label className="text-sm text-gray-600 font-medium flex-shrink-0">Grado:</label>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Todos los alumnos</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Toggle vista */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                view === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}>
              Lista
            </button>
            <button
              onClick={() => setView('preview')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                view === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}>
              Preview
            </button>
          </div>

          {/* Imprimir todos */}
          <button
            onClick={handlePrint}
            disabled={loading || students.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2
                       rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2
                   m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5
                   a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Imprimir ({students.length})
          </button>

          {/* Enviar WA a todos */}
          <button
            onClick={handleSendAll}
            disabled={loading || sending || students.length === 0}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm
                       px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8
                   a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042
                   3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {sending ? 'Enviando...' : 'Enviar WA a todos'}
          </button>
        </div>

        {/* Resultado de envio */}
        {sendResult && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100
                          rounded-lg px-3 py-2">
            {sendResult}
          </div>
        )}
      </div>

      {/* NFC info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800">Soporte NFC disponible</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Si el colegio usa tarjetas NFC, el sistema acepta QR y NFC en paralelo.
            Asignar el chip desde el detalle del alumno.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <div className="text-sm text-gray-400">Generando QR en el servidor...</div>
        </div>
      )}

      {/* Vista tabla */}
      {!loading && view === 'table' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">
              {selectedGrade === 'all' ? 'Todos los alumnos' : selectedGrade}
            </h2>
            <span className="text-xs text-gray-400">{students.length} alumnos</span>
          </div>
          <div className="divide-y divide-gray-50">
            {students.map(s => {
              const expires = new Date(s.qr_expires_at).toLocaleDateString('es-PY')
              const miniSvg = s.svg
                .replace(/width="[^"]*"/, 'width="40"')
                .replace(/height="[^"]*"/, 'height="40"')
              return (
                <div key={s.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">

                  {/* Mini QR */}
                  <div className="flex-shrink-0"
                    dangerouslySetInnerHTML={{ __html: miniSvg }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400">
                      {s.grade}{s.section ? ' - ' + s.section : ''}
                    </div>
                  </div>

                  {/* Vencimiento */}
                  <div className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                    Vence: {expires}
                  </div>

                  {/* Acciones por alumno */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Imprimir carnet individual */}
                    <button
                      onClick={() => handlePrintOne(s)}
                      title="Imprimir carnet"
                      className="w-8 h-8 flex items-center justify-center rounded-lg
                                 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2
                             m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5
                             a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                      </svg>
                    </button>

                    {/* Enviar WA individual */}
                    <button
                      onClick={() => handleSendOne(s.id)}
                      title="Enviar QR por WhatsApp"
                      className="w-8 h-8 flex items-center justify-center rounded-lg
                                 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8
                             a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042
                             3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vista preview */}
      {!loading && view === 'preview' && (
        <div className="flex flex-wrap gap-3 p-4 bg-white border border-gray-100 rounded-xl">
          {students.map(s => (
            <QRDisplay
              key={s.id}
              student={s}
              institutionName={institutionName}
              compact
            />
          ))}
        </div>
      )}

    </div>
  )
}