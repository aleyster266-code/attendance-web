interface Props {
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
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
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
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{present} ingresaron</span>
          <span>{absent} ausentes</span>
        </div>
      </div>
    </div>
  )
}
