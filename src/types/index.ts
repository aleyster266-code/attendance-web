// Tipos principales del sistema.
// Los tipos de la DB se generan automáticamente con:
// npx supabase gen types typescript --project-id TU-PROJECT-ID > src/types/database.ts

export type AttendanceType = 'entry' | 'exit'
export type UserRole = 'superadmin' | 'admin' | 'teacher'
export type NotifChannel = 'whatsapp' | 'push' | 'sms'
export type NotifStatus = 'pending' | 'sent' | 'failed'

export interface AttendanceRecord {
  id:             string
  client_uuid:    string
  student_id:     string
  device_id:      string
  institution_id: string
  type:           AttendanceType
  recorded_at:    string
  synced_at:      string
}

export interface Student {
  id:             string
  institution_id: string
  name:           string
  grade:          string
  section:        string | null
  photo_url:      string | null
  guardian_name:  string | null
  guardian_phone: string | null
  qr_token:       string
  qr_expires_at:  string
  active:         boolean
}

export interface Device {
  id:                 string
  institution_id:     string
  name:               string
  location:           string | null
  device_token:       string
  last_seen_at:       string | null
  pending_sync_count: number
  active:             boolean
}