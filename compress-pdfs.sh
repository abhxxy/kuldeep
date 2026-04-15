#!/bin/bash

echo "PDF Compression Script for WhatsApp Bot"
echo "========================================"
echo ""
echo "This script will compress your PDF catalogs to under 5MB"
echo ""

# Check if ghostscript is installed
if ! command -v gs &> /dev/null; then
    echo "Ghostscript is not installed. Installing..."
    sudo apt-get update
    sudo apt-get install -y ghostscript
fi

# Create compressed directory if it doesn't exist
mkdir -p ./catalogs/compressed

# Function to compress PDF
compress_pdf() {
    input="$1"
    filename=$(basename "$input")
    output="./catalogs/compressed/${filename}"

    echo "Compressing ${filename}..."

    # Try different compression levels
    # ebook setting usually gives good quality with smaller size
    gs -sDEVICE=pdfwrite \
       -dCompatibilityLevel=1.4 \
       -dPDFSETTINGS=/ebook \
       -dNOPAUSE \
       -dQUIET \
       -dBATCH \
       -sOutputFile="$output" \
       "$input" 2>/dev/null

    if [ -f "$output" ]; then
        original_size=$(du -h "$input" | cut -f1)
        compressed_size=$(du -h "$output" | cut -f1)
        compressed_mb=$(du -m "$output" | cut -f1)

        echo "  Original: ${original_size}"
        echo "  Compressed: ${compressed_size}"

        if [ $compressed_mb -le 5 ]; then
            echo "  ✅ Success! Under 5MB limit"
            # Replace original with compressed version
            cp "$output" "$input"
            echo "  Original file replaced with compressed version"
        else
            echo "  ⚠️ Still too large. Trying higher compression..."

            # Try screen setting for more compression
            gs -sDEVICE=pdfwrite \
               -dCompatibilityLevel=1.4 \
               -dPDFSETTINGS=/screen \
               -dNOPAUSE \
               -dQUIET \
               -dBATCH \
               -sOutputFile="${output}.screen" \
               "$input" 2>/dev/null

            compressed_mb2=$(du -m "${output}.screen" | cut -f1)
            compressed_size2=$(du -h "${output}.screen" | cut -f1)

            if [ $compressed_mb2 -le 5 ]; then
                echo "  ✅ Success with high compression: ${compressed_size2}"
                cp "${output}.screen" "$input"
                echo "  Original file replaced with compressed version"
            else
                echo "  ❌ Cannot compress below 5MB. Final size: ${compressed_size2}"
                echo "  Consider splitting this catalog into parts"
            fi
        fi
    else
        echo "  ❌ Compression failed"
    fi
    echo ""
}

# Compress each PDF
echo "Starting compression..."
echo ""

if [ -f "./catalogs/Floor Tiles.pdf" ]; then
    compress_pdf "./catalogs/Floor Tiles.pdf"
fi

if [ -f "./catalogs/Wall Tiles.pdf" ]; then
    compress_pdf "./catalogs/Wall Tiles.pdf"
fi

if [ -f "./catalogs/Parking Tiles.pdf" ]; then
    compress_pdf "./catalogs/Parking Tiles.pdf"
fi

echo "Compression complete!"
echo ""
echo "File status:"
ls -lh ./catalogs/*.pdf | grep -E "(Floor|Wall|Parking)" | awk '{print $9 ": " $5}'