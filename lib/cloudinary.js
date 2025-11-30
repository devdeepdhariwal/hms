// lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} folder - Folder name in Cloudinary (e.g., 'patients', 'staff')
 * @returns {Promise<Object>} - Upload result with secure_url
 */
export async function uploadToCloudinary(fileBuffer, folder = 'patients') {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `hospital-management/${folder}`,
          transformation: [
            { width: 500, height: 500, crop: 'limit' }, // Limit max dimensions
            { quality: 'auto' }, // Auto optimize quality
            { fetch_format: 'auto' }, // Auto format (webp if supported)
          ],
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          max_file_size: 2000000, // 2MB max
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export function getPublicIdFromUrl(url) {
  if (!url) return null;
  
  // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/hospital-management/patients/abc123.jpg
  const matches = url.match(/\/([^\/]+)\.[a-z]+$/);
  if (matches && matches[1]) {
    // Get the full path including folder
    const pathMatch = url.match(/hospital-management\/[^\/]+\/[^\/]+/);
    return pathMatch ? pathMatch[0] : matches[1];
  }
  return null;
}

export default cloudinary;
