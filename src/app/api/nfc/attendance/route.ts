import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
  nfc_uid:     z.string().min(4).max(32),
  device_id:   z.string().uuid(),
  client_uuid: z.string().uuid(),
  type:        z.enum(['entry', 'exit']),
  recorded_at: z.string().datetime(),
})

// POST /api/nfc/attendance — igual que /api/attendance pero por NFC UID
// La tablet lee el chip NFC y envia el UID en lugar del QR token
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

    const body = schema.parse(await req.json())

    // Buscar alumno por NFC UID
    const { data: student } = await supabase
      .from('students')
      .select('id, name, guardian_phone')
      .eq('nfc_uid', body.nfc_uid)
      .eq('institution_id', device.institution_id)
      .eq('active', true)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'NFC card not registered' }, { status: 404 })
    }

    // Mismo flujo idempotente que el QR
    const { data: record } = await supabase
      .from('attendance_records')
      .upsert({
        client_uuid:    body.client_uuid,
        student_id:     student.id,
        device_id:      device.id,
        institution_id: device.institution_id,
        type:           body.type,
        recorded_at:    body.recorded_at,
        sync_source:    'direct',
      }, { onConflict: 'client_uuid', ignoreDuplicates: true })
      .select()
      .single()

    if (record && student.guardian_phone) {
      sendWhatsAppNotification({
        phone:       student.guardian_phone,
        studentName: student.name,
        type:        body.type,
        timestamp:   body.recorded_at,
      }).catch(console.error)
    }

    return NextResponse.json({
      status:       'ok',
      student_name: student.name,
      id:           record?.id ?? null,
      duplicate:    !record,
    })
  } catch (e) {
    if (e instanceof Error && e.constructor.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
