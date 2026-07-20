import { Resend } from 'resend'

let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(email: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    const from = email.from || process.env.RESEND_FROM_EMAIL || 'noreply@tara.com'

    const { data, error } = await getResendClient().emails.send({
      from,
      to: email.to,
      subject: email.subject,
      html: email.html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TARA</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">TARA</h1>
          <p style="color: #666; margin: 5px 0 0;">Tours • Travels • Rentals • Adventures</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1e293b;">Welcome to TARA, ${firstName}!</h2>
          <p style="color: #475569;">
            Thank you for joining our community of travel enthusiasts. We're excited to have you on board!
          </p>
          <p style="color: #475569;">
            Whether you're looking to discover amazing experiences or share your own travel services with the world, TARA is here to help.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Explore TARA
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">If you have any questions, feel free to reach out to our support team.</p>
          <p style="margin: 5px 0;">Email: support@tara.com</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Welcome to TARA!',
    html,
  })
}

export async function sendEmailVerificationEmail(email: string, verificationUrl: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">TARA</h1>
          <p style="color: #666; margin: 5px 0 0;">Tours • Travels • Rentals • Adventures</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1e293b;">Verify Your Email Address</h2>
          <p style="color: #475569;">
            Please verify your email address to complete your TARA account setup.
          </p>
          <p style="color: #475569;">
            Click the button below to verify your email:
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
        </p>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">This link will expire in 24 hours.</p>
          <p style="margin: 5px 0;">If you didn't create a TARA account, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Verify Your TARA Email Address',
    html,
  })
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">TARA</h1>
          <p style="color: #666; margin: 5px 0 0;">Tours • Travels • Rentals • Adventures</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1e293b;">Reset Your Password</h2>
          <p style="color: #475569;">
            We received a request to reset your password for your TARA account.
          </p>
          <p style="color: #475569;">
            Click the button below to reset your password:
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">This link will expire in 24 hours.</p>
          <p style="margin: 5px 0;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Reset Your TARA Password',
    html,
  })
}

export async function sendKYCVerificationEmail(email: string, status: 'approved' | 'rejected' | 'manual_review'): Promise<void> {
  const statusText = {
    approved: 'Approved',
    rejected: 'Rejected',
    manual_review: 'Under Manual Review',
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Verification Status</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">TARA</h1>
          <p style="color: #666; margin: 5px 0 0;">Tours • Travels • Rentals • Adventures</p>
        </div>
        
        <div style="background: ${status === 'approved' ? '#dcfce7' : status === 'rejected' ? '#fee2e2' : '#fef3c7'}; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1e293b;">KYC Verification ${statusText[status]}</h2>
          <p style="color: #475569;">
            ${status === 'approved' 
              ? 'Congratulations! Your business has been successfully verified. You now have access to all platform features.'
              : status === 'rejected'
              ? 'Unfortunately, your KYC verification was rejected. Please review the feedback and try again with updated documents.'
              : 'Your KYC verification is currently under manual review. Our team will review your documents within 1-2 business days.'}
          </p>
        </div>
        
        ${status === 'approved' ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vendor/dashboard" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        ` : ''}
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">If you have any questions, please contact our support team.</p>
          <p style="margin: 5px 0;">Email: support@tara.com</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: `KYC Verification ${statusText[status]}`,
    html,
  })
}

export async function sendSupportTicketEmail(email: string, ticketNumber: string, subject: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support Ticket Created</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">TARA</h1>
          <p style="color: #666; margin: 5px 0 0;">Tours • Travels • Rentals • Adventures</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1e293b;">Support Ticket Created</h2>
          <p style="color: #475569;">
            Your support ticket has been successfully created.
          </p>
          <p style="color: #475569;">
            <strong>Ticket Number:</strong> ${ticketNumber}<br>
            <strong>Subject:</strong> ${subject}
          </p>
        </div>
        
        <p style="color: #475569;">
          Our support team will review your ticket and respond within 24 hours. You can track the status of your ticket in your dashboard.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/support/tickets" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Your Tickets
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">For urgent issues, please contact us directly at support@tara.com</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: `Support Ticket ${ticketNumber} Created`,
    html,
  })
}

export async function sendSubscriptionReminderEmail(email: string, plan: string, expiryDate: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Expiring Soon</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">TARA</h1>
          <p style="color: #666; margin: 5px 0 0;">Tours • Travels • Rentals • Adventures</p>
        </div>
        
        <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1e293b;">Subscription Expiring Soon</h2>
          <p style="color: #475569;">
            Your ${plan} subscription will expire on ${expiryDate}.
          </p>
          <p style="color: #475569;">
            To continue enjoying all the benefits of your subscription, please renew before the expiration date.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vendor/settings" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Renew Subscription
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">If you have any questions about your subscription, please contact our support team.</p>
          <p style="margin: 5px 0;">Email: support@tara.com</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Your TARA Subscription is Expiring Soon',
    html,
  })
}
