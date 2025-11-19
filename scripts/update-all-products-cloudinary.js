/**
 * Script to update ALL products in database to use Cloudinary Public IDs
 * Maps local image paths to Cloudinary Public IDs from uploaded images
 * 
 * Usage: node scripts/update-all-products-cloudinary.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import models
const SanPham = require('../src/app/models/SanPham');

// MongoDB URI
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 
  "mongodb+srv://dangvu123:dangvu123@dangvu.lz9hp1j.mongodb.net/PerfumeShop?retryWrites=true&w=majority";

console.log('🔍 Starting product image update to Cloudinary...\n');

/**
 * Create image mapping from uploaded images JSON
 */
function createImageMapping() {
  const jsonPath = path.join(__dirname, '..', 'output', 'uploaded-images.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️  uploaded-images.json not found. Run upload script first.');
    return new Map();
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const imageMap = new Map();

  data.images.forEach(img => {
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

  console.log(`✅ Created mapping for ${imageMap.size} image variations\n`);
  return imageMap;
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

  // Try partial match
  for (const [key, publicId] of imageMap.entries()) {
    const keyWithoutExt = key.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    if (keyWithoutExt === filenameWithoutExt || 
        filenameWithoutExt.includes(keyWithoutExt) || 
        keyWithoutExt.includes(filenameWithoutExt)) {
      return publicId;
    }
  }

  return null;
}

/**
 * Update all products
 */
async function updateAllProducts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Create image mapping
    const imageMap = createImageMapping();
    
    if (imageMap.size === 0) {
      console.log('❌ No image mapping available. Please upload images first.');
      return;
    }

    // Get all products
    const products = await SanPham.find({});
    console.log(`📊 Found ${products.length} products\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found in database');
      console.log('💡 Seed products first or check database connection');
      return;
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    const updateResults = [];

    for (const product of products) {
      try {
        const updates = {};
        let hasUpdates = false;

        // Update HinhAnhChinh
        if (product.HinhAnhChinh) {
          // Skip if already Cloudinary Public ID (no leading slash, no http)
          if (!product.HinhAnhChinh.startsWith('http') && !product.HinhAnhChinh.startsWith('/')) {
            // Already a Public ID, skip
            continue;
          }

          const publicId = findCloudinaryPublicId(product.HinhAnhChinh, imageMap);
          
          if (publicId) {
            updates.HinhAnhChinh = publicId;
            hasUpdates = true;
          } else {
            console.log(`⚠️  Image not found: ${product.HinhAnhChinh} (Product: ${product.TenSanPham || product._id})`);
            notFoundCount++;
          }
        }

        // Update HinhAnhPhu
        if (product.HinhAnhPhu && product.HinhAnhPhu.length > 0) {
          const updatedImages = [];
          let allFound = true;

          for (const imagePath of product.HinhAnhPhu) {
            // Skip if already Cloudinary Public ID
            if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
              updatedImages.push(imagePath); // Keep existing Public ID
              continue;
            }

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
          
          updateResults.push({
            productId: product._id.toString(),
            productName: product.TenSanPham || 'N/A',
            oldHinhAnhChinh: product.HinhAnhChinh,
            newHinhAnhChinh: updates.HinhAnhChinh || product.HinhAnhChinh,
            oldHinhAnhPhu: product.HinhAnhPhu,
            newHinhAnhPhu: updates.HinhAnhPhu || product.HinhAnhPhu
          });
          
          console.log(`✅ Updated: ${product.TenSanPham || product._id}`);
        }

      } catch (error) {
        console.error(`❌ Error updating product ${product._id}:`, error.message);
      }
    }

    // Save results
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'product-updates.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      total: products.length,
      updated: updatedCount,
      notFound: notFoundCount,
      updated_at: new Date().toISOString(),
      results: updateResults
    }, null, 2));

    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} products`);
    console.log(`   ⚠️  Not found: ${notFoundCount} products`);
    console.log(`   📦 Total: ${products.length} products\n`);
    console.log(`💾 Results saved to: ${jsonPath}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run
updateAllProducts();

