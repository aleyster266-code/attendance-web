import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateStudentQR } from '@/lib/qr'
import { z } from 'zod'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const rowSchema = z.object({
  name:           z.string().min(2).max(200),
  grade:          z.string().min(1).max(20),
  section:        z.string().max(10).optional().nullable(),
  guardian_name:  z.string().max(200).optional().nullable(),
  guardian_phone: z.string().max(20).optional().nullable(),
})

const importSchema = z.object({
  students: z.array(rowSchema).min(1).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario esta autenticado y es admin
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = importSchema.parse(await req.json())

    // Generar QR para cada alumno y preparar el batch
    const rows = await Promise.all(
      body.students.map(async (s) => {
        // Placeholder UUID temporal — se reemplaza al insertar
        const tempId = crypto.randomUUID()
        const qrToken = await generateStudentQR(tempId, profile.institution_id)
        return {
          institution_id: profile.institution_id,
          name:           s.name.trim(),
          grade:          s.grade.trim(),
          section:        s.section?.trim() || null,
          guardian_name:  s.guardian_name?.trim() || null,
          guardian_phone: s.guardian_phone?.trim() || null,
          qr_token:       qrToken,
        }
      })
    )

    // Insertar en chunks de 100 para no sobrecargar Supabase
    const CHUNK = 100
    let inserted = 0
    let errors: string[] = []

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { data, error } = await supabaseAdmin
        .from('students')
        .insert(chunk)
        .select('id')

      if (error) {
        errors.push(`Chunk ${i / CHUNK + 1}: ${error.message}`)
      } else {
        inserted += data?.length ?? 0
      }
    }

    return NextResponse.json({
      inserted,
      errors,
      total: body.students.length,
    }, { status: 201 })

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 })
    }
    console.error('[POST /api/students/import]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
