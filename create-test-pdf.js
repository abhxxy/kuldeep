const fs = require('fs');

// Create a minimal PDF file for testing
const minimalPDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 4 0 R >> >>
   /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 24 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000258 00000 n
0000000336 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
430
%%EOF`;

// Save the test PDF
fs.writeFileSync('./catalogs/test-small.pdf', minimalPDF);
console.log('Created test-small.pdf (minimal size)');

// Check the file
const stats = fs.statSync('./catalogs/test-small.pdf');
console.log(`File size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
console.log('\nNow try sending this small PDF to test if PDF sending works at all.');
console.log('In WhatsApp, when asked for tile type, type: test');