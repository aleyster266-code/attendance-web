#!/usr/bin/env node
'use strict'

/**
 * setup-mvp.js — Sistema de Asistencia Escolar (Paraguay)
 * ─────────────────────────────────────────────────────────
 * USO:
 *   1. Crear proyecto Next.js:
 *      npx create-next-app@latest attendance-web --typescript --tailwind --app --src-dir --eslint
 *
 *   2. Entrar al proyecto:
 *      cd attendance-web
 *
 *   3. Correr este script (desde dentro del proyecto):
 *      node setup-mvp.js
 */

const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const c    = (code, msg) => console.log(`\x1b[${code}m${msg}\x1b[0m`)
const log  = msg => c(36,  `\n${msg}`)
const ok   = msg => c(32,  `  ✓  ${msg}`)
const warn = msg => c(33,  `  ⚠  ${msg}`)
const skip = msg => c(90,  `  –  ${msg} (ya existe, saltando)`)
const die  = msg => { c(31, `\n  ✗  ${msg}\n`); process.exit(1) }

if (!fs.existsSync('package.json')) {
  die('Ejecutá este script desde la raíz del proyecto Next.js.\n' +
      '     Primero corré:\n' +
      '     npx create-next-app@latest attendance-web --typescript --tailwind --app --src-dir --eslint\n' +
      '     cd attendance-web\n' +
      '     node ../setup-mvp.js')
}

c(36, '\n══════════════════════════════════════════════════════')
c(36,   '  MVP — Sistema de Asistencia Escolar (Paraguay)')
c(36,   '══════════════════════════════════════════════════════')

// ─────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────

function write(filePath, lines) {
  if (fs.existsSync(filePath)) { skip(filePath); return }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, Array.isArray(lines) ? lines.join('\n') : lines, 'utf8')
  ok(filePath)
}

// ─────────────────────────────────────────────────────────────────
// 1. Estructura de carpetas
// ─────────────────────────────────────────────────────────────────

log('📁 Creando estructura de carpetas...')

const DIRS = [
  'src/app/(auth)/login',
  'src/app/(dashboard)/dashboard',
  'src/app/(dashboard)/students',
  'src/app/api/attendance',
  'src/app/api/sync/batch',
  'src/app/api/students',
  'src/app/api/qr/generate',
  'src/components/dashboard',
  'src/components/students',
  'src/components/ui',
  'src/lib/supabase',
  'src/types',
  'supabase/migrations',
]

DIRS.forEach(d => {
  fs.mkdirSync(d, { recursive: true })
  ok(d)
})

// ─────────────────────────────────────────────────────────────────
// 2. Archivos de configuración
// ─────────────────────────────────────────────────────────────────

log('⚙️  Creando archivos de configuración...')

write('.env.local', [
  '# ── Supabase ──────────────────────────────────────────────────────',
  '# Encontrás estos valores en: supabase.com → tu proyecto → Settings → API',
  'NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY',
  '',
  '# ── WhatsApp Business Cloud API ───────────────────────────────────',
  '# Encontrás estos en: developers.facebook.com → tu app → WhatsApp → API Setup',
  'WA_PHONE_ID=TU_PHONE_ID',
  'WA_TOKEN=TU_TOKEN',
  '',
  '# ── QR Signing ────────────────────────────────────────────────────',
  '# Generá una clave con este comando en la terminal:',
  "# node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  'QR_SECRET=PEGA_AQUI_TU_CLAVE_GENERADA',
  '',
  '# ── App ───────────────────────────────────────────────────────────',
  'NEXT_PUBLIC_APP_URL=http://localhost:3000',
])

