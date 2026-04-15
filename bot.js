const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',  // Fix for limited /dev/shm on servers
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',  // Helps on low-memory servers
            '--disable-gpu'
        ]
    },
    // Increase timeouts for slower servers
    qrTimeoutMs: 60000,
    authTimeoutMs: 60000
});

const sessions = new Map();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const FLOW_STEPS = {
    GREETING: 'greeting',
    PRODUCT_SELECTION: 'product_selection',
    SIZE_TYPE: 'size_type',
    QUANTITY: 'quantity',
    LOCATION: 'location',
    CONTACT: 'contact',
    BUDGET: 'budget',
    SUMMARY: 'summary',
    COMPLETED: 'completed'
};

const PRODUCTS = {
    1: { name: 'Tiles', key: 'tiles' },
    2: { name: 'Sanitary', key: 'sanitary' },
    3: { name: 'Export Inquiry', key: 'export' },
    4: { name: 'Other', key: 'other' }
};

const TILE_TYPES = {
    1: { name: 'Floor Tiles', key: 'floor' },
    2: { name: 'Wall Tiles', key: 'wall' },
    3: { name: 'Parking Tiles', key: 'parking' }
};

const SIZES = {
    1: { name: '2x2 Feet', key: '2x2' },
    2: { name: '2x4 Feet', key: '2x4' },
    3: { name: 'Custom Size', key: 'custom' }
};

const BUDGETS = {
    1: { name: 'Economy', key: 'economy' },
    2: { name: 'Premium', key: 'premium' },
    3: { name: 'No Budget - Best Suggestion', key: 'no_budget' }
};

const EMOJI_NUMBERS = {
    0: '0️⃣',
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣'
};

function getUserSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            step: FLOW_STEPS.GREETING,
            data: {},
            lastActivity: Date.now(),
            completed: false
        });
    }
    return sessions.get(userId);
}

function isGreeting(text) {
    const greetings = ['hi', 'hello', 'hey', 'namaste', 'start'];
    return greetings.includes(text.toLowerCase().trim());
}

function isCancel(text) {
    const cancelWords = ['cancel', 'stop', 'exit', 'quit', 'restart', '0'];
    return cancelWords.includes(text.toLowerCase().trim());
}

function matchOption(input, options) {
    const num = parseInt(input);
    if (options[num]) return num;

    const inputLower = input.toLowerCase().trim();
    for (const [key, value] of Object.entries(options)) {
        if (value.name.toLowerCase() === inputLower || value.key.toLowerCase() === inputLower) {
            return parseInt(key);
        }
    }
    return null;
}

function formatOptions(options, title) {
    let message = title ? `${title}\n\n` : 'Please Select:\n\n';
    for (const [key, value] of Object.entries(options)) {
        message += `${EMOJI_NUMBERS[key] || key} ${value.name}\n`;
    }
    message += `\n${EMOJI_NUMBERS[0]} Cancel`;
    return message;
}

