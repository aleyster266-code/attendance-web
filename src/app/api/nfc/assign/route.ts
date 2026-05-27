import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
  student_id: z.string().uuid(),
  nfc_uid:    z.string().min(4).max(32), // UID del chip NFC (hex)
})

// POST /api/nfc/assign — asociar una tarjeta NFC a un alumno
// El lector NFC en la tablet lee el UID del chip y lo envia aqui
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.parse(await req.json())

  // Guardar el NFC UID en el campo nfc_uid de students
  // NOTA: requiere agregar la columna nfc_uid a la tabla students
  // Ver migration 005_add_nfc.sql
  const { data, error } = await supabaseAdmin
    .from('students')
    .update({ nfc_uid: body.nfc_uid })
    .eq('id', body.student_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, student: data })
}