write('CLAUDE.md', [
  '# Contexto del Proyecto — MVP Asistencia Escolar',
  '',
  '## Qué es este proyecto',
  'Sistema de registro de asistencia escolar con notificaciones en tiempo real a padres',
  'vía WhatsApp. Desarrollado para el mercado paraguayo.',
  '',
  '## Stack',
  '- Next.js 14 (App Router, TypeScript, Tailwind CSS)',
  '- Supabase (PostgreSQL + Auth + Realtime)',
  '- WhatsApp Business Cloud API para notificaciones',
  '- Tokens JWT firmados con `jose` para los QR codes',
  '',
  '## Estructura de carpetas',
  '```',
  'src/',
  '  app/',
  '    (auth)/login/          → Login page',
  '    (dashboard)/           → Rutas protegidas',
  '    api/attendance/        → POST: registrar asistencia',
  '    api/sync/batch/        → POST: sync offline en batch',
  '    api/students/          → CRUD de alumnos',
  '    api/qr/generate/       → POST: generar QR de alumno',
  '  lib/',
  '    supabase/server.ts     → Cliente Supabase para Server Components',
  '    supabase/client.ts     → Cliente Supabase para Browser',
  '    whatsapp.ts            → Notificaciones WhatsApp',
  '    qr.ts                  → Generación y verificación de QR',
  '  components/',
  '    dashboard/             → Componentes del panel de asistencia',
  '    students/              → Componentes de gestión de alumnos',
  'supabase/migrations/       → Schema SQL (correr en Supabase SQL Editor)',
  '```',
  '',
  '## Reglas críticas del código',
  '- Los API Routes para tablets usan `SUPABASE_SERVICE_ROLE_KEY` (bypasea RLS)',
  '- Los Server Components usan `src/lib/supabase/server.ts`',
  '- `client_uuid` siempre lo genera el dispositivo (garantiza idempotencia offline)',
  '- Notificaciones WA son fire-and-forget: `.catch(console.error)` — no bloquean la respuesta',
  '- Cada tabla tiene `institution_id` para multi-tenant via Row Level Security',
  '',
  '## Estado del proyecto',
  '- [ ] Setup inicial completado',
  '- [ ] Keys de Supabase configuradas en .env.local',
  '- [ ] Migraciones SQL corridas en Supabase',
  '- [ ] Primera ruta de API probada con Bruno/Postman',
  '- [ ] Tablet de prueba configurada',
])

// ─────────────────────────────────────────────────────────────────
// 3. Supabase clients
// ─────────────────────────────────────────────────────────────────

log('🔌 Creando clientes de Supabase...')

write('src/lib/supabase/server.ts', [
  "import { createServerClient } from '@supabase/ssr'",
  "import { cookies } from 'next/headers'",
  '',
  '// Cliente para Server Components y Route Handlers.',
  '// Lee y escribe cookies de sesión del usuario autenticado.',
  'export async function createClient() {',
  '  const cookieStore = await cookies()',
  '  return createServerClient(',
  '    process.env.NEXT_PUBLIC_SUPABASE_URL!,',
  '    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,',
  '    {',
  '      cookies: {',
  '        getAll:  () => cookieStore.getAll(),',
  '        setAll: (cs) => {',
  '          try {',
  '            cs.forEach(({ name, value, options }) =>',
  '              cookieStore.set(name, value, options)',
  '            )',
  '          } catch {',
  '            // En Server Components read-only no se pueden setear cookies.',
  '            // El middleware se encarga de refrescar la sesión.',
  '          }',
  '        },',
  '      },',
  '    }',
  '  )',
  '}',
])

write('src/lib/supabase/client.ts', [
  "import { createBrowserClient } from '@supabase/ssr'",
  '',
  '// Cliente para componentes del lado del cliente (browser).',
  '// Usarlo en Client Components con "use client".',
  'export function createClient() {',
  '  return createBrowserClient(',
  '    process.env.NEXT_PUBLIC_SUPABASE_URL!,',
  '    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!',
  '  )',
  '}',
])

// ─────────────────────────────────────────────────────────────────
// 4. Middleware de autenticación
// ─────────────────────────────────────────────────────────────────

log('🔒 Creando middleware de autenticación...')

write('src/middleware.ts', [
  "import { createServerClient } from '@supabase/ssr'",
  "import { NextResponse, type NextRequest } from 'next/server'",
  '',
  '// Corre antes de CADA request. Protege rutas bajo /dashboard.',
  'export async function middleware(request: NextRequest) {',
  '  let response = NextResponse.next({ request })',
  '',
  '  const supabase = createServerClient(',
  '    process.env.NEXT_PUBLIC_SUPABASE_URL!,',
  '    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,',
  '    {',
  '      cookies: {',
  '        getAll: () => request.cookies.getAll(),',
  '        setAll: (cookies) => {',
  '          cookies.forEach(({ name, value }) => request.cookies.set(name, value))',
  '          response = NextResponse.next({ request })',
  '          cookies.forEach(({ name, value, options }) =>',
  '            response.cookies.set(name, value, options)',
  '          )',
  '        },',
  '      },',
  '    }',
  '  )',
  '',
  '  // Refrescar sesión si expiró (maneja refresh token automático)',
  '  const { data: { user } } = await supabase.auth.getUser()',
  '',
  "  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {",
  "    return NextResponse.redirect(new URL('/login', request.url))",
  '  }',
  "  if (user && request.nextUrl.pathname === '/login') {",
  "    return NextResponse.redirect(new URL('/dashboard', request.url))",
  '  }',
  '',
  '  return response',
  '}',
  '',
  'export const config = {',
  "  matcher: ['/dashboard/:path*', '/login'],",
  '}',
])

