const fs = require('fs');
const path = require('path');

console.log('=== CATALOG STATUS REPORT ===\n');

const catalogs = [
    { name: 'Floor Tiles', file: './catalogs/Floor Tiles.pdf', limit: 5 },
    { name: 'Wall Tiles', file: './catalogs/Wall Tiles.pdf', limit: 5 },
    { name: 'Parking Tiles', file: './catalogs/Parking Tiles.pdf', limit: 5 }
];

console.log('Current Status (5MB limit):');
console.log('----------------------------');

catalogs.forEach(catalog => {
    if (fs.existsSync(catalog.file)) {
        const stats = fs.statSync(catalog.file);
        const sizeMB = stats.size / 1024 / 1024;
        const status = sizeMB <= catalog.limit ? '✅ Can Send' : '❌ Too Large';

        console.log(`${catalog.name}: ${sizeMB.toFixed(2)} MB - ${status}`);

        if (sizeMB > catalog.limit) {
            const reduction = ((sizeMB - catalog.limit) / sizeMB * 100).toFixed(1);
            console.log(`  Need to reduce by ${reduction}% to send via WhatsApp`);
        }
    } else {
        console.log(`${catalog.name}: File not found`);
    }
});

console.log('\n=== RECOMMENDATIONS ===\n');

console.log('For files over 5MB:');
console.log('1. Run: chmod +x compress-pdfs.sh && ./compress-pdfs.sh');
console.log('2. Upload to Google Drive and share links');
console.log('3. Split into multiple smaller catalogs');
console.log('4. Convert to compressed images (JPEG)');

console.log('\n=== BOT BEHAVIOR ===\n');
console.log('• Files ≤ 5MB: Sent directly via WhatsApp');
console.log('• Files > 5MB: Alternative message with contact info');
console.log('• All files have 30-second timeout protection');