async function sendCatalog(chat, tileType) {
    console.log(`\n=== PDF CATALOG SEND ATTEMPT ===`);
    console.log(`Tile Type: ${tileType}`);
    console.log(`Current Working Directory: ${process.cwd()}`);

    const catalogFiles = {
        'floor': './catalogs/Floor Tiles.pdf',
        'wall': './catalogs/Wall Tiles.pdf',
        'parking': './catalogs/Parking Tiles.pdf'
    };

    const catalogPath = catalogFiles[tileType];
    console.log(`Catalog Path: ${catalogPath}`);

    if (!catalogPath) {
        console.log(`ERROR: No catalog path defined for tile type: ${tileType}`);
        await chat.sendMessage('Catalog will be shared by our team shortly.');
        return;
    }

    const absolutePath = path.resolve(catalogPath);
    console.log(`Absolute Path: ${absolutePath}`);

    const fileExists = fs.existsSync(catalogPath);
    console.log(`File Exists: ${fileExists}`);

    if (fileExists) {
        const stats = fs.statSync(catalogPath);
        const fileSizeMB = stats.size / 1024 / 1024;
        console.log(`File Size: ${stats.size} bytes (${fileSizeMB.toFixed(2)} MB)`);
        console.log(`File Permissions: ${stats.mode}`);
        console.log(`Is File: ${stats.isFile()}`);

        // WhatsApp has a ~16MB limit for media files (varies by type)
        const MAX_FILE_SIZE_MB = 16;
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            console.log(`⚠️ WARNING: File size (${fileSizeMB.toFixed(2)} MB) exceeds WhatsApp limit (${MAX_FILE_SIZE_MB} MB)`);
            console.log(`Will attempt to send, but may fail or timeout`);
        }
    }

    if (catalogPath && fs.existsSync(catalogPath)) {
        const stats = fs.statSync(catalogPath);
        const fileSizeMB = stats.size / 1024 / 1024;

        // Based on testing, WhatsApp Web.js on this server works up to 5MB
        // Files larger than 5MB will timeout/hang
        const MAX_SAFE_SIZE_MB = 5;

        // Check if file is too large
        if (fileSizeMB > MAX_SAFE_SIZE_MB) {
            console.log(`File too large (${fileSizeMB.toFixed(2)} MB) - exceeds safe limit of ${MAX_SAFE_SIZE_MB} MB`);
            const catalogName = tileType.charAt(0).toUpperCase() + tileType.slice(1);
            await chat.sendMessage(
                `📥 ${catalogName} Tiles Catalog\n\n` +
                `⚠️ The catalog file is too large to send directly (${fileSizeMB.toFixed(2)} MB).\n\n` +
                `Please contact our team for the catalog:\n` +
                `📱 WhatsApp: +91 [Your Number]\n` +
                `📧 Email: [Your Email]\n\n` +
                `They will share the catalog through Google Drive or email.`
            );
            console.log(`Sent alternative message for large file`);
            return;
        }

        try {
            const catalogName = tileType.charAt(0).toUpperCase() + tileType.slice(1);
            console.log(`Sending preliminary message for ${catalogName} catalog...`);
            await chat.sendMessage(`📥 Here is our latest ${catalogName} Tiles Catalog:\n⬇️ Downloading...`);
            console.log(`Preliminary message sent successfully`);

            console.log(`Memory before loading PDF:`, process.memoryUsage());

            console.log(`Creating MessageMedia...`);
            const startTime = Date.now();

            // Try different approach - read file buffer directly
            console.log(`Reading file buffer...`);
            const fileBuffer = fs.readFileSync(catalogPath);
            console.log(`File buffer size: ${fileBuffer.length} bytes`);

            // Convert to base64
            console.log(`Converting to base64...`);
            const base64data = fileBuffer.toString('base64');
            console.log(`Base64 length: ${base64data.length}`);

            // Create MessageMedia manually
            const media = new MessageMedia('application/pdf', base64data, `${catalogName} Tiles.pdf`);

            const loadTime = Date.now() - startTime;
            console.log(`MessageMedia created successfully in ${loadTime}ms`);

            console.log(`Media mimetype: ${media.mimetype}`);
            console.log(`Media filename: ${media.filename}`);
            console.log(`Media data exists: ${media.data ? 'YES' : 'NO'}`);

            console.log(`Memory after loading PDF:`, process.memoryUsage());

            console.log(`Attempting to send PDF media...`);
            const sendStartTime = Date.now();

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Send timeout after 30 seconds')), 30000);
            });

            // Race between send and timeout
            try {
                console.log(`Trying to send as document...`);

                // Try simpler send first
                await Promise.race([
                    chat.sendMessage(media),
                    timeoutPromise
                ]);

                const sendTime = Date.now() - sendStartTime;
                console.log(`✅ PDF SENT SUCCESSFULLY in ${sendTime}ms`);
            } catch (sendError) {
                console.log(`First attempt failed: ${sendError.message}`);
                console.log(`Trying with sendMediaAsDocument flag...`);

                try {
                    await Promise.race([
                        chat.sendMessage(media, {
                            caption: `${catalogName} Tiles Catalog`,
                            sendMediaAsDocument: true
                        }),
                        timeoutPromise
                    ]);
                    const sendTime = Date.now() - sendStartTime;
                    console.log(`✅ PDF SENT WITH DOCUMENT FLAG in ${sendTime}ms`);
                } catch (secondError) {
                    console.log(`Second attempt also failed: ${secondError.message}`);

                    // If it was a timeout or other error, send alternative message
                    await chat.sendMessage(
                        `📥 ${catalogName} Tiles Catalog\n\n` +
                        `Unable to send the PDF directly at this moment.\n` +
                        `Our team will share the catalog with you shortly.\n\n` +
                        `For immediate assistance:\n` +
                        `📱 Contact our sales team`
                    );
                    console.log(`Sent fallback message due to send failure`);
                }
            }
        } catch (error) {
            console.error(`❌ ERROR SENDING PDF CATALOG:`);
            console.error(`Error Type: ${error.constructor.name}`);
            console.error(`Error Message: ${error.message}`);
            console.error(`Error Stack: ${error.stack}`);
            console.error(`Full Error Object:`, error);

            await chat.sendMessage('Sorry, unable to send catalog at the moment. Our team will share it shortly.');
        }
    } else {
        console.log(`File does not exist at path: ${catalogPath}`);
        console.log(`Checking catalog directory...`);
        const catalogDir = './catalogs';
        if (fs.existsSync(catalogDir)) {
            console.log(`Catalog directory exists. Contents:`);
            const files = fs.readdirSync(catalogDir);
            files.forEach(file => {
                console.log(`  - ${file}`);
            });
        } else {
            console.log(`Catalog directory does not exist: ${catalogDir}`);
        }

        await chat.sendMessage('Catalog will be shared by our team shortly.');
    }
    console.log(`=== END PDF CATALOG ATTEMPT ===\n`);
}

