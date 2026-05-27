import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateStudentQR } from '@/lib/qr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/qr/send-whatsapp — envia el QR al tutor por WhatsApp
// Body: { student_id } o { institution_id } para envio masivo
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, institution_id } = await req.json()

  // Obtener alumnos segun el scope
  let query = supabase.from('students').select('*').eq('active', true)
  if (student_id)    query = query.eq('id', student_id)
  if (institution_id) query = query.eq('institution_id', institution_id)

  const { data: students } = await query
  if (!students?.length) return NextResponse.json({ error: 'No students found' }, { status: 404 })

  const WA_BASE   = 'https://graph.facebook.com/v19.0'
  const phoneId   = process.env.WA_PHONE_ID
  const waToken   = process.env.WA_TOKEN
  let sent = 0, failed = 0

  for (const student of students) {
    if (!student.guardian_phone) { failed++; continue }

    // Renovar QR si es necesario
    let qrToken = student.qr_token
    const expiresAt = new Date(student.qr_expires_at)
    if (expiresAt.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000) {
      qrToken = await generateStudentQR(student.id, student.institution_id)
      await supabaseAdmin.from('students')
        .update({ qr_token: qrToken, qr_expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString() })
        .eq('id', student.id)
    }

    // URL del QR — apunta a la pagina de visualizacion
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const qrUrl  = `${appUrl}/qr/${student.id}`

    const message = [
      `Hola! Le enviamos el codigo QR de ${student.name} para el registro de asistencia.`,
      ``,
      `Guarde este mensaje. Su hijo/a debe mostrar este codigo al ingresar al colegio:`,
      `${qrUrl}`,
      ``,
      `El codigo se actualiza automaticamente. Si tiene dudas contacte a la administracion.`,
    ].join('\n')

    if (!phoneId || !waToken) {
      // En desarrollo: simular envio
      console.log(`[WA-SIMULADO] -> ${student.guardian_phone}: QR de ${student.name}`)
      sent++
      continue
    }

    try {
      const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: student.guardian_phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: message },
        }),
      })
      res.ok ? sent++ : failed++
    } catch { failed++ }
  }

  return NextResponse.json({ sent, failed, total: students.length })
}