// ─────────────────────────────────────────────────────────────────
// 5. Servicios: WhatsApp y QR
// ─────────────────────────────────────────────────────────────────

log('📱 Creando servicio de WhatsApp...')

write('src/lib/whatsapp.ts', [
  "const WA_BASE = 'https://graph.facebook.com/v19.0'",
  '',
  'interface NotifPayload {',
  '  phone:       string',
  '  studentName: string',
  "  type:        'entry' | 'exit'",
  '  timestamp:   string',
  '}',
  '',
  'export async function sendWhatsAppNotification(p: NotifPayload): Promise<void> {',
  '  const phoneId = process.env.WA_PHONE_ID',
  '  const token   = process.env.WA_TOKEN',
  '',
  '  if (!phoneId || !token) {',
  "    console.warn('[WhatsApp] Credenciales no configuradas en .env.local')",
  '    return',
  '  }',
  '',
  '  const hora = new Date(p.timestamp).toLocaleTimeString(\'es-PY\', {',
  "    timeZone: 'America/Asuncion',",
  "    hour: '2-digit',",
  "    minute: '2-digit',",
  '  })',
  '',
  "  const message = p.type === 'entry'",
  '    ? `Hola! ${p.studentName} ingresó al colegio a las ${hora}.`',
  '    : `Hola! ${p.studentName} salió del colegio a las ${hora}.`',
  '',
  '  const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {',
  "    method:  'POST',",
  '    headers: {',
  '      \'Authorization\': `Bearer ${token}`,',
  "      'Content-Type':  'application/json',",
  '    },',
  '    body: JSON.stringify({',
  "      messaging_product: 'whatsapp',",
  '      to:   p.phone.replace(/\\D/g, \'\'),',
  "      type: 'text',",
  '      text: { body: message },',
  '    }),',
  '  })',
  '',
  '  if (!res.ok) {',
  '    const error = await res.json()',
  "    console.error('[WhatsApp] API error:', error)",
  '    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)',
  '  }',
  '}',
])

log('🔲 Creando servicio de QR codes...')

write('src/lib/qr.ts', [
  "import { SignJWT, jwtVerify } from 'jose'",
  '',
  "const QR_EXPIRY  = '7d'",
  "const getSecret  = () => new TextEncoder().encode(process.env.QR_SECRET!)",
  '',
  '/**',
  ' * Genera un token JWT firmado que se convierte en QR code.',
  ' * Llamarlo al crear un alumno y para renovar QR expirados.',
  ' */',
  'export async function generateStudentQR(',
  '  studentId:     string,',
  '  institutionId: string',
  '): Promise<string> {',
  '  return new SignJWT({',
  '    sub:            studentId,',
  '    institution_id: institutionId,',
  "    type:           'student_qr',",
  '  })',
  "    .setProtectedHeader({ alg: 'HS256' })",
  '    .setIssuedAt()',
  '    .setExpirationTime(QR_EXPIRY)',
  '    .sign(getSecret())',
  '}',
  '',
  '/**',
  ' * Verifica un token QR. Retorna null si expiró o es inválido.',
  ' * También se usa en el dispositivo tablet (con la misma clave).',
  ' */',
  'export async function verifyStudentQR(token: string): Promise<{',
  '  studentId:     string',
  '  institutionId: string',
  '} | null> {',
  '  try {',
  '    const { payload } = await jwtVerify(token, getSecret())',
  "    if (payload.type !== 'student_qr' || !payload.sub) return null",
  '    return {',
  '      studentId:     payload.sub,',
  '      institutionId: payload.institution_id as string,',
  '    }',
  '  } catch {',
  '    return null // Token expirado o firma inválida',
  '  }',
  '}',
])

// ─────────────────────────────────────────────────────────────────
// 6. Tipos TypeScript
// ─────────────────────────────────────────────────────────────────

log('📐 Creando tipos TypeScript...')