async function handleGreeting(chat, session) {
    const greetingMessage = `Namaste! 🙏\nKem cho? Tamare tiles/sanitary ma koi inquiry hoy to mane janavo. 🏠\n\n${formatOptions(PRODUCTS, 'Please Select:')}`;
    await chat.sendMessage(greetingMessage);
    session.step = FLOW_STEPS.PRODUCT_SELECTION;
    session.completed = false;
}

async function handleProductSelection(message, chat, session) {
    const choice = matchOption(message.body, PRODUCTS);
    if (choice && PRODUCTS[choice]) {
        session.data.product = PRODUCTS[choice];

        if (PRODUCTS[choice].key === 'tiles') {
            const typeMessage = `Bahuj saras! 👍\nTamne kai type ni Tiles joiye?\n\n${formatOptions(TILE_TYPES, 'Please Select:')}`;
            await chat.sendMessage(typeMessage);
            session.step = FLOW_STEPS.SIZE_TYPE;
        } else if (PRODUCTS[choice].key === 'sanitary') {
            await chat.sendMessage('Please share your sanitary requirements:');
            session.step = FLOW_STEPS.QUANTITY;
        } else {
            await chat.sendMessage('Please share your specific requirements:');
            session.step = FLOW_STEPS.QUANTITY;
        }
    } else {
        await chat.sendMessage(`Please select a valid option.\n\n${formatOptions(PRODUCTS, 'Please Select:')}`);
    }
}

async function handleSizeType(message, chat, session) {
    console.log(`\n=== handleSizeType called ===`);
    console.log(`User input: "${message.body}"`);

    const choice = matchOption(message.body, TILE_TYPES);
    console.log(`Matched choice: ${choice}`);
    console.log(`Available TILE_TYPES:`, TILE_TYPES);

    if (choice && TILE_TYPES[choice]) {
        session.data.tileType = TILE_TYPES[choice];

        console.log(`User selected tile type: ${TILE_TYPES[choice].name} (${TILE_TYPES[choice].key})`);
        console.log(`Calling sendCatalog function...`);
        await sendCatalog(chat, TILE_TYPES[choice].key);

        const sizeMessage = `Kai Size ma joiye? 😊\n\n${formatOptions(SIZES, 'Please Select:')}`;
        await chat.sendMessage(sizeMessage);
        session.step = FLOW_STEPS.QUANTITY;
        session.data.waitingForSize = true;
    } else {
        await chat.sendMessage(`Please select a valid option.\n\n${formatOptions(TILE_TYPES, 'Please Select:')}`);
    }
}

