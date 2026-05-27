'use client'
import { useState, useRef } from 'react'
import QRDisplay from './qr-display'

interface Student {
  id:            string
  name:          string
  grade:         string
  section:       string | null
  qr_token:      string
  qr_expires_at: string
}

interface Props {
  students:        Student[]
  institutionName: string
  grades:          string[]
}

export default function CarnetsClient({ students, institutionName, grades }: Props) {
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [sending,       setSending]       = useState(false)
  const [sendResult,    setSendResult]    = useState<string>('')
  const printRef = useRef<HTMLDivElement>(null)

  const filtered = selectedGrade === 'all'
    ? students
    : students.filter(s => s.grade === selectedGrade)

  function handlePrint() {
    const printContent = printRef.current
    if (!printContent) return

    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Carnets QR - ${institutionName}</title>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .grid { display: flex; flex-wrap: wrap; gap: 12px; }
          .carnet { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px;
                    width: 160px; text-align: center; break-inside: avoid; }
          .carnet img { width: 120px; height: 120px; }
          .inst { font-size: 10px; font-weight: 600; color: #1d4ed8; margin-bottom: 4px; }
          .name { font-size: 11px; font-weight: 600; color: #111827; margin-top: 4px; }
          .grade { font-size: 10px; color: #6b7280; }
          .exp { font-size: 9px; color: #9ca3af; margin-top: 2px; }
          @media print { body { padding: 10px; } }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      </head>
      <body>
        <h3 style="margin:0 0 16px;font-size:14px;color:#374151">
          Carnets QR - ${institutionName} 
          ${selectedGrade !== 'all' ? '- ' + selectedGrade : '- Todos los alumnos'}
          (${filtered.length} alumnos)
        </h3>
        <div class="grid">
          ${filtered.map(s => `
            <div class="carnet">
              <div class="inst">${institutionName}</div>
              <div id="qr-${s.id}"></div>
              <div class="name">${s.name}</div>
              <div class="grade">${s.grade}${s.section ? ' - ' + s.section : ''}</div>
              <div class="exp">Vence: ${new Date(s.qr_expires_at).toLocaleDateString('es-PY')}</div>
            </div>
          `).join('')}
        </div>
        <script>
          document.querySelectorAll('[id^="qr-"]').forEach(el => {
            const id = el.id.replace('qr-', '')
            const student = ${JSON.stringify(filtered.map(s => ({ id: s.id, token: s.qr_token })))}
              .find(s => s.id === id)
            if (student) {
              new QRCode(el, { text: student.token, width: 120, height: 120,
                colorDark: '#000000', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M })
            }
          })
          setTimeout(() => window.print(), 1000)
        <\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  async function handleSendWhatsApp() {
    setSending(true)
    setSendResult('')
    try {
      const body: any = {}
      if (selectedGrade !== 'all') {
        // Enviar IDs del grado seleccionado uno por uno
        let sent = 0, failed = 0
        for (const s of filtered) {
          const res = await fetch('/api/qr/send-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: s.id }),
          })
          const d = await res.json()
          sent   += d.sent   ?? 0
          failed += d.failed ?? 0
        }
        setSendResult(`Enviados: ${sent}, Fallidos: ${failed}`)
      } else {
        const res = await fetch('/api/qr/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution_id: 'all' }),
        })
        const d = await res.json()
        setSendResult(`Enviados: ${d.sent}, Fallidos: ${d.failed}`)
      }
    } catch {
      setSendResult('Error al enviar. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Carnets QR</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Imprime o envia por WhatsApp los codigos QR de los alumnos
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <label className="text-sm text-gray-600 font-medium flex-shrink-0">Grado:</label>
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Todos los alumnos ({students.length})</option>
            {grades.map(g => (
              <option key={g} value={g}>
                {g} ({students.filter(s => s.grade === g).length} alumnos)
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Imprimir */}
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2
                       rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2
                   m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5
                   a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Imprimir carnets ({filtered.length})
          </button>

          {/* Enviar WhatsApp */}
          <button onClick={handleSendWhatsApp} disabled={sending}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm
                       px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium
                       disabled:opacity-50">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0
                   01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8
                   9-8s9 3.582 9 8z"/>
            </svg>
            {sending ? 'Enviando...' : 'Enviar por WhatsApp'}
          </button>
        </div>

        {sendResult && (
          <div className="w-full text-sm text-green-700 bg-green-50 border border-green-100
                          rounded-lg px-3 py-2">
            {sendResult}
          </div>
        )}
      </div>

      {/* Info NFC */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800">Soporte NFC disponible</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Si el colegio usa tarjetas NFC, podes asignar el chip a cada alumno desde la
            pantalla de detalle del alumno. El sistema acepta QR y NFC en paralelo.
          </p>
        </div>
      </div>

      {/* Preview de carnets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700">
            Preview — {filtered.length} carnets
          </h2>
          <span className="text-xs text-gray-400">
            Se imprimen 6 por hoja A4
          </span>
        </div>
        <div ref={printRef}
          className="flex flex-wrap gap-3 p-4 bg-white border border-gray-100 rounded-xl
                     max-h-96 overflow-y-auto">
          {filtered.map(s => (
            <QRDisplay
              key={s.id}
              student={s}
              institutionName="Colegio"
              compact
            />
          ))}
        </div>
      </div>
    </div>
  )
}