write('src/types/index.ts', [
  '// Tipos principales del sistema.',
  '// Los tipos de la DB se generan automáticamente con:',
  '// npx supabase gen types typescript --project-id TU-PROJECT-ID > src/types/database.ts',
  '',
  "export type AttendanceType = 'entry' | 'exit'",
  "export type UserRole = 'superadmin' | 'admin' | 'teacher'",
  "export type NotifChannel = 'whatsapp' | 'push' | 'sms'",
  "export type NotifStatus = 'pending' | 'sent' | 'failed'",
  '',
  'export interface AttendanceRecord {',
  '  id:             string',
  '  client_uuid:    string',
  '  student_id:     string',
  '  device_id:      string',
  '  institution_id: string',
  '  type:           AttendanceType',
  '  recorded_at:    string',
  '  synced_at:      string',
  '}',
  '',
  'export interface Student {',
  '  id:             string',
  '  institution_id: string',
  '  name:           string',
  '  grade:          string',
  '  section:        string | null',
  '  photo_url:      string | null',
  '  guardian_name:  string | null',
  '  guardian_phone: string | null',
  '  qr_token:       string',
  '  qr_expires_at:  string',
  '  active:         boolean',
  '}',
  '',
  'export interface Device {',
  '  id:                 string',
  '  institution_id:     string',
  '  name:               string',
  '  location:           string | null',
  '  device_token:       string',
  '  last_seen_at:       string | null',
  '  pending_sync_count: number',
  '  active:             boolean',
  '}',
])

// ─────────────────────────────────────────────────────────────────
// 7. API Routes
// ─────────────────────────────────────────────────────────────────

log('🚀 Creando API Routes...')

write('src/app/api/attendance/route.ts', [
  "import { NextRequest, NextResponse } from 'next/server'",
  "import { createClient } from '@supabase/supabase-js'",
  "import { sendWhatsAppNotification } from '@/lib/whatsapp'",
  "import { z } from 'zod'",
  '',
  '// Service Role Key: bypasea RLS para inserts de dispositivos.',
  '// Esta clave NUNCA debe ir al cliente (browser).',
  'const supabase = createClient(',
  '  process.env.NEXT_PUBLIC_SUPABASE_URL!,',
  '  process.env.SUPABASE_SERVICE_ROLE_KEY!',
  ')',
  '',
  'const schema = z.object({',
  '  client_uuid:  z.string().uuid(),    // Generado en el dispositivo (idempotencia)',
  '  student_id:   z.string().uuid(),',
  "  type:         z.enum(['entry', 'exit']),",
  '  recorded_at:  z.string().datetime(), // ISO 8601 con timezone',
  '})',
  '',
  '// POST /api/attendance — registrar entrada o salida de un alumno',
  'export async function POST(req: NextRequest) {',
  '  try {',
  '    // 1. Autenticar el dispositivo tablet',
  "    const deviceToken = req.headers.get('x-device-token')",
  '    if (!deviceToken) {',
  "      return NextResponse.json({ error: 'Missing device token' }, { status: 401 })",
  '    }',
  '',
  '    const { data: device, error: devErr } = await supabase',
  "      .from('devices')",
  "      .select('id, institution_id')",
  '      .eq(\'device_token\', deviceToken)',
  '      .eq(\'active\', true)',
  '      .single()',
  '',
  '    if (devErr || !device) {',
  "      return NextResponse.json({ error: 'Invalid device' }, { status: 401 })",
  '    }',
  '',
  '    // 2. Validar body con Zod',
  '    const body = schema.parse(await req.json())',
  '',
  '    // 3. Inserción idempotente: si el client_uuid ya existe, no falla ni duplica',
  '    const { data: record, error: insErr } = await supabase',
  "      .from('attendance_records')",
  '      .upsert(',
  '        {',
  '          client_uuid:    body.client_uuid,',
  '          student_id:     body.student_id,',
  '          device_id:      device.id,',
  '          institution_id: device.institution_id,',
  '          type:           body.type,',
  '          recorded_at:    body.recorded_at,',
  "          sync_source:    'direct',",
  '        },',
  "        { onConflict: 'client_uuid', ignoreDuplicates: true }",
  '      )',
  '      .select()',
  '      .single()',
  '',
  '    if (insErr) throw insErr',
  '',
  '    // 4. Notificar al tutor (solo si el registro es nuevo, no un duplicado)',
  '    if (record) {',
  '      const { data: student } = await supabase',
  "        .from('students')",
  "        .select('name, guardian_phone')",
  '        .eq(\'id\', body.student_id)',
  '        .single()',
  '',
  '      if (student?.guardian_phone) {',
  '        // Fire and forget: no bloquea la respuesta al dispositivo',
  '        sendWhatsAppNotification({',
  '          phone:       student.guardian_phone,',
  '          studentName: student.name,',
  '          type:        body.type,',
  '          timestamp:   body.recorded_at,',
  '        }).catch(console.error)',
  '      }',
  '    }',
  '',
  '    return NextResponse.json({',
  "      status:    'ok',",
  '      id:        record?.id ?? null,',
  '      duplicate: !record, // true si el client_uuid ya existía',
  '    })',
  '',
  '  } catch (e) {',
  '    if (e instanceof z.ZodError) {',
  '      return NextResponse.json({ error: e.errors }, { status: 400 })',
  '    }',
  "    console.error('[POST /api/attendance]', e)",
  "    return NextResponse.json({ error: 'Internal error' }, { status: 500 })",
  '  }',
  '}',
])