async function handleQuantity(message, chat, session) {
    if (session.data.waitingForSize) {
        const choice = matchOption(message.body, SIZES);
        if (choice && SIZES[choice]) {
            session.data.size = SIZES[choice];
            session.data.waitingForSize = false;
            await chat.sendMessage('Ketli Quantity joiye?\n(Approx. Box / Sq. Ft.)\n\nExample: 500 Box');
        } else if (choice === 3) {
            session.data.size = { name: message.body, key: 'custom' };
            session.data.waitingForSize = false;
            await chat.sendMessage('Ketli Quantity joiye?\n(Approx. Box / Sq. Ft.)\n\nExample: 500 Box');
        } else {
            await chat.sendMessage('Please Select:\n\n1️⃣ 2x2 Feet\n2️⃣ 2x4 Feet\n3️⃣ Custom Size\n\n0️⃣ Cancel');
        }
    } else {
        session.data.quantity = message.body;
        await chat.sendMessage('Delivery kya karvani che?\n(City / Country)\n\nExample: Mumbai / USA');
        session.step = FLOW_STEPS.LOCATION;
    }
}

async function handleLocation(message, chat, session) {
    session.data.location = message.body;

    const budgetMessage = `Saru, 👍 Ketla budget ma joiiye?\n\n${formatOptions(BUDGETS, 'Please Select:')}`;
    await chat.sendMessage(budgetMessage);
    session.step = FLOW_STEPS.BUDGET;
}

async function handleBudget(message, chat, session) {
    const choice = matchOption(message.body, BUDGETS);
    if (choice && BUDGETS[choice]) {
        session.data.budget = BUDGETS[choice];
    } else {
        session.data.budget = { name: 'Not specified', key: 'none' };
    }

    await chat.sendMessage('Thanks! 🙏\nTamara mobile number moklsho?\nAme Best Price ane Details moklishu.');
    session.step = FLOW_STEPS.CONTACT;
}

async function handleContact(message, chat, session) {
    session.data.contact = message.body;

    const summary = `Thanks, ${message._data.notifyName || 'Customer'}! 🙏
Tamari Inquiry Details successfully receive thai gayi che:

✅ Type: ${session.data.product?.name || 'Not specified'}
${session.data.tileType ? `✅ Tile Type: ${session.data.tileType.name}` : ''}
${session.data.size ? `✅ Size: ${session.data.size.name}` : ''}
✅ Quantity: ${session.data.quantity || 'Not specified'}
📍 Location: ${session.data.location || 'Not specified'}
💰 Budget: ${session.data.budget?.name || 'Not specified'}
📞 Contact: ${session.data.contact}

Team jaldi tamaro contact karse 📞
Thanks, Have a Great Day! 😊`;

    await chat.sendMessage(summary);

    session.step = FLOW_STEPS.COMPLETED;
    session.completed = true;
}

