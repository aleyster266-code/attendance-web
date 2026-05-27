'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
}

export default function AddStudentForm({ onClose }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form, setForm] = useState({
    name:           '',
    grade:          '',
    section:        '',
    guardian_name:  '',
    guardian_phone: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/students', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           form.name.trim(),
          grade:          form.grade.trim(),
          section:        form.section.trim() || undefined,
          guardian_name:  form.guardian_name.trim() || undefined,
          guardian_phone: form.guardian_phone.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al guardar el alumno')
        setLoading(false)
        return
      }

      router.refresh()  // recargar la lista de alumnos
      onClose()

    } catch (err) {
      setError('Error de conexion. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Agregar alumno</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text" required value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ana Gonzalez"
            />
          </div>

          {/* Grado y Sección */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grado <span className="text-red-500">*</span>
              </label>
              <select
                required value={form.grade}
                onChange={e => set('grade', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Seleccionar</option>
                {['1er año','2do año','3er año','4to año','5to año','6to año'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seccion
              </label>
              <select
                value={form.section}
                onChange={e => set('section', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sin seccion</option>
                {['A','B','C','D'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tutor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del tutor
            </label>
            <input
              type="text" value={form.guardian_name}
              onChange={e => set('guardian_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Maria Gonzalez"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefono del tutor
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 border border-gray-200 rounded-lg
                               text-sm text-gray-500 bg-gray-50 flex-shrink-0">
                +595
              </span>
              <input
                type="tel" value={form.guardian_phone}
                onChange={e => set('guardian_phone', '+595' + e.target.value.replace(/D/g, ''))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="981 111 222"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Este numero recibe las notificaciones de WhatsApp
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5
                         text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando...' : 'Guardar alumno'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