write('src/app/api/sync/batch/route.ts', [
  "import { NextRequest, NextResponse } from 'next/server'",
  "import { createClient } from '@supabase/supabase-js'",
  "import { sendWhatsAppNotification } from '@/lib/whatsapp'",
  "import { z } from 'zod'",
  '',
  'const supabase = createClient(',
  '  process.env.NEXT_PUBLIC_SUPABASE_URL!,',
  '  process.env.SUPABASE_SERVICE_ROLE_KEY!',
  ')',
  '',
  'const schema = z.object({',
  '  records: z.array(z.object({',
  '    client_uuid:  z.string().uuid(),',
  '    student_id:   z.string().uuid(),',
  "    type:         z.enum(['entry', 'exit']),",
  '    recorded_at:  z.string().datetime(),',
  '  })).min(1).max(500),',
  '})',
  '',
  '// POST /api/sync/batch — sincronizar registros acumulados offline',
  'export async function POST(req: NextRequest) {',
  '  try {',
  "    const deviceToken = req.headers.get('x-device-token')",
  '',
  '    const { data: device } = await supabase',
  "      .from('devices')",
  "      .select('id, institution_id')",
  '      .eq(\'device_token\', deviceToken!)',
  '      .eq(\'active\', true)',
  '      .single()',
  '',
  "    if (!device) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })",
  '',
  '    const { records } = schema.parse(await req.json())',
  '',
  '    // Upsert en batch: todos los registros en una sola query',
  '    const { data: inserted, error } = await supabase',
  "      .from('attendance_records')",
  '      .upsert(',
  '        records.map(r => ({',
  '          client_uuid:    r.client_uuid,',
  '          student_id:     r.student_id,',
  '          device_id:      device.id,',
  '          institution_id: device.institution_id,',
  '          type:           r.type,',
  '          recorded_at:    r.recorded_at,',
  "          sync_source:    'batch',",
  '        })),',
  "        { onConflict: 'client_uuid', ignoreDuplicates: true }",
  '      )',
  "      .select('client_uuid, student_id, type, recorded_at')",
  '',
  '    if (error) throw error',
  '',
  '    // Notificar en background (no bloquea el ACK al dispositivo)',
  '    if (inserted && inserted.length > 0) {',
  '      notifyGuardians(inserted, device.institution_id).catch(console.error)',
  '    }',
  '',
  '    return NextResponse.json({',
  '      acked: inserted?.map(r => r.client_uuid) ?? [],',
  '      count: inserted?.length ?? 0,',
  '    })',
  '',
  '  } catch (e) {',
  '    if (e instanceof z.ZodError) {',
  '      return NextResponse.json({ error: e.errors }, { status: 400 })',
  '    }',
  "    console.error('[POST /api/sync/batch]', e)",
  "    return NextResponse.json({ error: 'Internal error' }, { status: 500 })",
  '  }',
  '}',
  '',
  'async function notifyGuardians(records: any[], institutionId: string) {',
  '  const ids = [...new Set(records.map((r: any) => r.student_id))]',
  '  const { data: students } = await supabase',
  "    .from('students')",
  "    .select('id, name, guardian_phone')",
  '    .in(\'id\', ids)',
  '',
  '  const map = new Map(students?.map(s => [s.id, s]) ?? [])',
  '',
  '  for (const r of records) {',
  '    const student = map.get(r.student_id)',
  '    if (student?.guardian_phone) {',
  '      await sendWhatsAppNotification({',
  '        phone:       student.guardian_phone,',
  '        studentName: student.name,',
  '        type:        r.type,',
  '        timestamp:   r.recorded_at,',
  '      }).catch(console.error)',
  '    }',
  '  }',
  '}',
])

