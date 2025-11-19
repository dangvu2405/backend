/**
 * Script to update all product images (HinhAnhChinh and HinhAnhPhu) 
 * to use Cloudinary Public IDs instead of local paths
 * 
 * Usage: node scripts/update-products-to-cloudinary.js
 * 
 * Requires:
 * - CLOUDINARY_URL environment variable
 * - MongoDB connection
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

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

console.log('🔍 Starting product image update to Cloudinary...');
console.log(`📦 Cloud Name: ${cloudName}\n`);

// MongoDB URI
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 
  "mongodb+srv://dangvu123:dangvu123@dangvu.lz9hp1j.mongodb.net/PerfumeShop?retryWrites=true&w=majority";

/**
 * Get all images from Cloudinary to create mapping
 */
async function getCloudinaryImages() {
  try {
    console.log('📥 Fetching images from Cloudinary...\n');
    
    let allImages = [];
    let nextCursor = null;
    let page = 1;

    do {
      const result = await cloudinary.search
        .expression('resource_type:image AND folder:products')
        .max_results(500)
        .next_cursor(nextCursor)
        .execute();
      
      allImages = allImages.concat(result.resources);
      nextCursor = result.next_cursor;
      page++;
      
      console.log(`   📄 Page ${page - 1}: ${result.resources.length} images`);
      
    } while (nextCursor);

    console.log(`\n✅ Found ${allImages.length} images in Cloudinary\n`);

    // Create mapping: filename -> public_id
    const imageMap = new Map();
    
    allImages.forEach(img => {
      // Extract filename from public_id (remove 'products/' prefix)
      const publicId = img.public_id;
      const filename = publicId.replace(/^products\//, '');
      
      // Map with and without extension
      imageMap.set(filename, publicId);
      imageMap.set(filename.replace(/\.(jpg|jpeg|png|webp)$/i, ''), publicId);
      
      // Also map with .jpg extension
      if (!filename.endsWith('.jpg') && !filename.endsWith('.jpeg') && 
          !filename.endsWith('.png') && !filename.endsWith('.webp')) {
        imageMap.set(`${filename}.jpg`, publicId);
      }
    });

    return imageMap;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary images:', error);
    throw error;
  }
}

/**
 * Find matching Cloudinary Public ID for a local image path
 */
function findCloudinaryPublicId(localPath, imageMap) {
  if (!localPath) return null;

  // Remove leading slash and normalize
  let cleanPath = localPath.replace(/^\/+/, '');
  const filename = path.basename(cleanPath);
  const filenameWithoutExt = path.basename(cleanPath, path.extname(cleanPath));

  // Try exact match first
  if (imageMap.has(filename)) {
    return imageMap.get(filename);
  }

  // Try without extension
  if (imageMap.has(filenameWithoutExt)) {
    return imageMap.get(filenameWithoutExt);
  }

  // Try with .jpg extension
  if (imageMap.has(`${filenameWithoutExt}.jpg`)) {
    return imageMap.get(`${filenameWithoutExt}.jpg`);
  }

  // Try partial match (filename contains or is contained)
  for (const [key, publicId] of imageMap.entries()) {
    if (key.includes(filenameWithoutExt) || filenameWithoutExt.includes(key)) {
      return publicId;
    }
  }

  return null;
}

/**
 * Update products with Cloudinary Public IDs
 */
async function updateProducts(imageMap) {
  try {
    console.log('📊 Updating products in database...\n');

    // Get all products
    const products = await SanPham.find({}).lean();
    console.log(`Found ${products.length} products\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found in database');
      return { updated: 0, notFound: 0, errors: 0 };
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    const updateResults = [];

    for (const product of products) {
      try {
        const updates = {};
        let hasUpdates = false;

        // Update HinhAnhChinh
        if (product.HinhAnhChinh) {
          const publicId = findCloudinaryPublicId(product.HinhAnhChinh, imageMap);
          
          if (publicId) {
            updates.HinhAnhChinh = publicId;
            hasUpdates = true;
          } else {
            console.log(`⚠️  Image not found for ${product.TenSanPham}: ${product.HinhAnhChinh}`);
            notFoundCount++;
          }
        }

        // Update HinhAnhPhu
        if (product.HinhAnhPhu && product.HinhAnhPhu.length > 0) {
          const updatedImages = [];
          let allFound = true;

          for (const imagePath of product.HinhAnhPhu) {
            const publicId = findCloudinaryPublicId(imagePath, imageMap);
            
            if (publicId) {
              updatedImages.push(publicId);
            } else {
              console.log(`⚠️  Additional image not found: ${imagePath}`);
              allFound = false;
            }
          }

          if (updatedImages.length > 0) {
            updates.HinhAnhPhu = updatedImages;
            hasUpdates = true;
            
            if (!allFound) {
              notFoundCount++;
            }
          }
        }

        // Update product if found matches
        if (hasUpdates && Object.keys(updates).length > 0) {
          await SanPham.findByIdAndUpdate(product._id, { $set: updates });
          updatedCount++;
          
          const result = {
            productId: product._id.toString(),
            productName: product.TenSanPham || 'N/A',
            oldHinhAnhChinh: product.HinhAnhChinh,
            newHinhAnhChinh: updates.HinhAnhChinh || product.HinhAnhChinh,
            oldHinhAnhPhu: product.HinhAnhPhu,
            newHinhAnhPhu: updates.HinhAnhPhu || product.HinhAnhPhu
          };
          
          updateResults.push(result);
          console.log(`✅ Updated: ${product.TenSanPham || product._id}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating product ${product._id}:`, error.message);
      }
    }

    // Save update results
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'product-updates.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      total: products.length,
      updated: updatedCount,
      notFound: notFoundCount,
      errors: errorCount,
      updated_at: new Date().toISOString(),
      results: updateResults
    }, null, 2));

    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} products`);
    console.log(`   ⚠️  Not found: ${notFoundCount} products`);
    console.log(`   ❌ Errors: ${errorCount} products`);
    console.log(`   📦 Total: ${products.length} products\n`);
    console.log(`💾 Update results saved to: ${jsonPath}\n`);

    return { updated: updatedCount, notFound: notFoundCount, errors: errorCount };

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
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get Cloudinary images mapping
    const imageMap = await getCloudinaryImages();

    // Update products
    await updateProducts(imageMap);

    console.log('✅ All done!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check update results in backend/output/product-updates.json');
    console.log('   2. Test frontend to verify images load from Cloudinary');
    console.log('   3. Check database to confirm updates');

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

