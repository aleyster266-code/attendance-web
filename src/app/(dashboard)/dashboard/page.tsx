import { createClient } from '@/lib/supabase/server'
import AttendanceTable from '@/components/dashboard/attendance-table'
import StatsRow from '@/components/dashboard/stats-row'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: rawEntries } = await supabase
    .from('attendance_records')
    .select(`id, type, recorded_at, student:students (id, name, grade, section)`)
    .eq('type', 'entry')
    .gte('recorded_at', today + 'T00:00:00')
    .lte('recorded_at', today + 'T23:59:59')
    .order('recorded_at', { ascending: false })

  // Supabase devuelve el join como array — tomamos el primer elemento
  const entries = (rawEntries ?? []).map(r => ({
    ...r,
    student: Array.isArray(r.student) ? r.student[0] ?? null : r.student,
  }))

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
  const presentCount = entries.length
  const exitCount    = exitIds.size
  const absentCount  = (totalStudents ?? 0) - presentCount

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Asistencia de hoy</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-PY', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              timeZone: 'America/Asuncion'
            })}
          </p>
        </div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-100
                         rounded-full px-3 py-1 font-medium">En vivo</span>
      </div>
      <StatsRow
        present={presentCount}
        absent={absentCount}
        exited={exitCount}
        total={totalStudents ?? 0}
      />
      <AttendanceTable records={entries} exitIds={exitIds} />
    </div>
  )
}