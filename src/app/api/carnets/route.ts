import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateQRSvg, generateStudentQR } from '@/lib/qr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/carnets?grade=1er+año
// Devuelve alumnos con su SVG de QR ya generado en el servidor
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single()

  if (!profile?.institution_id) {
    return NextResponse.json({ error: 'No institution' }, { status: 403 })
  }

  const grade = req.nextUrl.searchParams.get('grade')

  let query = supabaseAdmin
    .from('students')
    .select('id, name, grade, section, qr_token, qr_expires_at, institution_id')
    .eq('institution_id', profile.institution_id)
    .eq('active', true)
    .order('grade')
    .order('name')

  if (grade && grade !== 'all') {
    query = query.eq('grade', grade)
  }

  const { data: students, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const oneYear = 365 * 24 * 60 * 60 * 1000

  // Generar SVGs en paralelo — rápido incluso con 1000 alumnos
  const withSvg = await Promise.all(
    (students ?? []).map(async (s) => {
      // Renovar token si vence en menos de 30 días
      let token = s.qr_token
      const expires = new Date(s.qr_expires_at)
      if (expires.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000) {
        token = await generateStudentQR(s.id, s.institution_id)
        const newExpiry = new Date(Date.now() + oneYear)
        await supabaseAdmin
          .from('students')
          .update({ qr_token: token, qr_expires_at: newExpiry.toISOString() })
          .eq('id', s.id)
      }
      const svg = await generateQRSvg(token, 120)
      return {
        id:           s.id,
        name:         s.name,
        grade:        s.grade,
        section:      s.section,
        qr_expires_at: s.qr_expires_at,
        svg,
      }
    })
  )

  return NextResponse.json({ students: withSvg })
}
