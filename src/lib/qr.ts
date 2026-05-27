import { SignJWT, jwtVerify } from 'jose'

const QR_EXPIRY  = '7d'
const getSecret  = () => new TextEncoder().encode(process.env.QR_SECRET!)

/**
 * Genera un token JWT firmado que se convierte en QR code.
 * Llamarlo al crear un alumno y para renovar QR expirados.
 */
export async function generateStudentQR(
  studentId:     string,
  institutionId: string
): Promise<string> {
  return new SignJWT({
    sub:            studentId,
    institution_id: institutionId,
    type:           'student_qr',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(QR_EXPIRY)
    .sign(getSecret())
}

/**
 * Verifica un token QR. Retorna null si expiró o es inválido.
 * También se usa en el dispositivo tablet (con la misma clave).
 */
export async function verifyStudentQR(token: string): Promise<{
  studentId:     string
  institutionId: string
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== 'student_qr' || !payload.sub) return null
    return {
      studentId:     payload.sub,
      institutionId: payload.institution_id as string,
    }
  } catch {
    return null // Token expirado o firma inválida
  }
}