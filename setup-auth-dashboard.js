#!/usr/bin/env node
'use strict'
// setup-auth-dashboard.js
// Corre desde la raíz del proyecto: node setup-auth-dashboard.js

const fs   = require('fs')
const path = require('path')

const G = s => console.log(`\x1b[32m  ✓  ${s}\x1b[0m`)
const C = s => console.log(`\x1b[36m\n${s}\x1b[0m`)
const skip = s => console.log(`\x1b[90m  –  ${s} (ya existe)\x1b[0m`)

function write(filePath, content) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (fs.existsSync(filePath)) { skip(filePath); return }
  fs.writeFileSync(filePath, content, 'utf8')
  G(filePath)
}

console.log('\x1b[36m\n══════════════════════════════════════════\x1b[0m')
console.log('\x1b[36m  Login + Dashboard — MVP Asistencia\x1b[0m')
console.log('\x1b[36m══════════════════════════════════════════\x1b[0m')

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────
C('🔐 Login...')
write('src/app/(auth)/login/page.tsx', `'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                   M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Sistema de Asistencia</h1>
          <p className="text-sm text-gray-500 mt-1">Colegio San José — Asunción</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@colegio.edu.py" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
`)

// ─── LOGOUT BUTTON ─────────────────────────────────────────────────────────
C('🚪 Logout button...')
write('src/components/ui/logout-button.tsx', `'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router   = useRouter()
  async function handle() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return (
    <button onClick={handle}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm
                 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
      </svg>
      Cerrar sesión
    </button>
  )
}
`)

