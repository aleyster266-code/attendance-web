'use client'
import { useState } from 'react'
import AddStudentForm from './add-student-form'
import ImportStudents from './import-students'

interface Student {
  id:             string
  name:           string
  grade:          string
  section:        string | null
  guardian_name:  string | null
  guardian_phone: string | null
  qr_token:       string
  active:         boolean
}

interface Props { students: Student[] }

export default function StudentsClient({ students }: Props) {
  const [showForm,   setShowForm]   = useState(false)
  const [showImport, setShowImport] = useState(false)

  const byGrade: Record<string, Student[]> = {}
  students.forEach(s => {
    const key = s.grade + (s.section ? ' - ' + s.section : '')
    if (!byGrade[key]) byGrade[key] = []
    byGrade[key]!.push(s)
  })

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Alumnos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} alumnos activos</p>
        </div>
        <div className="flex gap-2">
          {/* Importar CSV */}
          <button onClick={() => setShowImport(true)}
            className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg
                       hover:bg-gray-50 transition-colors font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V4"/>
            </svg>
            Importar CSV
          </button>
          {/* Agregar uno */}
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Agregar alumno
          </button>
        </div>
      </div>

      {/* Lista por grado */}
      {students.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <p className="text-sm text-gray-400 mb-4">No hay alumnos cargados todavia.</p>
          <button onClick={() => setShowImport(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Importar desde CSV
          </button>
        </div>
      ) : (
        Object.entries(byGrade).map(([grade, list]) => (
          <div key={grade} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">{grade}</h2>
              <span className="text-xs text-gray-400">{list.length} alumnos</span>
            </div>
            <div className="divide-y divide-gray-50">
              {list.map(s => (
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
                        {s.guardian_name}{s.guardian_phone ? ' - ' + s.guardian_phone : ''}
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
        ))
      )}

      {showForm   && <AddStudentForm   onClose={() => setShowForm(false)}   />}
      {showImport && <ImportStudents   onClose={() => setShowImport(false)} />}
    </div>
  )
}