write('src/app/api/students/route.ts', [
  "import { NextRequest, NextResponse } from 'next/server'",
  "import { createClient as createServerClient } from '@/lib/supabase/server'",
  "import { generateStudentQR } from '@/lib/qr'",
  "import { z } from 'zod'",
  '',
  'const createSchema = z.object({',
  '  name:           z.string().min(2).max(200),',
  '  grade:          z.string().min(1).max(20),',
  '  section:        z.string().max(10).optional(),',
  '  guardian_name:  z.string().max(200).optional(),',
  '  guardian_phone: z.string().regex(/^\\+?[0-9]{8,15}$/).optional(),',
  '})',
  '',
  '// GET /api/students — listar alumnos de la institución',
  'export async function GET(req: NextRequest) {',
  '  const supabase = await createServerClient()',
  '  const { data: { user } } = await supabase.auth.getUser()',
  "  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })",
  '',
  '  const { searchParams } = new URL(req.url)',
  "  const grade   = searchParams.get('grade')",
  "  const section = searchParams.get('section')",
  '',
  "  let query = supabase.from('students').select('*').eq('active', true).order('name')",
  '  if (grade)   query = query.eq(\'grade\', grade)',
  '  if (section) query = query.eq(\'section\', section)',
  '',
  '  const { data, error } = await query',
  '  if (error) throw error',
  '',
  '  return NextResponse.json({ students: data })',
  '}',
  '',
  '// POST /api/students — crear un alumno nuevo',
  'export async function POST(req: NextRequest) {',
  '  try {',
  '    const supabase = await createServerClient()',
  '    const { data: { user } } = await supabase.auth.getUser()',
  "    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })",
  '',
  '    const { data: profile } = await supabase',
  "      .from('users').select('institution_id, role').eq('id', user.id).single()",
  '',
  "    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {",
  "      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })",
  '    }',
  '',
  '    const body = createSchema.parse(await req.json())',
  '',
  '    const { data: student, error } = await supabase',
  "      .from('students')",
  '      .insert({',
  '        ...body,',
  '        institution_id: profile.institution_id,',
  '      })',
  '      .select()',
  '      .single()',
  '',
  '    if (error) throw error',
  '',
  '    // Generar QR code firmado para el alumno',
  '    const qrToken = await generateStudentQR(student.id, profile.institution_id)',
  '    await supabase',
  "      .from('students')",
  '      .update({ qr_token: qrToken })',
  '      .eq(\'id\', student.id)',
  '',
  '    return NextResponse.json({ student: { ...student, qr_token: qrToken } }, { status: 201 })',
  '',
  '  } catch (e) {',
  '    if (e instanceof z.ZodError) {',
  '      return NextResponse.json({ error: e.errors }, { status: 400 })',
  '    }',
  "    return NextResponse.json({ error: 'Internal error' }, { status: 500 })",
  '  }',
  '}',
])

// ─────────────────────────────────────────────────────────────────
// 8. Páginas placeholder
// ─────────────────────────────────────────────────────────────────

log('📄 Creando páginas placeholder...')

write('src/app/(auth)/login/page.tsx', [
  "// TODO: Implementar formulario de login con Supabase Auth",
  "// Referencia: https://supabase.com/docs/guides/auth/server-side/nextjs",
  '',
  "export default function LoginPage() {",
  "  return (",
  "    <div className='flex min-h-screen items-center justify-center'>",
  "      <div className='rounded-lg border p-8 w-full max-w-sm'>",
  "        <h1 className='text-xl font-semibold mb-6'>Sistema de Asistencia</h1>",
  "        <p className='text-sm text-gray-500'>",
  "          Implementar formulario de login aquí.",
  "        </p>",
  "      </div>",
  "    </div>",
  "  )",
  "}",
])

write('src/app/(dashboard)/dashboard/page.tsx', [
  "// TODO: Dashboard principal — asistencia del día en tiempo real",
  "// Usar Supabase Realtime para actualizaciones automáticas",
  '',
  "export default function DashboardPage() {",
  "  return (",
  "    <div className='p-6'>",
  "      <h1 className='text-2xl font-semibold mb-4'>Asistencia de hoy</h1>",
  "      <p className='text-gray-500'>Dashboard en construcción.</p>",
  "    </div>",
  "  )",
  "}",
])

write('src/app/(dashboard)/students/page.tsx', [
  "// TODO: Lista de alumnos con búsqueda y filtros por grado",
  '',
  "export default function StudentsPage() {",
  "  return (",
  "    <div className='p-6'>",
  "      <h1 className='text-2xl font-semibold mb-4'>Alumnos</h1>",
  "      <p className='text-gray-500'>Gestión de alumnos en construcción.</p>",
  "    </div>",
  "  )",
  "}",
])

// ─────────────────────────────────────────────────────────────────
// 9. Migraciones SQL
// ─────────────────────────────────────────────────────────────────

