/**
 * Script to upload video to Cloudinary
 * 
 * Usage: node scripts/upload-video-to-cloudinary.js
 * 
 * Requires:
 * - CLOUDINARY_URL environment variable
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

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

console.log('🔍 Starting video upload to Cloudinary...');
console.log(`📦 Cloud Name: ${cloudName}\n`);

// Path to video file
const videoPath = path.join(__dirname, '../../frontend/public/backgroud.mp4');

if (!fs.existsSync(videoPath)) {
  console.error(`❌ Video file not found: ${videoPath}`);
  process.exit(1);
}

const fileStats = fs.statSync(videoPath);
const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
console.log(`📹 Video file: backgroud.mp4`);
console.log(`📏 Size: ${fileSizeMB} MB\n`);

/**
 * Upload video to Cloudinary
 */
async function uploadVideo() {
  try {
    console.log('⏳ Uploading video (this may take a while for large files)...\n');
    
    const result = await cloudinary.uploader.upload(videoPath, {
      resource_type: 'video',
      folder: 'videos',
      public_id: 'backgroud',
      overwrite: true,
      chunk_size: 6000000, // 6MB chunks for large files
      eager: [
        { width: 1920, height: 1080, crop: 'limit', quality: 'auto' },
        { width: 1280, height: 720, crop: 'limit', quality: 'auto' }
      ],
      eager_async: true
    });

    console.log('✅ Video uploaded successfully!\n');
    console.log('📊 Upload Details:');
    console.log(`   Public ID: ${result.public_id}`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Size: ${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Width: ${result.width}px`);
    console.log(`   Height: ${result.height}px\n`);

    // Save result to JSON
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'video-upload.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      uploaded_at: new Date().toISOString()
    }, null, 2));

    console.log(`💾 Upload details saved to: ${jsonPath}\n`);

    // Generate URL for frontend
    const frontendUrl = `https://res.cloudinary.com/${cloudName}/video/upload/v${result.version}/${result.public_id}.${result.format}`;
    console.log('🔗 Frontend URL:');
    console.log(`   ${frontendUrl}\n`);

    console.log('💡 Next steps:');
    console.log('   1. Update frontend/src/pages/Home.tsx to use Cloudinary URL');
    console.log('   2. Or use Public ID: videos/backgroud');
    console.log('   3. Test video playback on website');

  } catch (error) {
    console.error('❌ Error uploading video:', error.message);
    if (error.http_code === 400) {
      console.error('\n💡 Possible issues:');
      console.error('   - File too large (free plan limit: 100MB)');
      console.error('   - Invalid video format');
      console.error('   - Network timeout');
    }
    process.exit(1);
  }
}

// Run
uploadVideo();

