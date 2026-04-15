#!/bin/bash

echo "Starting WhatsApp Bot with optimized settings..."
echo "================================================"
echo ""

# Check current memory
FREE_MEM=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
echo "Available memory: ${FREE_MEM} GB"

# Set Node.js memory to 4GB (or 75% of available memory, whichever is smaller)
MAX_MEMORY=4096

echo "Starting bot with ${MAX_MEMORY}MB heap size..."
echo ""

# Start the bot with increased memory and better error handling
node --max-old-space-size=${MAX_MEMORY} \
     --max-http-header-size=80000 \
     bot.js

# If bot crashes, show error
if [ $? -ne 0 ]; then
    echo ""
    echo "Bot crashed! Possible causes:"
    echo "1. Not enough memory - try reducing MAX_MEMORY in this script"
    echo "2. Missing dependencies - run: node diagnose-server.js"
    echo "3. Network timeout - check your internet connection"
fi