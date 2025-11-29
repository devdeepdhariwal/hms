// lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOtpEmail(to, code) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your MediCare HMS verification code',
    html: `
      <h2 style="color:#111;">Email Verification</h2>
      <p style="color:#222;font-size:14px;">
        Use the following verification code to complete your hospital registration:
      </p>
      <p style="font-size:24px;font-weight:bold;color:#111;letter-spacing:4px;">${code}</p>
      <p style="color:#444;font-size:12px;">
        This code will expire in 10 minutes.
      </p>
    `,
  });
}

export async function sendWelcomeEmail(to, { firstName, lastName, username, tempPassword }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Welcome to MediCare HMS',
    html: `
      <h2 style="color:#111;">Welcome to MediCare HMS</h2>
      <p style="color:#222;font-size:14px;">
        Hello <strong>${firstName} ${lastName}</strong>,
      </p>
      <p style="color:#222;font-size:14px;">
        Your account has been created. Please use the credentials below to log in:
      </p>
      <p style="color:#222;font-size:14px;">
        <strong>Username:</strong> ${username}<br/>
        <strong>Temporary Password:</strong> <span style="font-family:monospace;color:#d9534f;">${tempPassword}</span>
      </p>
      <p style="color:#444;font-size:12px;">
        You will be required to change your password on first login.
      </p>
    `,
  });
}

export async function sendPasswordResetEmail(to, token) {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Reset your MediCare HMS password',
    html: `
      <h2 style="color:#111;">Password Reset Request</h2>
      <p style="color:#222;font-size:14px;">
        Click the link below to reset your password:
      </p>
      <p>
        <a href="${resetLink}" style="color:#007bff;font-weight:bold;">Reset Password</a>
      </p>
      <p style="color:#444;font-size:12px;">
        This link will expire in 1 hour. If you did not request this, ignore this email.
      </p>
    `,
  });
}

export async function sendHospitalActivationEmail(to, { hospitalName, adminName, username, loginUrl }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your hospital has been approved - MediCare HMS',
    html: `
      <h2 style="color:#111;">Congratulations!</h2>
      <p style="color:#222;font-size:14px;">
        Hello <strong>${adminName}</strong>,
      </p>
      <p style="color:#222;font-size:14px;">
        Great news! Your hospital <strong>${hospitalName}</strong> has been successfully verified and approved by our Super Admin.
      </p>
      <p style="color:#222;font-size:14px;">
        You can now log in using the credentials you created during registration:
      </p>
      <p style="color:#222;font-size:14px;">
        <strong>Username:</strong> <span style="font-family:monospace;color:#111;">${username}</span>
      </p>
      <p>
        <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#28a745;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Login to Dashboard</a>
      </p>
      <p style="color:#444;font-size:12px;margin-top:20px;">
        Welcome to MediCare HMS!
      </p>
    `,
  });
}


export async function sendHospitalSuspendedEmail(to, { hospitalName, adminName, reason }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your hospital has been suspended - MediCare HMS',
    html: `
      <h2 style="color:#ff9800;">Hospital Suspended</h2>
      <p style="color:#222;font-size:14px;">
        Hello <strong>${adminName}</strong>,
      </p>
      <p style="color:#222;font-size:14px;">
        Your hospital <strong>${hospitalName}</strong> has been temporarily suspended.
      </p>
      ${reason ? `<p style="color:#222;font-size:14px;"><strong>Reason:</strong> ${reason}</p>` : ''}
      <p style="color:#444;font-size:12px;margin-top:20px;">
        Please contact support for more information.
      </p>
    `,
  });
}

export async function sendHospitalInactivatedEmail(to, { hospitalName, adminName, reason }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your hospital has been deactivated - MediCare HMS',
    html: `
      <h2 style="color:#d9534f;">Hospital Deactivated</h2>
      <p style="color:#222;font-size:14px;">
        Hello <strong>${adminName}</strong>,
      </p>
      <p style="color:#222;font-size:14px;">
        Your hospital <strong>${hospitalName}</strong> has been deactivated by the Super Admin.
      </p>
      ${reason ? `<p style="color:#222;font-size:14px;"><strong>Reason:</strong> ${reason}</p>` : ''}
      <p style="color:#444;font-size:12px;margin-top:20px;">
        Please contact support for assistance.
      </p>
    `,
  });
}

export async function sendHospitalReactivatedEmail(to, { hospitalName, adminName, loginUrl }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your hospital has been reactivated - MediCare HMS',
    html: `
      <h2 style="color:#28a745;">Hospital Reactivated</h2>
      <p style="color:#222;font-size:14px;">
        Hello <strong>${adminName}</strong>,
      </p>
      <p style="color:#222;font-size:14px;">
        Good news! Your hospital <strong>${hospitalName}</strong> has been reactivated.
      </p>
      <p style="color:#222;font-size:14px;">
        You can now log in and resume using the platform.
      </p>
      <p>
        <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#28a745;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Login to Dashboard</a>
      </p>
    `,
  });
}
