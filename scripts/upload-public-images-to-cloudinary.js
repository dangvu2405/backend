/**
 * Script to upload all images from frontend/public to Cloudinary
 * and update product database with new Public IDs
 * 
 * Usage: node scripts/upload-public-images-to-cloudinary.js
 * 
 * Requires:
 * - CLOUDINARY_URL environment variable
 * - MongoDB connection
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import models
const SanPham = require('../src/app/models/SanPham');

// Configure Cloudinary
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (!cloudinaryUrl) {
  console.error('❌ CLOUDINARY_URL environment variable is required!');
  process.exit(1);
}

cloudinary.config({
  cloudinary_url: cloudinaryUrl
});

// Extract cloud name
const cloudNameMatch = cloudinaryUrl.match(/@([^:]+)/);
const cloudName = cloudNameMatch ? cloudNameMatch[1] : 'unknown';

console.log('🔍 Starting image upload to Cloudinary...');
console.log(`📦 Cloud Name: ${cloudName}\n`);

// Path to frontend/public
const publicDir = path.join(__dirname, '../../frontend/public');

/**
 * Upload single image to Cloudinary
 */
async function uploadImage(filePath, filename) {
  try {
    // Remove extension for public_id
    const publicId = path.basename(filename, path.extname(filename));
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'products',
      public_id: publicId,
      overwrite: false, // Don't overwrite if exists
      resource_type: 'image'
    });

    return {
      success: true,
      filename: filename,
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    if (error.http_code === 409) {
      // Image already exists
      const publicId = `products/${path.basename(filename, path.extname(filename))}`;
      return {
        success: true,
        filename: filename,
        public_id: publicId,
        url: `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}${path.extname(filename)}`,
        already_exists: true
      };
    }
    throw error;
  }
}

/**
 * Update product database with Cloudinary Public ID
 */
async function updateProductImages(uploadedImages) {
  try {
    console.log('\n📊 Updating product database...\n');
    
    // Create a map: filename -> public_id
    const imageMap = new Map();
    uploadedImages.forEach(img => {
      // Map both with and without extension
      const nameWithoutExt = path.basename(img.filename, path.extname(img.filename));
      imageMap.set(img.filename, img.public_id);
      imageMap.set(nameWithoutExt, img.public_id);
    });

    // Find all products
    const products = await SanPham.find({});
    console.log(`Found ${products.length} products in database\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const product of products) {
      let updated = false;
      const updates = {};

      // Update HinhAnhChinh (main image)
      if (product.HinhAnhChinh) {
        const imageName = product.HinhAnhChinh.replace(/^\/+/, ''); // Remove leading slash
        const imageNameWithoutExt = path.basename(imageName, path.extname(imageName));
        
        // Try to find matching image
        let publicId = imageMap.get(imageName) || imageMap.get(imageNameWithoutExt);
        
        if (!publicId) {
          // Try without extension
          for (const [filename, pid] of imageMap.entries()) {
            if (filename.includes(imageNameWithoutExt) || imageNameWithoutExt.includes(filename)) {
              publicId = pid;
              break;
            }
          }
        }

        if (publicId) {
          updates.HinhAnhChinh = publicId;
          updated = true;
        } else {
          console.log(`⚠️  Image not found for product ${product.TenSanPham}: ${product.HinhAnhChinh}`);
          notFoundCount++;
        }
      }

      // Update HinhAnhPhu (additional images)
      if (product.HinhAnhPhu && product.HinhAnhPhu.length > 0) {
        const updatedImages = [];
        for (const imagePath of product.HinhAnhPhu) {
          const imageName = imagePath.replace(/^\/+/, '');
          const imageNameWithoutExt = path.basename(imageName, path.extname(imageName));
          
          let publicId = imageMap.get(imageName) || imageMap.get(imageNameWithoutExt);
          
          if (!publicId) {
            for (const [filename, pid] of imageMap.entries()) {
              if (filename.includes(imageNameWithoutExt) || imageNameWithoutExt.includes(filename)) {
                publicId = pid;
                break;
              }
            }
          }

          if (publicId) {
            updatedImages.push(publicId);
            updated = true;
          } else {
            console.log(`⚠️  Additional image not found: ${imagePath}`);
          }
        }
        
        if (updatedImages.length > 0) {
          updates.HinhAnhPhu = updatedImages;
        }
      }

      // Update product if found matches
      if (updated && Object.keys(updates).length > 0) {
        await SanPham.findByIdAndUpdate(product._id, { $set: updates });
        updatedCount++;
        console.log(`✅ Updated: ${product.TenSanPham}`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} products`);
    console.log(`⚠️  ${notFoundCount} products with images not found in upload list`);
    
  } catch (error) {
    console.error('❌ Error updating products:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is required!');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all image files from public directory
    const files = fs.readdirSync(publicDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      })
      .filter(file => file !== 'logo.jpg' && file !== 'coco.jpg'); // Skip logo files

    console.log(`📁 Found ${files.length} image files to upload\n`);

    if (files.length === 0) {
      console.log('⚠️  No images found in public directory');
      process.exit(0);
    }

    // Upload images
    const uploadedImages = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(publicDir, file);
      
      try {
        console.log(`[${i + 1}/${files.length}] Uploading: ${file}...`);
        const result = await uploadImage(filePath, file);
        uploadedImages.push(result);
        successCount++;
        
        if (result.already_exists) {
          console.log(`   ✅ Already exists: ${result.public_id}`);
        } else {
          console.log(`   ✅ Uploaded: ${result.public_id} (${(result.bytes / 1024).toFixed(2)} KB)`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error uploading ${file}:`, error.message);
      }
    }

    console.log(`\n📊 Upload Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total: ${uploadedImages.length} images\n`);

    // Save upload results to JSON
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'uploaded-images.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      total: uploadedImages.length,
      cloud_name: cloudName,
      uploaded_at: new Date().toISOString(),
      images: uploadedImages
    }, null, 2));

    console.log(`💾 Upload results saved to: ${jsonPath}\n`);

    // Update product database
    if (uploadedImages.length > 0) {
      await updateProductImages(uploadedImages);
    }

    console.log('\n✅ All done!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check Cloudinary Dashboard to verify uploads');
    console.log('   2. Test frontend to see if images load correctly');
    console.log('   3. Check database to verify product image updates');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run
main();

