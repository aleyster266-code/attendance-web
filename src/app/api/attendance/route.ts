import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { z } from 'zod'

// Service Role Key: bypasea RLS para inserts de dispositivos.
// Esta clave NUNCA debe ir al cliente (browser).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
  client_uuid:  z.string().uuid(),    // Generado en el dispositivo (idempotencia)
  student_id:   z.string().uuid(),
  type:         z.enum(['entry', 'exit']),
  recorded_at:  z.string().datetime(), // ISO 8601 con timezone
})

// POST /api/attendance — registrar entrada o salida de un alumno
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticar el dispositivo tablet
    const deviceToken = req.headers.get('x-device-token')
    if (!deviceToken) {
      return NextResponse.json({ error: 'Missing device token' }, { status: 401 })
    }

    const { data: device, error: devErr } = await supabase
      .from('devices')
      .select('id, institution_id')
      .eq('device_token', deviceToken)
      .eq('active', true)
      .single()

    if (devErr || !device) {
      return NextResponse.json({ error: 'Invalid device' }, { status: 401 })
    }

    // 2. Validar body con Zod
    const body = schema.parse(await req.json())

    // 3. Inserción idempotente: si el client_uuid ya existe, no falla ni duplica
    const { data: record, error: insErr } = await supabase
      .from('attendance_records')
      .upsert(
        {
          client_uuid:    body.client_uuid,
          student_id:     body.student_id,
          device_id:      device.id,
          institution_id: device.institution_id,
          type:           body.type,
          recorded_at:    body.recorded_at,
          sync_source:    'direct',
        },
        { onConflict: 'client_uuid', ignoreDuplicates: true }
      )
      .select()
      .single()

    if (insErr) throw insErr

    // 4. Notificar al tutor (solo si el registro es nuevo, no un duplicado)
    if (record) {
      const { data: student } = await supabase
        .from('students')
        .select('name, guardian_phone')
        .eq('id', body.student_id)
        .single()

      if (student?.guardian_phone) {
        // Fire and forget: no bloquea la respuesta al dispositivo
        sendWhatsAppNotification({
          phone:       student.guardian_phone,
          studentName: student.name,
          type:        body.type,
          timestamp:   body.recorded_at,
        }).catch(console.error)
      }
    }

    return NextResponse.json({
      status:    'ok',
      id:        record?.id ?? null,
      duplicate: !record, // true si el client_uuid ya existía
    })

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 })
    }
    console.error('[POST /api/attendance]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}