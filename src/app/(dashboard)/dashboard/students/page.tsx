import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('active', true)
    .order('grade')
    .order('name')

  const byGrade: Record<string, typeof students> = {}
  students?.forEach(s => {
    const key = s.grade + (s.section ? ' - ' + s.section : '')
    if (!byGrade[key]) byGrade[key] = []
    byGrade[key]!.push(s)
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Alumnos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students?.length ?? 0} alumnos activos
          </p>
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
                    {s.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{s.name}</div>
                  {s.guardian_name && (
                    <div className="text-xs text-gray-400">
                      {s.guardian_name} - {s.guardian_phone}
                    </div>
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