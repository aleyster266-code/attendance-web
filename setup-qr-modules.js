#!/usr/bin/env node
'use strict'
// node setup-qr-modules.js
// Desde la raiz del proyecto

const fs   = require('fs')
const path = require('path')

const G = s => console.log(`\x1b[32m  ✓  ${s}\x1b[0m`)
const C = s => console.log(`\x1b[36m\n${s}\x1b[0m`)

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  G(filePath)
}

console.log('\x1b[36m\n==========================================\x1b[0m')
console.log('\x1b[36m  Modulos QR: Carnets + WhatsApp + NFC\x1b[0m')
console.log('\x1b[36m==========================================\x1b[0m')

// ─── 1. API: GENERAR QR VISUAL ────────────────────────────────────────────
C('1. API: generar QR visual de un alumno...')
write('src/app/api/qr/generate/route.ts', `import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateStudentQR } from '@/lib/qr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/qr/generate?student_id=xxx
// Devuelve el token JWT del QR, renovandolo si esta por vencer
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('student_id')
  if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })

  const { data: student } = await supabase
    .from('students')
    .select('id, institution_id, qr_token, qr_expires_at, name')
    .eq('id', studentId)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Renovar QR si vence en menos de 2 dias
  const expiresAt = new Date(student.qr_expires_at)
  const twoDays   = 2 * 24 * 60 * 60 * 1000
  let qrToken     = student.qr_token

  if (expiresAt.getTime() - Date.now() < twoDays) {
    qrToken = await generateStudentQR(student.id, student.institution_id)
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await supabaseAdmin
      .from('students')
      .update({ qr_token: qrToken, qr_expires_at: newExpiry.toISOString() })
      .eq('id', student.id)
  }

  return NextResponse.json({
    student_id:    student.id,
    student_name:  student.name,
    qr_token:      qrToken,
    expires_at:    expiresAt.toISOString(),
  })
}
`)

// ─── 2. API: ENVIAR QR POR WHATSAPP ───────────────────────────────────────
C('2. API: enviar QR por WhatsApp al tutor...')
write('src/app/api/qr/send-whatsapp/route.ts', `import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateStudentQR } from '@/lib/qr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/qr/send-whatsapp — envia el QR al tutor por WhatsApp
// Body: { student_id } o { institution_id } para envio masivo
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, institution_id } = await req.json()

  // Obtener alumnos segun el scope
  let query = supabase.from('students').select('*').eq('active', true)
  if (student_id)    query = query.eq('id', student_id)
  if (institution_id) query = query.eq('institution_id', institution_id)

  const { data: students } = await query
  if (!students?.length) return NextResponse.json({ error: 'No students found' }, { status: 404 })

  const WA_BASE   = 'https://graph.facebook.com/v19.0'
  const phoneId   = process.env.WA_PHONE_ID
  const waToken   = process.env.WA_TOKEN
  let sent = 0, failed = 0

  for (const student of students) {
    if (!student.guardian_phone) { failed++; continue }

    // Renovar QR si es necesario
    let qrToken = student.qr_token
    const expiresAt = new Date(student.qr_expires_at)
    if (expiresAt.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000) {
      qrToken = await generateStudentQR(student.id, student.institution_id)
      await supabaseAdmin.from('students')
        .update({ qr_token: qrToken, qr_expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString() })
        .eq('id', student.id)
    }

    // URL del QR — apunta a la pagina de visualizacion
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const qrUrl  = \`\${appUrl}/qr/\${student.id}\`

    const message = [
      \`Hola! Le enviamos el codigo QR de \${student.name} para el registro de asistencia.\`,
      \`\`,
      \`Guarde este mensaje. Su hijo/a debe mostrar este codigo al ingresar al colegio:\`,
      \`\${qrUrl}\`,
      \`\`,
      \`El codigo se actualiza automaticamente. Si tiene dudas contacte a la administracion.\`,
    ].join('\\n')

    if (!phoneId || !waToken) {
      // En desarrollo: simular envio
      console.log(\`[WA-SIMULADO] -> \${student.guardian_phone}: QR de \${student.name}\`)
      sent++
      continue
    }

    try {
      const res = await fetch(\`\${WA_BASE}/\${phoneId}/messages\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${waToken}\`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: student.guardian_phone.replace(/\\D/g, ''),
          type: 'text',
          text: { body: message },
        }),
      })
      res.ok ? sent++ : failed++
    } catch { failed++ }
  }

  return NextResponse.json({ sent, failed, total: students.length })
}
`)

