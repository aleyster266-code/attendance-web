'use client'

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
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)

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
