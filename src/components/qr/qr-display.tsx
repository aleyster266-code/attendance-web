'use client'
import { useEffect, useRef } from 'react'

interface Props {
  student: {
    id:            string
    name:          string
    grade:         string
    section:       string | null
    qr_token:      string
    qr_expires_at: string
  }
  institutionName: string
  compact?: boolean  // para la vista de carnet
}

export default function QRDisplay({ student, institutionName, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Cargar QRCode desde CDN y generar el canvas
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const size = compact ? 120 : 200
      // @ts-ignore — QRCode es global desde CDN
      new window.QRCode(canvas, {
        text:            student.qr_token,
        width:           size,
        height:          size,
        colorDark:       '#000000',
        colorLight:      '#ffffff',
        correctLevel:    window.QRCode.CorrectLevel.M,
      })
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [student.qr_token, compact])

  const expires = new Date(student.qr_expires_at).toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  if (compact) {
    return (
      <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl p-3"
        style={{ width: 160, breakInside: 'avoid' }}>
        <div className="text-xs font-semibold text-blue-600 text-center mb-1 leading-tight">
          {institutionName}
        </div>
        <div ref={canvasRef} className="my-1" />
        <div className="text-xs font-semibold text-gray-900 text-center leading-tight mt-1">
          {student.name}
        </div>
        <div className="text-xs text-gray-500 text-center">
          {student.grade}{student.section ? ' - ' + student.section : ''}
        </div>
        <div className="text-xs text-gray-400 mt-1">Vence: {expires}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-xs text-center">
      <div className="text-sm font-semibold text-blue-600 mb-1">{institutionName}</div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">{student.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {student.grade}{student.section ? ' - ' + student.section : ''}
      </p>
      <div className="flex justify-center mb-4">
        <div ref={canvasRef} />
      </div>
      <p className="text-xs text-gray-400">
        Mostrar este codigo al ingresar al colegio
      </p>
      <p className="text-xs text-gray-400 mt-1">Vence: {expires}</p>
    </div>
  )
}