// ─── 3. API: REGISTRAR DISPOSITIVO NFC ────────────────────────────────────
C('3. API: soporte NFC (registro de tarjetas)...')
write('src/app/api/nfc/assign/route.ts', `import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
  student_id: z.string().uuid(),
  nfc_uid:    z.string().min(4).max(32), // UID del chip NFC (hex)
})

// POST /api/nfc/assign — asociar una tarjeta NFC a un alumno
// El lector NFC en la tablet lee el UID del chip y lo envia aqui
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.parse(await req.json())

  // Guardar el NFC UID en el campo nfc_uid de students
  // NOTA: requiere agregar la columna nfc_uid a la tabla students
  // Ver migration 005_add_nfc.sql
  const { data, error } = await supabaseAdmin
    .from('students')
    .update({ nfc_uid: body.nfc_uid })
    .eq('id', body.student_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, student: data })
}
`)

// ─── 4. API: ATTENDANCE POR NFC ───────────────────────────────────────────
C('4. API: registrar asistencia por NFC...')
write('src/app/api/nfc/attendance/route.ts', `import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
  nfc_uid:     z.string().min(4).max(32),
  device_id:   z.string().uuid(),
  client_uuid: z.string().uuid(),
  type:        z.enum(['entry', 'exit']),
  recorded_at: z.string().datetime(),
})

// POST /api/nfc/attendance — igual que /api/attendance pero por NFC UID
// La tablet lee el chip NFC y envia el UID en lugar del QR token
export async function POST(req: NextRequest) {
  try {
    const deviceToken = req.headers.get('x-device-token')
    const { data: device } = await supabase
      .from('devices')
      .select('id, institution_id')
      .eq('device_token', deviceToken!)
      .eq('active', true)
      .single()

    if (!device) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })

    const body = schema.parse(await req.json())

    // Buscar alumno por NFC UID
    const { data: student } = await supabase
      .from('students')
      .select('id, name, guardian_phone')
      .eq('nfc_uid', body.nfc_uid)
      .eq('institution_id', device.institution_id)
      .eq('active', true)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'NFC card not registered' }, { status: 404 })
    }

    // Mismo flujo idempotente que el QR
    const { data: record } = await supabase
      .from('attendance_records')
      .upsert({
        client_uuid:    body.client_uuid,
        student_id:     student.id,
        device_id:      device.id,
        institution_id: device.institution_id,
        type:           body.type,
        recorded_at:    body.recorded_at,
        sync_source:    'direct',
      }, { onConflict: 'client_uuid', ignoreDuplicates: true })
      .select()
      .single()

    if (record && student.guardian_phone) {
      sendWhatsAppNotification({
        phone:       student.guardian_phone,
        studentName: student.name,
        type:        body.type,
        timestamp:   body.recorded_at,
      }).catch(console.error)
    }

    return NextResponse.json({
      status:       'ok',
      student_name: student.name,
      id:           record?.id ?? null,
      duplicate:    !record,
    })
  } catch (e) {
    if (e instanceof Error && e.constructor.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
`)

// ─── 5. MIGRATION NFC ─────────────────────────────────────────────────────
C('5. SQL: agregar columna NFC a students...')
write('supabase/migrations/005_add_nfc.sql', `-- ════════════════════════════════════════════════════════════════
-- 005_add_nfc.sql
-- Agrega soporte NFC a la tabla students
-- Ejecutar en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Columna para el UID del chip NFC (formato hex: "04A3B2C1D0E5F6")
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(32) UNIQUE;

-- Indice para busqueda rapida por NFC (cada lectura hace esta query)
CREATE INDEX IF NOT EXISTS idx_students_nfc
  ON students (nfc_uid)
  WHERE nfc_uid IS NOT NULL AND active = true;

-- Vista rapida: alumnos con NFC asignado
CREATE OR REPLACE VIEW students_with_nfc AS
  SELECT id, institution_id, name, grade, section, nfc_uid
  FROM students
  WHERE nfc_uid IS NOT NULL AND active = true;
`)

