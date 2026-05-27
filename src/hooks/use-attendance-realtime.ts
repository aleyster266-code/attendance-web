'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LiveRecord {
  id:          string
  type:        string
  recorded_at: string
  student_id:  string
  student_name?: string
  grade?:      string
  section?:    string | null
}

// Hook que escucha inserciones en attendance_records en tiempo real.
// Cuando llega un nuevo registro, actualiza el estado local sin recargar.
export function useAttendanceRealtime(initialRecords: LiveRecord[]) {
  const [records, setRecords] = useState<LiveRecord[]>(initialRecords)
  const [newAlert, setNewAlert] = useState<LiveRecord | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('attendance-live')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'attendance_records',
        },
        async (payload) => {
          const rec = payload.new as LiveRecord

          // Buscar datos del alumno para mostrar en la tabla
          const { data: student } = await supabase
            .from('students')
            .select('name, grade, section')
            .eq('id', rec.student_id)
            .single()

          const enriched: LiveRecord = {
            ...rec,
            student_name: student?.name,
            grade:        student?.grade,
            section:      student?.section,
          }

          // Agregar al inicio de la lista
          setRecords(prev => [enriched, ...prev])

          // Mostrar alerta visual por 3 segundos
          if (rec.type === 'entry') {
            setNewAlert(enriched)
            setTimeout(() => setNewAlert(null), 3000)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { records, newAlert }
}
