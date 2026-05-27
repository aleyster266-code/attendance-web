import { createClient } from '@supabase/supabase-js'
import QRDisplay from '@/components/qr/qr-display'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props { params: Promise<{ studentId: string }> }

export default async function QRPage({ params }: Props) {
  const { studentId } = await params

  const { data: student } = await supabase
    .from('students')
    .select('id, name, grade, section, qr_token, qr_expires_at, institution_id')
    .eq('id', studentId)
    .eq('active', true)
    .single()

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-sm">QR no encontrado o alumno inactivo.</p>
        </div>
      </div>
    )
  }

  // Obtener nombre del colegio
  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', student.institution_id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <QRDisplay
        student={student}
        institutionName={institution?.name ?? 'Colegio'}
      />
    </div>
  )
}
