import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateStudentQR } from '@/lib/qr'
import { z } from 'zod'

const createSchema = z.object({
  name:           z.string().min(2).max(200),
  grade:          z.string().min(1).max(20),
  section:        z.string().max(10).optional(),
  guardian_name:  z.string().max(200).optional(),
  guardian_phone: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
})

// GET /api/students — listar alumnos de la institución
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const grade   = searchParams.get('grade')
  const section = searchParams.get('section')

  let query = supabase.from('students').select('*').eq('active', true).order('name')
  if (grade)   query = query.eq('grade', grade)
  if (section) query = query.eq('section', section)

  const { data, error } = await query
  if (error) throw error

  return NextResponse.json({ students: data })
}

// POST /api/students — crear un alumno nuevo
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('institution_id, role').eq('id', user.id).single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = createSchema.parse(await req.json())

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        ...body,
        institution_id: profile.institution_id,
      })
      .select()
      .single()

    if (error) throw error

    // Generar QR code firmado para el alumno
    const qrToken = await generateStudentQR(student.id, profile.institution_id)
    await supabase
      .from('students')
      .update({ qr_token: qrToken })
      .eq('id', student.id)

    return NextResponse.json({ student: { ...student, qr_token: qrToken } }, { status: 201 })

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}