interface Rec {
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
