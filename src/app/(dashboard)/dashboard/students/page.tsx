import { createClient } from '@/lib/supabase/server'
import StudentsClient from '@/components/students/students-client'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('active', true)
    .order('grade')
    .order('name')

  return <StudentsClient students={students ?? []} />
}