log('🗄️  Creando migraciones SQL...')

write('supabase/migrations/001_initial_schema.sql', [
  '-- ════════════════════════════════════════════════════════════════',
  '-- 001_initial_schema.sql',
  '-- Ejecutar en: supabase.com → tu proyecto → SQL Editor',
  '-- ════════════════════════════════════════════════════════════════',
  '',
  '-- Tabla raíz: una fila = un colegio (tenant)',
  'CREATE TABLE institutions (',
  '  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  name         VARCHAR(200) NOT NULL,',
  "  plan         VARCHAR(20)  DEFAULT 'basic' CHECK (plan IN ('basic', 'premium')),",
  '  wa_phone_id  VARCHAR(100),',
  '  wa_token     TEXT,',
  "  settings     JSONB DEFAULT '{}',",
  '  created_at   TIMESTAMPTZ DEFAULT NOW()',
  ');',
  '',
  '-- Alumnos registrados',
  'CREATE TABLE students (',
  '  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,',
  '  name            VARCHAR(200) NOT NULL,',
  '  grade           VARCHAR(20)  NOT NULL,',
  '  section         VARCHAR(10),',
  '  photo_url       TEXT,',
  '  guardian_name   VARCHAR(200),',
  '  guardian_phone  VARCHAR(20),',
  "  qr_token        VARCHAR(500) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),",
  "  qr_expires_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',",
  '  active          BOOLEAN DEFAULT true,',
  '  created_at      TIMESTAMPTZ DEFAULT NOW()',
  ');',
  '',
  '-- Tablets registradas',
  'CREATE TABLE devices (',
  '  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  institution_id     UUID NOT NULL REFERENCES institutions(id),',
  '  name               VARCHAR(100) NOT NULL,',
  '  location           VARCHAR(100),',
  '  device_token       VARCHAR(200) UNIQUE NOT NULL,',
  '  last_seen_at       TIMESTAMPTZ,',
  '  pending_sync_count INT DEFAULT 0,',
  '  active             BOOLEAN DEFAULT true,',
  '  created_at         TIMESTAMPTZ DEFAULT NOW()',
  ');',
  '',
  '-- Registros de asistencia — tabla central del sistema',
  '-- client_uuid: generado en el dispositivo, garantiza idempotencia offline',
  'CREATE TABLE attendance_records (',
  '  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  client_uuid    UUID UNIQUE NOT NULL,',
  '  student_id     UUID NOT NULL REFERENCES students(id),',
  '  device_id      UUID NOT NULL REFERENCES devices(id),',
  '  institution_id UUID NOT NULL REFERENCES institutions(id),',
  "  type           VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit')),",
  '  recorded_at    TIMESTAMPTZ NOT NULL,',
  '  synced_at      TIMESTAMPTZ DEFAULT NOW(),',
  "  sync_source    VARCHAR(10) DEFAULT 'direct' CHECK (sync_source IN ('direct', 'batch'))",
  ');',
  '',
  '-- Log de notificaciones enviadas a padres',
  'CREATE TABLE notification_log (',
  '  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  institution_id       UUID NOT NULL REFERENCES institutions(id),',
  '  student_id           UUID NOT NULL REFERENCES students(id),',
  '  attendance_record_id UUID REFERENCES attendance_records(id),',
  "  channel              VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'push', 'sms')),",
  "  status               VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),",
  '  error_message        TEXT,',
  '  sent_at              TIMESTAMPTZ DEFAULT NOW()',
  ');',
  '',
  '-- Usuarios (admin/docente) — extiende auth.users de Supabase',
  'CREATE TABLE users (',
  '  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,',
  '  institution_id UUID REFERENCES institutions(id),',
  "  role           VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('superadmin', 'admin', 'teacher')),",
  '  name           VARCHAR(200),',
  '  created_at     TIMESTAMPTZ DEFAULT NOW()',
  ');',
])

