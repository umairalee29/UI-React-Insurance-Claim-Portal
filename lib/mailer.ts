import nodemailer from 'nodemailer'

function createTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER

  if (!host || !user) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    })
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransport()

  const info = await transporter.sendMail({
    from: `"ClaimFlow" <${process.env.SMTP_USER || 'noreply@claimflow.dev'}>`,
    to,
    subject,
    html,
  })

  if (!process.env.SMTP_HOST) {
    console.log('[Mailer] Email sent (console transport):')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Message ID: ${info.messageId}`)
  }
}

export function claimStatusEmail(claimNumber: string, status: string, note: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f2d5c;">Claim Status Update — ClaimFlow</h2>
      <p>Your claim <strong>${claimNumber}</strong> has been updated.</p>
      <p><strong>New Status:</strong> <span style="text-transform: capitalize;">${status.replace('_', ' ')}</span></p>
      ${note ? `<p><strong>Note from adjuster:</strong> ${note}</p>` : ''}
      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/claims" style="background: #0f2d5c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
          View Claim
        </a>
      </p>
    </div>
  `
}

export function welcomeEmail(name: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f2d5c;">Welcome to ClaimFlow, ${name}!</h2>
      <p>Your account has been created successfully. You can now log in and file insurance claims.</p>
      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/login" style="background: #0f2d5c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
          Log In
        </a>
      </p>
    </div>
  `
}
