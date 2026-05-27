'use client'
import { useAttendanceRealtime, type LiveRecord } from '@/hooks/use-attendance-realtime'

interface Props {
  initialRecords: LiveRecord[]
  exitIds:        string[]
}

export default function LiveDashboard({ initialRecords, exitIds: initialExitIds }: Props) {
  const { records, newAlert } = useAttendanceRealtime(initialRecords)
  const exitSet = new Set(initialExitIds)

  return (
    <div className="space-y-3">

      {/* Alerta de entrada en tiempo real */}
      {newAlert && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3
                        flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-green-800">
              {newAlert.student_name ?? 'Alumno'} ingreso ahora
            </span>
            <span className="text-xs text-green-600 ml-2">
              {new Date(newAlert.recorded_at).toLocaleTimeString('es-PY', {
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Asuncion'
              })}
            </span>
          </div>
        </div>
      )}

      {/* Tabla de registros */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Registros del dia</h2>
          <span className="text-xs text-gray-400">{records.length} alumnos</span>
        </div>

        {records.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No hay registros hoy todavia.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map(r => {
              const salido = exitSet.has(r.student_id)
              const hora   = new Date(r.recorded_at).toLocaleTimeString('es-PY', {
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Asuncion'
              })
              const initials = (r.student_name ?? '?')
                .split(' ').map((n: string) => n[0]).slice(0, 2).join('')

              return (
                <div key={r.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {r.student_name ?? 'Alumno desconocido'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {r.grade}{r.section ? ' - ' + r.section : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {salido
                      ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Salio
                        </span>
                      : <span className="text-xs bg-green-50 text-green-700 border border-green-100
                                         px-2 py-0.5 rounded-full font-medium">
                          En el colegio
                        </span>
                    }
                    <span className="text-xs text-gray-400 tabular-nums">{hora}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
