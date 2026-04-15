const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size / 1024 / 1024; // Size in MB
}

async function compressPDFWithGS(inputPath, outputPath, quality = 'ebook') {
    // quality options: screen (lowest), ebook (medium), printer (high), prepress (highest)
    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${quality} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

    try {
        await execPromise(command);
        return true;
    } catch (error) {
        console.error(`Error compressing with ghostscript: ${error.message}`);
        return false;
    }
}

async function compressPDF(inputPath, targetSizeMB = 5) {
    const fileName = path.basename(inputPath);
    const originalSize = await getFileSize(inputPath);

    console.log(`\nProcessing: ${fileName}`);
    console.log(`Original size: ${originalSize.toFixed(2)} MB`);

    if (originalSize <= targetSizeMB) {
        console.log(`✅ Already under ${targetSizeMB}MB limit!`);
        return true;
    }

    // Create backup
    const backupPath = inputPath.replace('.pdf', '_original.pdf');
    fs.copyFileSync(inputPath, backupPath);
    console.log(`Backup created: ${path.basename(backupPath)}`);

    // Try different compression levels
    const qualities = ['ebook', 'screen'];
    const tempPath = inputPath.replace('.pdf', '_temp.pdf');

    for (const quality of qualities) {
        console.log(`Trying ${quality} quality compression...`);

        const success = await compressPDFWithGS(backupPath, tempPath, quality);

        if (success && fs.existsSync(tempPath)) {
            const newSize = await getFileSize(tempPath);
            console.log(`Compressed size: ${newSize.toFixed(2)} MB`);

            if (newSize <= targetSizeMB) {
                // Replace original with compressed version
                fs.copyFileSync(tempPath, inputPath);
                fs.unlinkSync(tempPath);
                console.log(`✅ Success! File compressed to ${newSize.toFixed(2)} MB`);

                // Remove backup after successful compression
                fs.unlinkSync(backupPath);
                return true;
            }
        }
    }

    console.log(`❌ Could not compress below ${targetSizeMB}MB`);
    console.log(`Consider splitting this PDF into parts or using online compression tools`);

    // Restore original from backup
    fs.copyFileSync(backupPath, inputPath);
    fs.unlinkSync(backupPath);

    // Clean up temp file
    if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
    }

    return false;
}

async function main() {
    console.log('=== PDF Compression for WhatsApp Bot ===\n');

    // Check if ghostscript is available
    try {
        await execPromise('gs --version');
        console.log('✅ Ghostscript is installed\n');
    } catch (error) {
        console.error('❌ Ghostscript is not installed!');
        console.log('\nPlease install Ghostscript first:');
        console.log('Ubuntu/Debian: sudo apt-get install ghostscript');
        console.log('Mac: brew install ghostscript');
        console.log('Windows: Download from https://www.ghostscript.com/download/gsdnld.html\n');
        return;
    }

    const pdfsToCompress = [
        './catalogs/Floor Tiles.pdf',
        './catalogs/Wall Tiles.pdf',
        './catalogs/Parking Tiles.pdf'
    ];

    for (const pdfPath of pdfsToCompress) {
        if (fs.existsSync(pdfPath)) {
            await compressPDF(pdfPath, 5);
        } else {
            console.log(`\n⚠️ File not found: ${pdfPath}`);
        }
    }

    console.log('\n=== Final Status ===\n');

    for (const pdfPath of pdfsToCompress) {
        if (fs.existsSync(pdfPath)) {
            const size = await getFileSize(pdfPath);
            const status = size <= 5 ? '✅' : '❌';
            console.log(`${status} ${path.basename(pdfPath)}: ${size.toFixed(2)} MB`);
        }
    }

    console.log('\n✅ Compression complete! Files are ready to push to git.');
}

main().catch(console.error);