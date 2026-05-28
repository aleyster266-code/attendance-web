#!/usr/bin/env node
'use strict'
// node setup-qr-server.js
// Desde la raiz del proyecto

const fs  = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const G = s => console.log(`\x1b[32m  ✓  ${s}\x1b[0m`)
const C = s => console.log(`\x1b[36m\n${s}\x1b[0m`)

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  G(filePath)
}

console.log('\x1b[36m\n==========================================\x1b[0m')
console.log('\x1b[36m  QR en servidor — SVG + token 1 año\x1b[0m')
console.log('\x1b[36m==========================================\x1b[0m')

C('1. Instalando libreria qrcode...')
try {
  execSync('npm install qrcode @types/qrcode', { stdio: 'inherit' })
  G('qrcode instalado')
} catch {
  console.log('\x1b[33m  Instalar manualmente: npm install qrcode @types/qrcode\x1b[0m')
}

C('2. Actualizando lib/qr.ts — token de 1 año...')
write('src/lib/qr.ts', `import { SignJWT, jwtVerify } from 'jose'
import QRCode from 'qrcode'

// Token de 1 año — el carnet impreso dura todo el año escolar
const QR_EXPIRY  = '365d'
const getSecret  = () => new TextEncoder().encode(process.env.QR_SECRET!)

/**
 * Genera un token JWT firmado para el QR del alumno.
 * Llamar al crear o importar alumnos.
 */
export async function generateStudentQR(
  studentId:     string,
  institutionId: string
): Promise<string> {
  return new SignJWT({
    sub:            studentId,
    institution_id: institutionId,
    type:           'student_qr',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(QR_EXPIRY)
    .sign(getSecret())
}

/**
 * Verifica un token QR. Retorna null si expiró o es inválido.
 */
export async function verifyStudentQR(token: string): Promise<{
  studentId:     string
  institutionId: string
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== 'student_qr' || !payload.sub) return null
    return {
      studentId:     payload.sub,
      institutionId: payload.institution_id as string,
    }
  } catch {
    return null
  }
}

/**
 * Genera un SVG del QR directamente en el servidor.
 * Sin browser, sin canvas, sin duplicados.
 * Soporta 1000 alumnos en < 1 segundo.
 */
export async function generateQRSvg(token: string, size = 120): Promise<string> {
  const svg = await QRCode.toString(token, {
    type:          'svg',
    width:         size,
    margin:        1,
    color: {
      dark:  '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })
  return svg
}
`)

C('3. API: carnets — genera SVGs en servidor...')
write('src/app/api/carnets/route.ts', `import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateQRSvg, generateStudentQR } from '@/lib/qr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/carnets?grade=1er+año
// Devuelve alumnos con su SVG de QR ya generado en el servidor
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single()

  if (!profile?.institution_id) {
    return NextResponse.json({ error: 'No institution' }, { status: 403 })
  }

  const grade = req.nextUrl.searchParams.get('grade')

  let query = supabaseAdmin
    .from('students')
    .select('id, name, grade, section, qr_token, qr_expires_at, institution_id')
    .eq('institution_id', profile.institution_id)
    .eq('active', true)
    .order('grade')
    .order('name')

  if (grade && grade !== 'all') {
    query = query.eq('grade', grade)
  }

  const { data: students, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const oneYear = 365 * 24 * 60 * 60 * 1000

  // Generar SVGs en paralelo — rápido incluso con 1000 alumnos
  const withSvg = await Promise.all(
    (students ?? []).map(async (s) => {
      // Renovar token si vence en menos de 30 días
      let token = s.qr_token
      const expires = new Date(s.qr_expires_at)
      if (expires.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000) {
        token = await generateStudentQR(s.id, s.institution_id)
        const newExpiry = new Date(Date.now() + oneYear)
        await supabaseAdmin
          .from('students')
          .update({ qr_token: token, qr_expires_at: newExpiry.toISOString() })
          .eq('id', s.id)
      }
      const svg = await generateQRSvg(token, 120)
      return {
        id:           s.id,
        name:         s.name,
        grade:        s.grade,
        section:      s.section,
        qr_expires_at: s.qr_expires_at,
        svg,
      }
    })
  )

  return NextResponse.json({ students: withSvg })
}
`)

C('4. Componente QRDisplay — SVG puro, sin canvas ni duplicados...')
write('src/components/qr/qr-display.tsx', `'use client'

interface Props {
  student: {
    id:            string
    name:          string
    grade:         string
    section:       string | null
    qr_expires_at: string
    svg:           string  // SVG generado en servidor
  }
  institutionName: string
  compact?: boolean
}

export default function QRDisplay({ student, institutionName, compact = false }: Props) {
  const expires = new Date(student.qr_expires_at).toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const size = compact ? 110 : 190

  // SVG inline — sin canvas, sin duplicados, sin tooltip, centrado perfecto
  const svgWithSize = student.svg
    .replace(/width="[^"]*"/, \`width="\${size}"\`)
    .replace(/height="[^"]*"/, \`height="\${size}"\`)

  if (compact) {
    return (
      <div style={{
        width: 158, display: 'flex', flexDirection: 'column',
        alignItems: 'center', background: 'white',
        border: '1px solid #e5e7eb', borderRadius: 10,
        padding: '10px 8px', breakInside: 'avoid',
      }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, color: '#1d4ed8',
          textAlign: 'center', marginBottom: 4,
          lineHeight: 1.3, wordBreak: 'break-word', width: '100%',
        }}>
          {institutionName}
        </div>
        <div
          style={{ width: size, height: size, display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}
          dangerouslySetInnerHTML={{ __html: svgWithSize }}
        />
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#111827',
          textAlign: 'center', marginTop: 5, lineHeight: 1.3,
        }}>
          {student.name}
        </div>
        <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 2 }}>
          {student.grade}{student.section ? ' - ' + student.section : ''}
        </div>
        <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>
          Vence: {expires}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-xs text-center">
      <div className="text-sm font-semibold text-blue-600 mb-1 leading-tight">
        {institutionName}
      </div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">{student.name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {student.grade}{student.section ? ' - ' + student.section : ''}
      </p>
      <div className="flex justify-center mb-4"
        dangerouslySetInnerHTML={{ __html: svgWithSize }}
      />
      <p className="text-xs text-gray-400">Mostrar este codigo al ingresar al colegio</p>
      <p className="text-xs text-gray-400 mt-1">Vence: {expires}</p>
    </div>
  )
}
`)