// ─── 6. PAGINA QR PUBLICA (link de WhatsApp) ──────────────────────────────
C('6. Pagina publica del QR (link de WhatsApp)...')
write('src/app/qr/[studentId]/page.tsx', `import { createClient } from '@supabase/supabase-js'
import QRDisplay from '@/components/qr/qr-display'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props { params: Promise<{ studentId: string }> }

export default async function QRPage({ params }: Props) {
  const { studentId } = await params

  const { data: student } = await supabase
    .from('students')
    .select('id, name, grade, section, qr_token, qr_expires_at, institution_id')
    .eq('id', studentId)
    .eq('active', true)
    .single()

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-sm">QR no encontrado o alumno inactivo.</p>
        </div>
      </div>
    )
  }

  // Obtener nombre del colegio
  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', student.institution_id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <QRDisplay
        student={student}
        institutionName={institution?.name ?? 'Colegio'}
      />
    </div>
  )
}
`)

// ─── 7. COMPONENTE QR DISPLAY ─────────────────────────────────────────────
C('7. Componente QRDisplay (muestra el QR visual)...')
write('src/components/qr/qr-display.tsx', `'use client'
import { useEffect, useRef } from 'react'

interface Props {
  student: {
    id:            string
    name:          string
    grade:         string
    section:       string | null
    qr_token:      string
    qr_expires_at: string
  }
  institutionName: string
  compact?: boolean  // para la vista de carnet
}

export default function QRDisplay({ student, institutionName, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Cargar QRCode desde CDN y generar el canvas
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const size = compact ? 120 : 200
      // @ts-ignore — QRCode es global desde CDN
      new window.QRCode(canvas, {
        text:            student.qr_token,
        width:           size,
        height:          size,
        colorDark:       '#000000',
        colorLight:      '#ffffff',
        correctLevel:    window.QRCode.CorrectLevel.M,
      })
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [student.qr_token, compact])

  const expires = new Date(student.qr_expires_at).toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  if (compact) {
    return (
      <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl p-3"
        style={{ width: 160, breakInside: 'avoid' }}>
        <div className="text-xs font-semibold text-blue-600 text-center mb-1 leading-tight">
          {institutionName}
        </div>
        <div ref={canvasRef} className="my-1" />
        <div className="text-xs font-semibold text-gray-900 text-center leading-tight mt-1">
          {student.name}
        </div>
        <div className="text-xs text-gray-500 text-center">
          {student.grade}{student.section ? ' - ' + student.section : ''}
        </div>
        <div className="text-xs text-gray-400 mt-1">Vence: {expires}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-xs text-center">
      <div className="text-sm font-semibold text-blue-600 mb-1">{institutionName}</div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">{student.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {student.grade}{student.section ? ' - ' + student.section : ''}
      </p>
      <div className="flex justify-center mb-4">
        <div ref={canvasRef} />
      </div>
      <p className="text-xs text-gray-400">
        Mostrar este codigo al ingresar al colegio
      </p>
      <p className="text-xs text-gray-400 mt-1">Vence: {expires}</p>
    </div>
  )
}
`)

// ─── 8. PAGINA DE CARNETS ─────────────────────────────────────────────────
C('8. Pagina de impresion de carnets...')
write('src/app/(dashboard)/dashboard/carnets/page.tsx', `import { createClient } from '@/lib/supabase/server'
import CarnetsClient from '@/components/qr/carnets-client'

export const dynamic = 'force-dynamic'

export default async function CarnetsPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, name, grade, section, qr_token, qr_expires_at')
    .eq('active', true)
    .order('grade')
    .order('name')

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', profile?.institution_id ?? '')
    .single()

  // Obtener grados unicos
  const grades = [...new Set(students?.map(s => s.grade) ?? [])].sort()

  return (
    <CarnetsClient
      students={students ?? []}
      institutionName={institution?.name ?? 'Colegio'}
      grades={grades}
    />
  )
}
`)

