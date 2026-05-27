import { createClient } from '@/lib/supabase/server'
import CarnetsClient from '@/components/qr/carnets-client'

export const dynamic = 'force-dynamic'

export default async function CarnetsPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, name, grade, section, qr_token, qr_expires_at')
    .eq('active', true)
    .order('grade')
    .order('name')

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', profile?.institution_id ?? '')
    .single()

  // Obtener grados unicos
  const grades = [...new Set(students?.map(s => s.grade) ?? [])].sort()

  return (
    <CarnetsClient
      students={students ?? []}
      institutionName={institution?.name ?? 'Colegio'}
      grades={grades}
    />
  )
}