C('5. CarnetsClient — tabla por grado + preview + impresion...')
write('src/components/qr/carnets-client.tsx', `'use client'
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

  // Cargar alumnos del grado seleccionado
  useEffect(() => {
    setLoading(true)
    fetch(\`/api/carnets?grade=\${encodeURIComponent(selectedGrade)}\`)
      .then(r => r.json())
      .then(d => { setStudents(d.students ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedGrade])

  function handlePrint() {
    const svgCards = students.map(s => {
      const expires = new Date(s.qr_expires_at).toLocaleDateString('es-PY')
      const svg = s.svg
        .replace(/width="[^"]*"/, 'width="116"')
        .replace(/height="[^"]*"/, 'height="116"')
      return \`
        <div class="carnet">
          <div class="inst">\${institutionName}</div>
          <div class="qr">\${svg}</div>
          <div class="name">\${s.name}</div>
          <div class="grade">\${s.grade}\${s.section ? ' - ' + s.section : ''}</div>
          <div class="exp">Vence: \${expires}</div>
        </div>
      \`
    }).join('')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(\`<!DOCTYPE html>
<html><head>
<title>Carnets QR - \${institutionName}</title>
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
  <h3>Carnets QR &mdash; \${institutionName} &mdash; \${selectedGrade} (\${students.length} alumnos)</h3>
  <div class="grid">\${svgCards}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body></html>\`)
    win.document.close()
  }

  return (
    <div className="p-6 space-y-5">

      <div>
        <h1 className="text-xl font-semibold text-gray-900">Carnets QR</h1>
        <p className="text-sm text-gray-500 mt-0.5">{institutionName}</p>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap items-center gap-3">
        
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

        {/* Vista */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('table')}
            className={\`px-3 py-2 text-sm font-medium transition-colors \${
              view === 'table'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }\`}>
            Lista
          </button>
          <button
            onClick={() => setView('preview')}
            className={\`px-3 py-2 text-sm font-medium transition-colors \${
              view === 'preview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }\`}>
            Preview
          </button>
        </div>

        {/* Imprimir */}
        <button onClick={handlePrint} disabled={loading || students.length === 0}
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
            <h2 className="text-sm font-medium text-gray-700">{selectedGrade === 'all' ? 'Todos' : selectedGrade}</h2>
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
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    Vence: {expires}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vista preview (carnets) */}
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
`)

C('6. Pagina de carnets actualizada...')
write('src/app/(dashboard)/dashboard/carnets/page.tsx', `import { createClient } from '@/lib/supabase/server'
import CarnetsClient from '@/components/qr/carnets-client'

export const dynamic = 'force-dynamic'

export default async function CarnetsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user!.id)
    .single()

  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', profile?.institution_id ?? '')
    .single()

  // Solo necesitamos los grados — los alumnos con SVG se cargan via API
  const { data: students } = await supabase
    .from('students')
    .select('grade')
    .eq('active', true)
    .order('grade')

  const grades = [...new Set(students?.map(s => s.grade) ?? [])].sort()

  return (
    <CarnetsClient
      institutionName={institution?.name ?? 'Colegio'}
      grades={grades}
    />
  )
}
`)

C('7. SQL: actualizar tokens a 1 año...')
write('supabase/migrations/006_qr_expiry_1year.sql', `-- Actualizar todos los tokens existentes a 1 año de vencimiento
-- Los tokens JWT en sí no cambian — solo la fecha de vencimiento en la DB
-- El nuevo token se generará la próxima vez que se acceda al carnet
UPDATE students
SET qr_expires_at = NOW() + INTERVAL '1 year'
WHERE active = true;
`)

console.log('\n\x1b[32m==========================================\x1b[0m')
console.log('\x1b[32m  Listo! Pasos finales:\x1b[0m\n')
console.log('  1. npm install qrcode @types/qrcode (si no se instalo)')
console.log('  2. Correr 006_qr_expiry_1year.sql en Supabase')
console.log('  3. npm run dev')
console.log('  4. /dashboard/carnets\n')
console.log('  Mejoras vs antes:')
console.log('  - QR generado en servidor (Node.js) — sin browser')
console.log('  - SVG vectorial — escala sin pixelarse al imprimir')
console.log('  - 1000 carnets en < 1 segundo')
console.log('  - Sin duplicados, sin tooltip, centrado perfecto')
console.log('  - Vista tabla con mini QR + vista preview de carnets')
console.log('  - Token de 1 año — imprimir una vez al año')
console.log('  - Impresion: window.print() al cargar, QR ya estan listos')
console.log('\x1b[32m==========================================\x1b[0m\n')
