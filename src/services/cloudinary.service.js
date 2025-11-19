/**
 * Cloudinary Service
 * Handles image uploads to Cloudinary CDN
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary from CLOUDINARY_URL environment variable
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  try {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl
    });
    console.log('✅ Cloudinary configured successfully');
  } catch (error) {
    console.error('❌ Error configuring Cloudinary:', error.message);
  }
} else {
  console.warn('⚠️  CLOUDINARY_URL not set, Cloudinary uploads will be disabled');
}

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadToCloudinary(filePath, options = {}) {
  if (!cloudinaryUrl) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_URL environment variable.');
  }

  try {
    const uploadOptions = {
      folder: options.folder || 'uploads', // Folder in Cloudinary
      resource_type: 'image',
      ...options
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    // Delete local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

/**
 * Upload image from buffer (for multer memory storage)
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadFromBuffer(buffer, options = {}) {
  if (!cloudinaryUrl) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_URL environment variable.');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'uploads',
      resource_type: 'image',
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          return reject(error);
        }
        resolve({
          success: true,
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        });
      }
    ).end(buffer);
  });
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteFromCloudinary(publicId) {
  if (!cloudinaryUrl) {
    throw new Error('Cloudinary is not configured.');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Get optimized Cloudinary URL from public ID
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Image transformations
 * @returns {string} Optimized URL
 */
function getCloudinaryUrl(publicId, transformations = {}) {
  if (!cloudinaryUrl || !publicId) {
    return null;
  }

  // Extract cloud name from CLOUDINARY_URL
  const cloudNameMatch = cloudinaryUrl.match(/@([^:]+)/);
  const cloudName = cloudNameMatch ? cloudNameMatch[1] : null;

  if (!cloudName) {
    return null;
  }

  const transformParams = [];
  if (transformations.width) transformParams.push(`w_${transformations.width}`);
  if (transformations.height) transformParams.push(`h_${transformations.height}`);
  if (transformations.quality) transformParams.push(`q_${transformations.quality}`);
  if (transformations.crop) transformParams.push(transformations.crop);
  if (transformations.format) transformParams.push(`f_${transformations.format}`);

  const transformString = transformParams.length > 0 
    ? `/${transformParams.join(',')}` 
    : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload${transformString}/${publicId}`;
}

/**
 * Check if Cloudinary is configured
 * @returns {boolean}
 */
function isCloudinaryConfigured() {
  return !!cloudinaryUrl;
}

module.exports = {
  uploadToCloudinary,
  uploadFromBuffer,
  deleteFromCloudinary,
  getCloudinaryUrl,
  isCloudinaryConfigured
};