// ─── DASHBOARD LAYOUT ──────────────────────────────────────────────────────
C('🏗️  Layout del dashboard...')
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
                     M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">AsistenciaApp</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/dashboard"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Asistencia hoy
          </Link>
          <Link href="/dashboard/students"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Alumnos
          </Link>
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
`)

// ─── STATS ROW ─────────────────────────────────────────────────────────────
C('📊 Stats component...')
write('src/components/dashboard/stats-row.tsx', `interface Props {
  present: number
  absent:  number
  exited:  number
  total:   number
}
export default function StatsRow({ present, absent, exited, total }: Props) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0
  const stats = [
    { label: 'Presentes hoy', value: present, color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-100' },
    { label: 'Ausentes',      value: absent,  color: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-100'   },
    { label: 'Ya salieron',   value: exited,  color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-100'  },
    { label: 'Total alumnos', value: total,   color: 'text-gray-700',  bg: 'bg-gray-50',   border: 'border-gray-100'  },
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={\`\${s.bg} border \${s.border} rounded-xl p-4\`}>
            <div className={\`text-2xl font-semibold \${s.color}\`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">Tasa de asistencia</span>
          <span className="font-semibold text-gray-900">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: \`\${pct}%\` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{present} ingresaron</span>
          <span>{absent} ausentes</span>
        </div>
      </div>
    </div>
  )
}
`)

// ─── ATTENDANCE TABLE ──────────────────────────────────────────────────────
C('📋 Tabla de asistencia...')
write('src/components/dashboard/attendance-table.tsx', `interface Rec {
  id: string; type: string; recorded_at: string
  student: { id: string; name: string; grade: string; section: string | null } | null
}
interface Props { records: Rec[]; exitIds: Set<string> }

export default function AttendanceTable({ records, exitIds }: Props) {
  if (records.length === 0) return (
    <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
      <p className="text-sm text-gray-400">No hay registros hoy todavía.</p>
    </div>
  )
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Registros del día</h2>
        <span className="text-xs text-gray-400">{records.length} alumnos</span>
      </div>
      <div className="divide-y divide-gray-50">
        {records.map(r => {
          const s       = r.student
          const salido  = s ? exitIds.has(s.id) : false
          const hora    = new Date(r.recorded_at).toLocaleTimeString('es-PY', {
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Asuncion'
          })
          return (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-blue-600">
                  {s?.name?.split(' ').map((n:string)=>n[0]).slice(0,2).join('')??'?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{s?.name??'—'}</div>
                <div className="text-xs text-gray-400">{s?.grade}{s?.section?' — '+s.section:''}</div>
              </div>
              <div className="flex items-center gap-2">
                {salido
                  ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Salió</span>
                  : <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-medium">En el colegio</span>
                }
                <span className="text-xs text-gray-400 tabular-nums">{hora}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
`)

// ─── DASHBOARD PAGE ────────────────────────────────────────────────────────
C('🏠 Dashboard page...')
write('src/app/(dashboard)/dashboard/page.tsx', `import { createClient } from '@/lib/supabase/server'
import AttendanceTable from '@/components/dashboard/attendance-table'
import StatsRow from '@/components/dashboard/stats-row'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('attendance_records')
    .select(\`id, type, recorded_at, student:students (id, name, grade, section)\`)
    .eq('type', 'entry')
    .gte('recorded_at', today + 'T00:00:00')
    .lte('recorded_at', today + 'T23:59:59')
    .order('recorded_at', { ascending: false })

  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  const { data: exits } = await supabase
    .from('attendance_records')
    .select('student_id')
    .eq('type', 'exit')
    .gte('recorded_at', today + 'T00:00:00')
    .lte('recorded_at', today + 'T23:59:59')

  const exitIds      = new Set(exits?.map(e => e.student_id) ?? [])
  const presentCount = entries?.length ?? 0
  const exitCount    = exitIds.size
  const absentCount  = (totalStudents ?? 0) - presentCount

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Asistencia de hoy</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-PY', {
              weekday:'long', year:'numeric', month:'long', day:'numeric',
              timeZone:'America/Asuncion'
            })}
          </p>
        </div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-100
                         rounded-full px-3 py-1 font-medium">En vivo</span>
      </div>
      <StatsRow present={presentCount} absent={absentCount} exited={exitCount} total={totalStudents??0} />
      <AttendanceTable records={entries??[]} exitIds={exitIds} />
    </div>
  )
}
`)

// ─── STUDENTS PAGE ─────────────────────────────────────────────────────────
C('👨‍🎓 Página de alumnos...')
write('src/app/(dashboard)/students/page.tsx', `import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('students').select('*').eq('active', true).order('grade').order('name')

  const byGrade: Record<string, typeof students> = {}
  students?.forEach(s => {
    const key = s.grade + (s.section ? ' — ' + s.section : '')
    if (!byGrade[key]) byGrade[key] = []
    byGrade[key]!.push(s)
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Alumnos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students?.length ?? 0} alumnos activos</p>
        </div>
        <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          + Agregar alumno
        </button>
      </div>
      {Object.entries(byGrade).map(([grade, list]) => (
        <div key={grade} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">{grade}</h2>
            <span className="text-xs text-gray-400">{list?.length} alumnos</span>
          </div>
          <div className="divide-y divide-gray-50">
            {list?.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-600">
                    {s.name.split(' ').map((n:string)=>n[0]).slice(0,2).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{s.name}</div>
                  {s.guardian_name && (
                    <div className="text-xs text-gray-400">{s.guardian_name} · {s.guardian_phone}</div>
                  )}
                </div>
                <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">
                  QR activo
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
`)

// ─── RESUMEN ───────────────────────────────────────────────────────────────
console.log('\n\x1b[32m══════════════════════════════════════════\x1b[0m')
console.log('\x1b[32m  ✅  Listo! Próximos pasos:\x1b[0m\n')
console.log('  1. Crear usuario en Supabase:')
console.log('     Authentication → Users → Add user')
console.log('     email: admin@colegio.edu.py | pass: Admin1234!\n')
console.log('  2. Correr link_admin_user.sql en el SQL Editor\n')
console.log('  3. npm run dev → http://localhost:3000/login')
console.log('\x1b[32m══════════════════════════════════════════\x1b[0m\n')
