import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

const FROM_EMAIL = 'Obra Tracker <obratracking@cheto.club>'; 

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}) {
  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY no configurada. Email simulado:', { to, subject });
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: text || '',
      html: html || text || '',
    });

    if (error) {
      console.error('❌ Error enviando email via Resend:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inesperado enviando email:', error);
    return { success: false, error };
  }
}

/**
 * Enviar invitación a proyecto
 */
export async function sendProjectInvitationEmail(
  email: string, 
  projectName: string, 
  invitationToken: string
) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const inviteUrl = `${baseUrl}/invitations/${invitationToken}`;
  
  return sendEmail({
    to: email,
    subject: `Invitación a colaborar en ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">¡Hola!</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Has sido invitado a unirte al proyecto <strong>${projectName}</strong> en Obra Tracker.
        </p>
        <div style="margin: 30px 0;">
          <a href="${inviteUrl}" 
             style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Aceptar Invitación
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Si no esperabas esta invitación, puedes ignorar este correo.
        </p>
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Obra Tracker - Industrial Precision Engineering
        </p>
      </div>
    `
  });
}

/**
 * Enviar correo de recuperación de contraseña
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Restablecer tu contraseña - Obra Tracker',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Restablecer tu contraseña</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Has solicitado restablecer tu contraseña en Obra Tracker. Haz clic en el siguiente botón para continuar:
        </p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Obra Tracker - Industrial Precision Engineering
        </p>
      </div>
    `
  });
}
