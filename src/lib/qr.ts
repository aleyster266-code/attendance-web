import { SignJWT, jwtVerify } from 'jose'
import QRCode from 'qrcode'

// Token de 1 año — el carnet impreso dura todo el año escolar
const QR_EXPIRY  = '365d'
const getSecret  = () => new TextEncoder().encode(process.env.QR_SECRET!)

/**
 * Genera un token JWT firmado para el QR del alumno.
 * Llamar al crear o importar alumnos.
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
    return null
  }
}

/**
 * Genera un SVG del QR directamente en el servidor.
 * Sin browser, sin canvas, sin duplicados.
 * Soporta 1000 alumnos en < 1 segundo.
 */
export async function generateQRSvg(token: string, size = 120): Promise<string> {
  const svg = await QRCode.toString(token, {
    type:          'svg',
    width:         size,
    margin:        1,
    color: {
      dark:  '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })
  return svg
}
