/**
 * Script to seed products with Cloudinary image Public IDs
 * This will create sample products using the uploaded Cloudinary images
 * 
 * Usage: node scripts/seed-products-with-cloudinary.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const SanPham = require('../src/app/models/SanPham');
const LoaiSanPham = require('../src/app/models/LoaiSanPham');

const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (cloudinaryUrl) {
  cloudinary.config({ cloudinary_url: cloudinaryUrl });
}

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 
  "mongodb+srv://dangvu123:dangvu123@dangvu.lz9hp1j.mongodb.net/PerfumeShop?retryWrites=true&w=majority";

/**
 * Get random Cloudinary images
 */
async function getRandomCloudinaryImages(count = 10) {
  try {
    const result = await cloudinary.search
      .expression('resource_type:image AND folder:products')
      .max_results(133)
      .execute();
    
    // Shuffle and return random images
    const shuffled = result.resources.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(img => img.public_id);
  } catch (error) {
    console.error('Error fetching Cloudinary images:', error);
    return [];
  }
}

/**
 * Seed products
 */
async function seedProducts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check if products already exist
    const existingCount = await SanPham.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing products`);
      console.log('💡 Run update script instead: npm run cloudinary:update-products\n');
      return;
    }

    // Get categories
    const categories = await LoaiSanPham.find({}).limit(5);
    if (categories.length === 0) {
      console.log('⚠️  No categories found. Please seed categories first.');
      return;
    }

    console.log('📥 Fetching Cloudinary images...');
    const imageIds = await getRandomCloudinaryImages(50);
    console.log(`✅ Found ${imageIds.length} images\n`);

    if (imageIds.length === 0) {
      console.log('⚠️  No images found in Cloudinary');
      return;
    }

    // Sample product data
    const productNames = [
      'Nước Hoa Chanel No.5', 'Nước Hoa Dior Sauvage', 'Nước Hoa Versace Eros',
      'Nước Hoa Tom Ford Black Orchid', 'Nước Hoa Creed Aventus', 'Nước Hoa Yves Saint Laurent',
      'Nước Hoa Gucci Bloom', 'Nước Hoa Prada Candy', 'Nước Hoa Marc Jacobs Daisy',
      'Nước Hoa Viktor & Rolf Flowerbomb', 'Nước Hoa Dolce & Gabbana Light Blue',
      'Nước Hoa Burberry Brit', 'Nước Hoa Calvin Klein CK One', 'Nước Hoa Hugo Boss Bottled',
      'Nước Hoa Armani Code', 'Nước Hoa Paco Rabanne 1 Million', 'Nước Hoa Jean Paul Gaultier',
      'Nước Hoa Issey Miyake', 'Nước Hoa Issey Miyake L\'Eau d\'Issey', 'Nước Hoa Hermès Terre'
    ];

    const products = [];
    let imageIndex = 0;

    for (let i = 0; i < Math.min(20, imageIds.length); i++) {
      const category = categories[i % categories.length];
      const price = Math.floor(Math.random() * 2000000) + 500000; // 500k - 2.5M
      const discount = Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : 0;
      
      const mainImage = imageIds[imageIndex % imageIds.length];
      const additionalImages = [];
      
      // Add 2-3 additional images
      for (let j = 1; j <= Math.floor(Math.random() * 2) + 2; j++) {
        const addImage = imageIds[(imageIndex + j) % imageIds.length];
        if (addImage !== mainImage) {
          additionalImages.push(addImage);
        }
      }

      products.push({
        TenSanPham: productNames[i] || `Nước Hoa ${i + 1}`,
        MoTa: 'Nước hoa cao cấp chính hãng, mùi hương quyến rũ, lưu hương lâu dài',
        Gia: price,
        KhuyenMai: discount,
        SoLuong: Math.floor(Math.random() * 100) + 10,
        MaLoaiSanPham: category._id,
        HinhAnhChinh: mainImage, // Cloudinary Public ID
        HinhAnhPhu: additionalImages.slice(0, 3), // Cloudinary Public IDs
        TrangThai: 'active'
      });

      imageIndex++;
    }

    // Insert products
    await SanPham.insertMany(products);
    console.log(`✅ Seeded ${products.length} products with Cloudinary images\n`);

    // Show sample
    console.log('📊 Sample products:');
    products.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.TenSanPham}`);
      console.log(`      Main Image: ${p.HinhAnhChinh}`);
      console.log(`      Additional: ${p.HinhAnhPhu.length} images\n`);
    });

    console.log('✅ Done! Now run: npm run cloudinary:update-products');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedProducts();

