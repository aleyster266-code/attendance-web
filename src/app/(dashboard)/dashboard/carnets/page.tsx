import { createClient } from '@/lib/supabase/server'
import CarnetsClient from '@/components/qr/carnets-client'

export const dynamic = 'force-dynamic'

export default async function CarnetsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user!.id)
    .single()

  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', profile?.institution_id ?? '')
    .single()

  // Solo necesitamos los grados — los alumnos con SVG se cargan via API
  const { data: students } = await supabase
    .from('students')
    .select('grade')
    .eq('active', true)
    .order('grade')

  const grades = [...new Set(students?.map(s => s.grade) ?? [])].sort()

  return (
    <CarnetsClient
      institutionName={institution?.name ?? 'Colegio'}
      grades={grades}
    />
  )
}
