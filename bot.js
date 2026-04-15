const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
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

        // Check if file is too large
        if (fileSizeMB > 16) {
            console.log(`File too large (${fileSizeMB.toFixed(2)} MB) - sending download link instead`);
            const catalogName = tileType.charAt(0).toUpperCase() + tileType.slice(1);
            await chat.sendMessage(
                `📥 ${catalogName} Tiles Catalog\n\n` +
                `⚠️ The catalog file is too large to send directly (${fileSizeMB.toFixed(2)} MB).\n\n` +
                `Please contact our team for the catalog:\n` +
                `📱 WhatsApp: +91 [Your Number]\n` +
                `📧 Email: [Your Email]\n\n` +
                `They will share the catalog through an alternative method.`
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

            console.log(`Creating MessageMedia from file path...`);
            const startTime = Date.now();
            const media = MessageMedia.fromFilePath(catalogPath);
            const loadTime = Date.now() - startTime;
            console.log(`MessageMedia created successfully in ${loadTime}ms`);

            console.log(`Media mimetype: ${media.mimetype}`);
            console.log(`Media filename: ${media.filename}`);
            console.log(`Media data exists: ${media.data ? 'YES' : 'NO'}`);
            if (media.data) {
                console.log(`Media data length: ${media.data.length} characters`);
                console.log(`Estimated size: ${(media.data.length * 0.75 / 1024 / 1024).toFixed(2)} MB`);
                console.log(`First 100 chars of base64: ${media.data.substring(0, 100)}`);
            }

            console.log(`Memory after loading PDF:`, process.memoryUsage());

            console.log(`Attempting to send PDF media...`);
            const sendStartTime = Date.now();

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Send timeout after 30 seconds')), 30000);
            });

            // Race between send and timeout
            try {
                await Promise.race([
                    chat.sendMessage(media, {
                        caption: `${catalogName} Tiles - Full Catalog`,
                        sendMediaAsDocument: true
                    }),
                    timeoutPromise
                ]);

                const sendTime = Date.now() - sendStartTime;
                console.log(`✅ PDF SENT SUCCESSFULLY in ${sendTime}ms`);
            } catch (sendError) {
                console.log(`Send failed or timed out: ${sendError.message}`);

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
    const choice = matchOption(message.body, TILE_TYPES);

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

    try {
        switch (session.step) {
            case FLOW_STEPS.GREETING:
                await handleGreeting(chat, session);
                break;
            case FLOW_STEPS.PRODUCT_SELECTION:
                await handleProductSelection(message, chat, session);
                break;
            case FLOW_STEPS.SIZE_TYPE:
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