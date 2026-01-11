/**
 * @fileoverview Node.js script to generate PNG icons from SVG.
 * Uses sharp library for reliable cross-platform SVG to PNG conversion.
 */

import sharp from 'sharp';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'public', 'icons');
const SVG_SOURCE = join(ICONS_DIR, 'icon.svg');
const SIZES = [16, 48, 128];

async function generateIcons() {
  console.log('Generating PNG icons from SVG...\n');

  // Check if SVG exists
  if (!existsSync(SVG_SOURCE)) {
    console.error(`ERROR: SVG source not found at ${SVG_SOURCE}`);
    process.exit(1);
  }

  // Read SVG
  const svgBuffer = readFileSync(SVG_SOURCE);

  // Generate each size
  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created: icon${size}.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to create icon${size}.png:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All icons generated successfully!');
  console.log(`\nGenerated files in: ${ICONS_DIR}`);
  
  // List generated files
  for (const size of SIZES) {
    const filePath = join(ICONS_DIR, `icon${size}.png`);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      console.log(`   - icon${size}.png (${size}x${size}, ${(stats.size / 1024).toFixed(2)} KB)`);
    }
  }
}

generateIcons().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
