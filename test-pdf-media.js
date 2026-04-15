const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

console.log('=== PDF MEDIA HANDLING TEST ===\n');

const pdfFiles = [
    './catalogs/Floor Tiles.pdf',
    './catalogs/Wall Tiles.pdf',
    './catalogs/Parking Tiles.pdf'
];

async function testPDFLoading() {
    for (const pdfPath of pdfFiles) {
        console.log(`\nTesting: ${pdfPath}`);
        console.log('='.repeat(50));

        if (!fs.existsSync(pdfPath)) {
            console.log('❌ File does not exist');
            continue;
        }

        const stats = fs.statSync(pdfPath);
        console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        try {
            console.log('Memory before:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');

            const startTime = Date.now();
            console.log('Loading file into MessageMedia...');

            const media = MessageMedia.fromFilePath(pdfPath);

            const loadTime = Date.now() - startTime;
            console.log(`✅ Loaded in ${loadTime}ms`);

            console.log('Memory after:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');

            console.log(`MIME type: ${media.mimetype}`);
            console.log(`Filename: ${media.filename}`);
            console.log(`Data exists: ${media.data ? 'YES' : 'NO'}`);

            if (media.data) {
                console.log(`Base64 length: ${media.data.length} characters`);
                console.log(`Estimated size: ${(media.data.length * 0.75 / 1024 / 1024).toFixed(2)} MB`);
                console.log(`Valid base64: ${/^[A-Za-z0-9+/]*={0,2}$/.test(media.data) ? 'YES' : 'Checking...'}`);

                // Check if it's valid base64
                try {
                    const buffer = Buffer.from(media.data, 'base64');
                    console.log(`Buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`✅ Valid base64 encoding`);
                } catch (e) {
                    console.log(`❌ Invalid base64 encoding:`, e.message);
                }
            } else {
                console.log('❌ No data in MessageMedia object');
            }

        } catch (error) {
            console.log(`❌ Error loading file:`, error.message);
            console.log('Stack:', error.stack);
        }
    }

    console.log('\n=== SYSTEM INFO ===');
    console.log(`Node version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`Total memory: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Free memory: ${(require('os').freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Node max memory: ${(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
}

testPDFLoading().catch(console.error);