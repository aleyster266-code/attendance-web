const WA_BASE = 'https://graph.facebook.com/v19.0'

interface NotifPayload {
  phone:       string
  studentName: string
  type:        'entry' | 'exit'
  timestamp:   string
}

export async function sendWhatsAppNotification(p: NotifPayload): Promise<void> {
  const phoneId = process.env.WA_PHONE_ID
  const token   = process.env.WA_TOKEN

  if (!phoneId || !token) {
    console.warn('[WhatsApp] Credenciales no configuradas en .env.local')
    return
  }

  const hora = new Date(p.timestamp).toLocaleTimeString('es-PY', {
    timeZone: 'America/Asuncion',
    hour: '2-digit',
    minute: '2-digit',
  })

  const message = p.type === 'entry'
    ? `Hola! ${p.studentName} ingresó al colegio a las ${hora}.`
    : `Hola! ${p.studentName} salió del colegio a las ${hora}.`

  const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to:   p.phone.replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    console.error('[WhatsApp] API error:', error)
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }
}