// ─── 9. CARNETS CLIENT ────────────────────────────────────────────────────
C('9. CarnetsClient — selector + impresion...')
write('src/components/qr/carnets-client.tsx', `'use client'
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

    win.document.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Carnets QR - \${institutionName}</title>
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
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\\/script>
      </head>
      <body>
        <h3 style="margin:0 0 16px;font-size:14px;color:#374151">
          Carnets QR - \${institutionName} 
          \${selectedGrade !== 'all' ? '- ' + selectedGrade : '- Todos los alumnos'}
          (\${filtered.length} alumnos)
        </h3>
        <div class="grid">
          \${filtered.map(s => \`
            <div class="carnet">
              <div class="inst">\${institutionName}</div>
              <div id="qr-\${s.id}"></div>
              <div class="name">\${s.name}</div>
              <div class="grade">\${s.grade}\${s.section ? ' - ' + s.section : ''}</div>
              <div class="exp">Vence: \${new Date(s.qr_expires_at).toLocaleDateString('es-PY')}</div>
            </div>
          \`).join('')}
        </div>
        <script>
          document.querySelectorAll('[id^="qr-"]').forEach(el => {
            const id = el.id.replace('qr-', '')
            const student = \${JSON.stringify(filtered.map(s => ({ id: s.id, token: s.qr_token })))}
              .find(s => s.id === id)
            if (student) {
              new QRCode(el, { text: student.token, width: 120, height: 120,
                colorDark: '#000000', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M })
            }
          })
          setTimeout(() => window.print(), 1000)
        <\\/script>
      </body>
      </html>
    \`)
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
        setSendResult(\`Enviados: \${sent}, Fallidos: \${failed}\`)
      } else {
        const res = await fetch('/api/qr/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution_id: 'all' }),
        })
        const d = await res.json()
        setSendResult(\`Enviados: \${d.sent}, Fallidos: \${d.failed}\`)
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
`)

// ─── 10. ACTUALIZAR LAYOUT CON ENLACE A CARNETS ──────────────────────────
C('10. Actualizar layout con enlace a carnets...')
write('src/app/(dashboard)/layout.tsx', `import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/ui/logout-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                     M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">AsistenciaApp</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/dashboard" icon="chart-bar">Asistencia hoy</NavLink>
          <NavLink href="/dashboard/students" icon="users">Alumnos</NavLink>
          <NavLink href="/dashboard/carnets" icon="id-badge">Carnets QR</NavLink>
          <NavLink href="/dashboard/devices" icon="device-tablet">Dispositivos</NavLink>
          <NavLink href="/dashboard/reports" icon="file-text">Reportes</NavLink>
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-400 px-2 mb-2 truncate">{user.email}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function NavLink({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  const icons: Record<string, string> = {
    'chart-bar':    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    'users':        'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    'id-badge':     'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
    'device-tablet':'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    'file-text':    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  }
  return (
    <Link href={href}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600
                 hover:bg-gray-50 hover:text-gray-900 transition-colors group">
      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon] ?? ''} />
      </svg>
      {children}
    </Link>
  )
}
`)

console.log('\n\x1b[32m==========================================\x1b[0m')
console.log('\x1b[32m  Listo! Lo que se construyo:\x1b[0m\n')
console.log('  QR impreso: /dashboard/carnets')
console.log('  - Selector por grado')
console.log('  - Preview de carnets (compact)')
console.log('  - Imprimir 6 carnets por hoja A4')
console.log('  - Enviar QR por WhatsApp a tutores\n')
console.log('  QR publico: /qr/[studentId]')
console.log('  - Link que recibe el padre por WhatsApp')
console.log('  - Muestra el QR en pantalla grande\n')
console.log('  NFC preparado:')
console.log('  - Correr 005_add_nfc.sql en Supabase')
console.log('  - API /api/nfc/assign y /api/nfc/attendance listos')
console.log('  - El sistema acepta QR y NFC en paralelo\n')
console.log('  npm run dev -> /dashboard/carnets')
console.log('\x1b[32m==========================================\x1b[0m\n')