write('supabase/migrations/002_rls_policies.sql', [
  '-- ════════════════════════════════════════════════════════════════',
  '-- 002_rls_policies.sql — Row Level Security',
  '-- Ejecutar DESPUÉS de 001_initial_schema.sql',
  '-- ════════════════════════════════════════════════════════════════',
  '',
  '-- Activar RLS en todas las tablas',
  'ALTER TABLE institutions       ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE students           ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE devices            ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE notification_log   ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE users              ENABLE ROW LEVEL SECURITY;',
  '',
  '-- Helper: devuelve institution_id del usuario autenticado',
  'CREATE OR REPLACE FUNCTION get_my_institution()',
  'RETURNS UUID AS $$',
  '  SELECT institution_id FROM public.users WHERE id = auth.uid()',
  '$$ LANGUAGE SQL SECURITY DEFINER STABLE;',
  '',
  '-- ── Students ──────────────────────────────────────────────────',
  'CREATE POLICY students_select ON students',
  '  FOR SELECT USING (institution_id = get_my_institution());',
  '',
  'CREATE POLICY students_insert ON students',
  '  FOR INSERT WITH CHECK (institution_id = get_my_institution());',
  '',
  'CREATE POLICY students_update ON students',
  '  FOR UPDATE USING (institution_id = get_my_institution());',
  '',
  '-- ── Attendance records ────────────────────────────────────────',
  'CREATE POLICY att_select ON attendance_records',
  '  FOR SELECT USING (institution_id = get_my_institution());',
  '',
  'CREATE POLICY att_insert ON attendance_records',
  '  FOR INSERT WITH CHECK (institution_id = get_my_institution());',
  '',
  '-- ── Devices ──────────────────────────────────────────────────',
  'CREATE POLICY dev_select ON devices',
  '  FOR SELECT USING (institution_id = get_my_institution());',
  '',
  '-- ── Notification log ─────────────────────────────────────────',
  'CREATE POLICY notif_select ON notification_log',
  '  FOR SELECT USING (institution_id = get_my_institution());',
  '',
  '-- ── Users: cada uno ve solo su propio perfil ─────────────────',
  'CREATE POLICY users_self ON users',
  '  USING (id = auth.uid());',
])

write('supabase/migrations/003_indexes.sql', [
  '-- ════════════════════════════════════════════════════════════════',
  '-- 003_indexes.sql — Índices de rendimiento',
  '-- Ejecutar DESPUÉS de 001 y 002',
  '-- ════════════════════════════════════════════════════════════════',
  '',
  '-- El más usado: "asistencia de hoy por institución"',
  'CREATE INDEX idx_att_tenant_date',
  '  ON attendance_records (institution_id, recorded_at DESC);',
  '',
  '-- Escaneo QR: ocurre en CADA entrada de alumno (crítico para rendimiento)',
  'CREATE INDEX idx_students_qr',
  '  ON students (qr_token)',
  '  WHERE active = true;',
  '',
  '-- Vista del docente: lista por grado y sección',
  'CREATE INDEX idx_students_grade',
  '  ON students (institution_id, grade, section)',
  '  WHERE active = true;',
  '',
  '-- Historial de un alumno específico',
  'CREATE INDEX idx_att_student',
  '  ON attendance_records (student_id, recorded_at DESC);',
  '',
  '-- Monitor de dispositivos',
  'CREATE INDEX idx_devices_institution',
  '  ON devices (institution_id)',
  '  WHERE active = true;',
])

// ─────────────────────────────────────────────────────────────────
// 10. Instalar dependencias
// ─────────────────────────────────────────────────────────────────

log('📦 Instalando dependencias npm...')

try {
  execSync('npm install @supabase/supabase-js @supabase/ssr zod jose', {
    stdio: 'inherit',
  })
  ok('Dependencias instaladas correctamente')
} catch (e) {
  warn('Error al instalar. Corré manualmente:')
  warn('npm install @supabase/supabase-js @supabase/ssr zod jose')
}

// ─────────────────────────────────────────────────────────────────
// Resumen final
// ─────────────────────────────────────────────────────────────────

console.log('')
c(32, '══════════════════════════════════════════════════════')
c(32, '  ✅  Setup completo!')
c(32, '══════════════════════════════════════════════════════')
console.log('')
console.log('Próximos pasos:\n')
console.log('  1️⃣   Completá .env.local con tus keys de Supabase:')
console.log('       supabase.com → tu proyecto → Settings → API\n')
console.log('  2️⃣   Corré las migraciones SQL en este orden:')
console.log('       supabase.com → SQL Editor → ejecutá cada archivo de supabase/migrations/\n')
console.log('  3️⃣   Levantá el servidor de desarrollo:')
console.log('       npm run dev  →  http://localhost:3000\n')
console.log('  4️⃣   Abrí el proyecto en VSCode:')
console.log('       code .\n')
console.log('  5️⃣   Para testear la API de attendance:')
console.log('       POST http://localhost:3000/api/attendance')
console.log('       Header: x-device-token: TU_DEVICE_TOKEN')
console.log('       Body: { client_uuid, student_id, type, recorded_at }\n')
c(90, '  Archivos creados: revisa CLAUDE.md para el contexto del proyecto.')
console.log('')