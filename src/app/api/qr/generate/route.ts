import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateStudentQR } from '@/lib/qr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/qr/generate?student_id=xxx
// Devuelve el token JWT del QR, renovandolo si esta por vencer
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('student_id')
  if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })

  const { data: student } = await supabase
    .from('students')
    .select('id, institution_id, qr_token, qr_expires_at, name')
    .eq('id', studentId)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Renovar QR si vence en menos de 2 dias
  const expiresAt = new Date(student.qr_expires_at)
  const twoDays   = 2 * 24 * 60 * 60 * 1000
  let qrToken     = student.qr_token

  if (expiresAt.getTime() - Date.now() < twoDays) {
    qrToken = await generateStudentQR(student.id, student.institution_id)
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await supabaseAdmin
      .from('students')
      .update({ qr_token: qrToken, qr_expires_at: newExpiry.toISOString() })
      .eq('id', student.id)
  }

  return NextResponse.json({
    student_id:    student.id,
    student_name:  student.name,
    qr_token:      qrToken,
    expires_at:    expiresAt.toISOString(),
  })
}