client.on('qr', (qr) => {
    console.log('QR Code received, scan it with your phone:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
    console.log('Bot is now running and waiting for messages...');
});

client.on('message', async (message) => {
    if (message.from.includes('@g.us')) return;

    const chat = await message.getChat();
    const session = getUserSession(message.from);

    const timeSinceLastActivity = Date.now() - session.lastActivity;
    if (timeSinceLastActivity > 30 * 60 * 1000) {
        session.step = FLOW_STEPS.GREETING;
        session.data = {};
        session.completed = false;
    }

    session.lastActivity = Date.now();

    await delay(2000);

    // Quick test for PDF sending
    if (message.body.toLowerCase() === '!testpdf') {
        console.log('=== DIRECT PDF TEST ===');
        await chat.sendMessage('Testing PDF sending directly...');
        await sendCatalog(chat, 'test');
        return;
    }

    // Test parking tiles (8.92 MB)
    if (message.body.toLowerCase() === '!testparking') {
        console.log('=== TESTING PARKING TILES PDF (8.92 MB) ===');
        await chat.sendMessage('Testing Parking Tiles PDF (8.92 MB)...');
        await sendCatalog(chat, 'parking');
        return;
    }

    // Test floor tiles (12.73 MB)
    if (message.body.toLowerCase() === '!testfloor') {
        console.log('=== TESTING FLOOR TILES PDF (12.73 MB) ===');
        await chat.sendMessage('Testing Floor Tiles PDF (12.73 MB)...');
        await sendCatalog(chat, 'floor');
        return;
    }

    // Test different sizes
    if (message.body.toLowerCase() === '!test1mb') {
        console.log('=== TESTING 1MB PDF ===');
        await chat.sendMessage('Testing 1MB PDF...');
        const media = MessageMedia.fromFilePath('./catalogs/test-1mb.pdf');
        try {
            await chat.sendMessage(media);
            await chat.sendMessage('✅ 1MB PDF sent successfully!');
        } catch (e) {
            await chat.sendMessage('❌ 1MB PDF failed: ' + e.message);
        }
        return;
    }

    if (message.body.toLowerCase() === '!test2mb') {
        console.log('=== TESTING 2MB PDF ===');
        await chat.sendMessage('Testing 2MB PDF...');
        const media = MessageMedia.fromFilePath('./catalogs/test-2mb.pdf');
        try {
            await chat.sendMessage(media);
            await chat.sendMessage('✅ 2MB PDF sent successfully!');
        } catch (e) {
            await chat.sendMessage('❌ 2MB PDF failed: ' + e.message);
        }
        return;
    }

    if (message.body.toLowerCase() === '!test5mb') {
        console.log('=== TESTING 5MB PDF ===');
        await chat.sendMessage('Testing 5MB PDF...');
        const media = MessageMedia.fromFilePath('./catalogs/test-5mb.pdf');
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout after 20 seconds')), 20000);
            });
            await Promise.race([
                chat.sendMessage(media),
                timeoutPromise
            ]);
            await chat.sendMessage('✅ 5MB PDF sent successfully!');
        } catch (e) {
            await chat.sendMessage('❌ 5MB PDF failed: ' + e.message);
        }
        return;
    }

    if (isCancel(message.body)) {
        await chat.sendMessage('Inquiry cancelled. Type "hi" to start a new inquiry.');
        session.step = FLOW_STEPS.GREETING;
        session.data = {};
        session.completed = false;
        return;
    }

    if (isGreeting(message.body)) {
        session.step = FLOW_STEPS.GREETING;
        session.data = {};
        session.completed = false;
    }

    if (session.step === FLOW_STEPS.COMPLETED && !isGreeting(message.body)) {
        return;
    }

    console.log(`\n=== PROCESSING MESSAGE ===`);
    console.log(`Session step: ${session.step}`);
    console.log(`Message body: "${message.body}"`);

    try {
        switch (session.step) {
            case FLOW_STEPS.GREETING:
                console.log(`-> Calling handleGreeting`);
                await handleGreeting(chat, session);
                break;
            case FLOW_STEPS.PRODUCT_SELECTION:
                console.log(`-> Calling handleProductSelection`);
                await handleProductSelection(message, chat, session);
                break;
            case FLOW_STEPS.SIZE_TYPE:
                console.log(`-> Calling handleSizeType`);
                await handleSizeType(message, chat, session);
                break;
            case FLOW_STEPS.QUANTITY:
                await handleQuantity(message, chat, session);
                break;
            case FLOW_STEPS.LOCATION:
                await handleLocation(message, chat, session);
                break;
            case FLOW_STEPS.BUDGET:
                await handleBudget(message, chat, session);
                break;
            case FLOW_STEPS.CONTACT:
                await handleContact(message, chat, session);
                break;
            case FLOW_STEPS.COMPLETED:
                return;
            default:
                await handleGreeting(chat, session);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await chat.sendMessage('Sorry, something went wrong. Please try again.');
        session.step = FLOW_STEPS.GREETING;
        session.data = {};
        session.completed = false;
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
});

client.initialize();

console.log('Starting WhatsApp Bot...');
console.log('Please wait for QR code to appear...');