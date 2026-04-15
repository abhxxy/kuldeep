const os = require('os');
const v8 = require('v8');
const { execSync } = require('child_process');

console.log('=== SERVER DIAGNOSTICS ===\n');

// System Info
console.log('1. SYSTEM INFORMATION:');
console.log('----------------------');
console.log(`Platform: ${os.platform()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`Node Version: ${process.version}`);
console.log(`Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`CPU Cores: ${os.cpus().length}`);

// Node.js Memory Limits
console.log('\n2. NODE.JS MEMORY LIMITS:');
console.log('-------------------------');
const heapStats = v8.getHeapStatistics();
console.log(`Heap Size Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total Heap Size: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Used Heap Size: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);

// Check if running with increased memory
console.log('\n3. NODE PROCESS ARGUMENTS:');
console.log('---------------------------');
console.log(`Process args: ${process.execArgv.join(' ') || 'None'}`);

// Network/Firewall
console.log('\n4. NETWORK CONFIGURATION:');
console.log('-------------------------');
try {
    const ulimit = execSync('ulimit -n', { encoding: 'utf8' }).trim();
    console.log(`Open files limit: ${ulimit}`);
} catch (e) {
    console.log('Could not check ulimit');
}

// Check Puppeteer dependencies
console.log('\n5. PUPPETEER DEPENDENCIES:');
console.log('--------------------------');
const puppeteerDeps = [
    'gconf-service', 'libasound2', 'libatk1.0-0', 'libcairo2',
    'libgdk-pixbuf2.0-0', 'libgtk-3-0', 'libnspr4', 'libx11-xcb1'
];

let missingDeps = [];
for (const dep of puppeteerDeps) {
    try {
        execSync(`dpkg -l | grep ${dep}`, { encoding: 'utf8' });
    } catch (e) {
        missingDeps.push(dep);
    }
}

if (missingDeps.length > 0) {
    console.log(`Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('\nInstall with:');
    console.log(`sudo apt-get install -y ${missingDeps.join(' ')}`);
} else {
    console.log('✅ All Puppeteer dependencies installed');
}

// Check for swap space
console.log('\n6. SWAP MEMORY:');
console.log('---------------');
try {
    const swap = execSync('free -h | grep Swap', { encoding: 'utf8' }).trim();
    console.log(swap);
    if (swap.includes('0B')) {
        console.log('⚠️  No swap space configured!');
        console.log('This can cause issues with large file operations.');
    }
} catch (e) {
    console.log('Could not check swap');
}

// Recommendations
console.log('\n=== RECOMMENDATIONS ===\n');

if (heapStats.heap_size_limit < 2048 * 1024 * 1024) {
    console.log('❌ Node.js heap size is limited to less than 2GB');
    console.log('FIX: Start your bot with increased memory:');
    console.log('node --max-old-space-size=4096 bot.js');
    console.log('');
}

if (os.freemem() < 1024 * 1024 * 1024) {
    console.log('⚠️  Low free memory (less than 1GB)');
    console.log('FIX: Free up memory or upgrade server');
    console.log('');
}

console.log('SOLUTION FOR PDF SENDING:');
console.log('------------------------');
console.log('1. Start bot with more memory:');
console.log('   node --max-old-space-size=4096 bot.js');
console.log('');
console.log('2. Or create a startup script:');
console.log('   Create start.sh with:');
console.log('   #!/bin/bash');
console.log('   node --max-old-space-size=4096 bot.js');
console.log('');
console.log('3. For production, use PM2:');
console.log('   pm2 start bot.js --node-args="--max-old-space-size=4096"');