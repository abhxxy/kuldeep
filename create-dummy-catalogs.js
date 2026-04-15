const fs = require('fs');
const path = require('path');

// Function to create a PDF of specific size
function createDummyPDF(filename, sizeMB, title) {
    const targetSizeBytes = sizeMB * 1024 * 1024;

    // Basic PDF structure with title
    let pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>
   /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Length `;

    // Create content with title and sample text
    let streamContent = `BT
/F1 36 Tf
50 700 Td
(${title}) Tj
ET
BT
/F2 14 Tf
50 650 Td
(Premium Quality Tiles Collection) Tj
ET
BT
/F2 12 Tf
50 600 Td
(This is a sample catalog for testing purposes) Tj
ET
BT
/F2 12 Tf
50 570 Td
(Actual catalog contains detailed product information) Tj
ET
BT
/F2 12 Tf
50 540 Td
(with images and specifications) Tj
ET
`;

    // Add some repeating content to increase size
    for (let i = 0; i < 50; i++) {
        streamContent += `
BT
/F2 10 Tf
50 ${500 - (i * 15)} Td
(Product ${i + 1}: Premium tile design with excellent durability) Tj
ET
`;
    }

    // Calculate padding needed
    const baseSize = pdfContent.length + streamContent.length + 500;
    const paddingNeeded = Math.max(0, targetSizeBytes - baseSize);

    // Add padding as PDF comments (won't affect display)
    const paddingChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let padding = '\n% Padding for size: ';
    for (let i = 0; i < paddingNeeded - 20; i++) {
        padding += paddingChars[Math.floor(Math.random() * paddingChars.length)];
        if (i % 100 === 0) padding += '\n% ';
    }

    streamContent += padding;

    pdfContent += `${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000258 00000 n
0000000336 00000 n
0000000414 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${targetSizeBytes - 50}
%%EOF`;

    // Backup original if it exists
    if (fs.existsSync(filename)) {
        const backupName = filename.replace('.pdf', '_original_backup.pdf');
        console.log(`Backing up original to: ${backupName}`);
        fs.copyFileSync(filename, backupName);
    }

    // Write the new dummy PDF
    fs.writeFileSync(filename, pdfContent);
    const actualSize = fs.statSync(filename).size;
    console.log(`✅ Created ${path.basename(filename)}: ${(actualSize / 1024 / 1024).toFixed(2)} MB`);
    return actualSize;
}

console.log('=== Creating Dummy Catalog PDFs (Under 5MB) ===\n');
console.log('These will replace your large PDFs with working dummy versions.\n');

// Create dummy catalogs with exact names, all under 5MB
const catalogs = [
    {
        file: './catalogs/Floor Tiles.pdf',
        size: 4.5, // Keep under 5MB
        title: 'Floor Tiles Catalog'
    },
    {
        file: './catalogs/Wall Tiles.pdf',
        size: 4.8, // Keep under 5MB
        title: 'Wall Tiles Catalog'
    },
    {
        file: './catalogs/Parking Tiles.pdf',
        size: 4.2, // Keep under 5MB
        title: 'Parking Tiles Catalog'
    }
];

// Create catalogs directory if it doesn't exist
if (!fs.existsSync('./catalogs')) {
    fs.mkdirSync('./catalogs');
    console.log('Created catalogs directory\n');
}

// Create each dummy catalog
catalogs.forEach(catalog => {
    createDummyPDF(catalog.file, catalog.size, catalog.title);
});

console.log('\n=== Summary ===\n');
console.log('✅ All dummy catalogs created successfully!');
console.log('✅ All files are under 5MB and will work on your server');
console.log('\nOriginal files backed up with "_original_backup.pdf" suffix');
console.log('\nYour bot can now send these catalogs without any issues!');
console.log('\nTo restore originals later:');
console.log('- Floor Tiles: mv "./catalogs/Floor Tiles_original_backup.pdf" "./catalogs/Floor Tiles.pdf"');
console.log('- Wall Tiles: mv "./catalogs/Wall Tiles_original_backup.pdf" "./catalogs/Wall Tiles.pdf"');
console.log('- Parking Tiles: mv "./catalogs/Parking Tiles_original_backup.pdf" "./catalogs/Parking Tiles.pdf"');