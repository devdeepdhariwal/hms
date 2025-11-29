// app/api/send-otp/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiResponse, handleApiError } from '@/lib/utils';
import { sendOtpEmail } from '@/lib/email';

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(req) {
  try {
    console.log('HIT /api/send-otp');

    const body = await req.json();
    console.log('BODY:', body);

    const { adminEmail, purpose = 'HOSPITAL_REGISTRATION' } = body;

    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json(
        ApiResponse.error('Valid admin email is required', 400),
        { status: 400 }
      );
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    console.log('OTP:', code);

    const updated = await prisma.emailOtp.updateMany({
      where: { email: adminEmail, purpose, isUsed: false },
      data: { isUsed: true },
    });
    console.log('updateMany result:', updated);

    const created = await prisma.emailOtp.create({
      data: { email: adminEmail, code, purpose, expiresAt },
    });
    console.log('created otp row:', created);

    await sendOtpEmail(adminEmail, code);
    console.log('email sent');

    return NextResponse.json(
      ApiResponse.success(null, 'Verification code sent'),
      { status: 200 }
    );
  } catch (error) {
    console.error('SEND-OTP ERROR:', error);
    return NextResponse.json(
      handleApiError(error, 'Failed to send OTP'),
      { status: 500 }
    );
  }
}
