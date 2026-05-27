import { createClient } from '@/lib/supabase/server'
import StatsRow from '@/components/dashboard/stats-row'
import LiveDashboard from '@/components/dashboard/live-dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  const { data: rawEntries } = await supabase
    .from('attendance_records')
    .select('id, type, recorded_at, student_id, student:students(name, grade, section)')
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

  const exitIds = new Set(exits?.map(e => e.student_id) ?? [])

  // Normalizar join de Supabase (devuelve array)
  const initialRecords = (rawEntries ?? []).map(r => {
    const s = Array.isArray(r.student) ? r.student[0] : r.student
    return {
      id:           r.id,
      type:         r.type,
      recorded_at:  r.recorded_at,
      student_id:   r.student_id,
      student_name: s?.name,
      grade:        s?.grade,
      section:      s?.section ?? null,
    }
  })

  const presentCount = initialRecords.filter(r => r.type === 'entry').length
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
              timeZone: 'America/Asuncion',
            })}
          </p>
        </div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-100
                         rounded-full px-3 py-1 font-medium animate-pulse">
          En vivo
        </span>
      </div>

      <StatsRow
        present={presentCount}
        absent={absentCount}
        exited={exitCount}
        total={totalStudents ?? 0}
      />

      {/* LiveDashboard es un Client Component que maneja Realtime */}
      <LiveDashboard initialRecords={initialRecords} exitIds={[...exitIds]} />
    </div>
  )
}
