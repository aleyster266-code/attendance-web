import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
  records: z.array(z.object({
    client_uuid:  z.string().uuid(),
    student_id:   z.string().uuid(),
    type:         z.enum(['entry', 'exit']),
    recorded_at:  z.string().datetime(),
  })).min(1).max(500),
})

// POST /api/sync/batch — sincronizar registros acumulados offline
export async function POST(req: NextRequest) {
  try {
    const deviceToken = req.headers.get('x-device-token')

    const { data: device } = await supabase
      .from('devices')
      .select('id, institution_id')
      .eq('device_token', deviceToken!)
      .eq('active', true)
      .single()

    if (!device) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })

    const { records } = schema.parse(await req.json())

    // Upsert en batch: todos los registros en una sola query
    const { data: inserted, error } = await supabase
      .from('attendance_records')
      .upsert(
        records.map(r => ({
          client_uuid:    r.client_uuid,
          student_id:     r.student_id,
          device_id:      device.id,
          institution_id: device.institution_id,
          type:           r.type,
          recorded_at:    r.recorded_at,
          sync_source:    'batch',
        })),
        { onConflict: 'client_uuid', ignoreDuplicates: true }
      )
      .select('client_uuid, student_id, type, recorded_at')

    if (error) throw error

    // Notificar en background (no bloquea el ACK al dispositivo)
    if (inserted && inserted.length > 0) {
      notifyGuardians(inserted, device.institution_id).catch(console.error)
    }

    return NextResponse.json({
      acked: inserted?.map(r => r.client_uuid) ?? [],
      count: inserted?.length ?? 0,
    })

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 })
    }
    console.error('[POST /api/sync/batch]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function notifyGuardians(records: any[], institutionId: string) {
  const ids = [...new Set(records.map((r: any) => r.student_id))]
  const { data: students } = await supabase
    .from('students')
    .select('id, name, guardian_phone')
    .in('id', ids)

  const map = new Map(students?.map(s => [s.id, s]) ?? [])

  for (const r of records) {
    const student = map.get(r.student_id)
    if (student?.guardian_phone) {
      await sendWhatsAppNotification({
        phone:       student.guardian_phone,
        studentName: student.name,
        type:        r.type,
        timestamp:   r.recorded_at,
      }).catch(console.error)
    }
  }
}