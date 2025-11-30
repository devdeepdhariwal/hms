// app/api/upload/route.js
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { ApiResponse } from '@/lib/utils';

export async function POST(req) {
  try {
    // Authenticate user
    const auth = await authenticate(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        ApiResponse.error(auth.error, auth.status),
        { status: auth.status }
      );
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'patients'; // patients, staff, documents, etc.

    if (!file) {
      return NextResponse.json(
        ApiResponse.error('No file provided', 400),
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        ApiResponse.error('Invalid file type. Only JPG, PNG, and WebP are allowed.', 400),
        { status: 400 }
      );
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        ApiResponse.error('File size exceeds 2MB limit', 400),
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, folder);

    return NextResponse.json(
      ApiResponse.success(
        {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
        },
        'Image uploaded successfully'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      ApiResponse.error(error.message || 'Failed to upload image', 500),
      { status: 500 }
    );
  }
}

// Optional: GET route to check upload status or configuration
export async function GET(req) {
  try {
    const auth = await authenticate(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        ApiResponse.error(auth.error, auth.status),
        { status: auth.status }
      );
    }

    return NextResponse.json(
      ApiResponse.success(
        {
          maxFileSize: '2MB',
          allowedFormats: ['JPG', 'PNG', 'WebP'],
          cloudinaryConfigured: !!(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
          ),
        },
        'Upload configuration retrieved'
      )
    );
  } catch (error) {
    return NextResponse.json(
      ApiResponse.error('Failed to get upload configuration', 500),
      { status: 500 }
    );
  }
}
