const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const sessions = new Map();
const inquiries = [];

const FLOW_STEPS = {
    GREETING: 'greeting',
    PRODUCT_SELECTION: 'product_selection',
    SIZE_TYPE: 'size_type',
    QUANTITY: 'quantity',
    LOCATION: 'location',
    CONTACT: 'contact',
    BUDGET: 'budget',
    SUMMARY: 'summary'
};

function getUserSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            step: FLOW_STEPS.GREETING,
            data: {},
            lastActivity: Date.now()
        });
    }
    return sessions.get(userId);
}

function formatOptions(options, title) {
    let message = title ? `${title}\n\n` : '';
    for (const [key, value] of Object.entries(options)) {
        message += `${key}. ${value.name}\n`;
    }
    return message;
}

function isWithinWorkingHours() {
    if (!config.autoReply.workingHours.enabled) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [startHour, startMinute] = config.autoReply.workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = config.autoReply.workingHours.end.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
}

async function sendCatalog(chat, productType, size) {
    const catalogMessage = `Here is our latest ${productType} Catalog:\n\n`;

    const catalogData = require('./catalogs/catalog-data.json');
    let productInfo = '';

    if (productType.includes('Floor')) {
        for (const [key, value] of Object.entries(catalogData.floorTiles)) {
            productInfo += `📍 ${value.name}\n`;
            productInfo += `   ${value.description}\n`;
            productInfo += `   Sizes: ${value.sizes.join(', ')}\n`;
            productInfo += `   Price: ${value.price_range}\n\n`;
        }
    }

    await chat.sendMessage(catalogMessage + productInfo + '\n' + config.catalogs.catalogDownloadText);

    if (config.catalogs.enablePdfSending && fs.existsSync(config.catalogs.pdfPath)) {
        try {
            const media = MessageMedia.fromFilePath(config.catalogs.pdfPath);
            await chat.sendMessage(media, { caption: 'Full Catalog PDF' });
        } catch (error) {
            console.log('Could not send PDF catalog:', error);
        }
    }
}

async function notifyAdmin(inquiryData) {
    if (!config.adminNotification.enabled) return;

    const adminMessage = `🔔 New Inquiry Received!\n\n` +
        `Customer: ${inquiryData.customerName || 'Unknown'}\n` +
        `Product: ${inquiryData.product?.name || 'Not specified'}\n` +
        `Quantity: ${inquiryData.quantity || 'Not specified'}\n` +
        `Location: ${inquiryData.location || 'Not specified'}\n` +
        `Contact: ${inquiryData.contact || 'Not specified'}\n` +
        `Budget: ${inquiryData.budget?.name || 'Not specified'}\n` +
        `Time: ${new Date().toLocaleString()}`;

    for (const adminNumber of config.adminNotification.adminNumbers) {
        try {
            const numberId = adminNumber.includes('@c.us') ? adminNumber : `${adminNumber.replace(/[^\d]/g, '')}@c.us`;
            await client.sendMessage(numberId, adminMessage);
        } catch (error) {
            console.error('Error notifying admin:', error);
        }
    }
}

async function saveInquiry(inquiryData) {
    inquiries.push({
        ...inquiryData,
        timestamp: new Date().toISOString()
    });

    if (config.database.saveInquiries) {
        const csvLine = `${inquiryData.timestamp},${inquiryData.customerName},${inquiryData.product?.name},${inquiryData.quantity},${inquiryData.location},${inquiryData.contact},${inquiryData.budget?.name}\n`;

        const csvPath = './inquiries.csv';
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, 'Timestamp,Customer,Product,Quantity,Location,Contact,Budget\n');
        }
        fs.appendFileSync(csvPath, csvLine);
    }
}

async function handleGreeting(chat, session) {
    const greetingMessage = `${config.messages.greeting.initial}\n${config.messages.greeting.inquiry}\n\n${formatOptions(config.products, 'Please select:')}`;
    await chat.sendMessage(greetingMessage);
    session.step = FLOW_STEPS.PRODUCT_SELECTION;
}

async function handleProductSelection(message, chat, session) {
    const choice = parseInt(message.body);
    if (config.products[choice]) {
        session.data.product = config.products[choice];

        if (config.products[choice].key === 'floor') {
            const typeMessage = `${config.messages.productSelection.tiles}\n\n${formatOptions(config.tileTypes, '')}`;
            await chat.sendMessage(typeMessage);
            session.step = FLOW_STEPS.SIZE_TYPE;
        } else if (config.products[choice].key === 'sanitary') {
            await chat.sendMessage(config.messages.productSelection.sanitary);
            session.step = FLOW_STEPS.QUANTITY;
        } else {
            await chat.sendMessage(config.messages.productSelection.other);
            session.step = FLOW_STEPS.QUANTITY;
        }
    } else {
        await chat.sendMessage('Please select a valid option (1-4)');
    }
}

async function handleSizeType(message, chat, session) {
    const choice = parseInt(message.body);

    if (choice === 1) {
        session.data.tileType = config.tileTypes[choice];
        await sendCatalog(chat, 'Floor Tiles', null);

        const sizeMessage = `${config.messages.sizeSelection}\n\n${formatOptions(config.sizes, '')}`;
        await chat.sendMessage(sizeMessage);
        session.step = FLOW_STEPS.QUANTITY;
        session.data.waitingForSize = true;
    } else if (config.tileTypes[choice]) {
        session.data.tileType = config.tileTypes[choice];
        const sizeMessage = `${config.messages.sizeSelection}\n\n${formatOptions(config.sizes, '')}`;
        await chat.sendMessage(sizeMessage);
        session.step = FLOW_STEPS.QUANTITY;
        session.data.waitingForSize = true;
    } else {
        await chat.sendMessage('Please select a valid tile type (1-3)');
    }
}

async function handleQuantity(message, chat, session) {
    if (session.data.waitingForSize) {
        const choice = parseInt(message.body);
        if (config.sizes[choice]) {
            session.data.size = config.sizes[choice];
            session.data.waitingForSize = false;
            await chat.sendMessage(config.messages.quantityRequest);
        } else if (choice === 3) {
            session.data.size = { name: message.body, key: 'custom' };
            session.data.waitingForSize = false;
            await chat.sendMessage(config.messages.quantityRequest);
        } else {
            await chat.sendMessage('Please select a valid size option');
        }
    } else {
        session.data.quantity = message.body;
        await chat.sendMessage(config.messages.locationRequest);
        session.step = FLOW_STEPS.LOCATION;
    }
}

async function handleLocation(message, chat, session) {
    session.data.location = message.body;

    const budgetMessage = `${config.messages.budgetRequest}\n\n${formatOptions(config.budgets, '')}`;
    await chat.sendMessage(budgetMessage);
    session.step = FLOW_STEPS.BUDGET;
}

async function handleBudget(message, chat, session) {
    const choice = parseInt(message.body);
    if (config.budgets[choice]) {
        session.data.budget = config.budgets[choice];
    } else {
        session.data.budget = { name: 'Not specified', key: 'none' };
    }

    await chat.sendMessage(config.messages.contactRequest);
    session.step = FLOW_STEPS.CONTACT;
}

async function handleContact(message, chat, session) {
    session.data.contact = message.body;
    session.data.customerName = message._data.notifyName || 'Customer';

    const summaryIntro = config.messages.summaryIntro.replace('{name}', session.data.customerName);

    const summary = `${summaryIntro}

✅ Type: ${session.data.product?.name || 'Not specified'}
${session.data.tileType ? `✅ Tile Type: ${session.data.tileType.name}` : ''}
${session.data.size ? `✅ Size: ${session.data.size.name}` : ''}
✅ Quantity: ${session.data.quantity || 'Not specified'}
📍 Location: ${session.data.location || 'Not specified'}
💰 Budget: ${session.data.budget?.name || 'Not specified'}
📞 Contact: ${session.data.contact}

${config.messages.summaryEnd}`;

    await chat.sendMessage(summary);

    await saveInquiry(session.data);
    await notifyAdmin(session.data);

    sessions.delete(message.from);
}

client.on('qr', (qr) => {
    console.log('QR Code received, scan it with your phone:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
    console.log('Bot Name:', config.business.name);
    console.log('Working Hours:', config.autoReply.workingHours.enabled ?
        `${config.autoReply.workingHours.start} - ${config.autoReply.workingHours.end}` : 'Always Active');
    console.log('Admin Notifications:', config.adminNotification.enabled ? 'Enabled' : 'Disabled');
});

client.on('message', async (message) => {
    if (message.from.includes('@g.us')) return;

    if (!isWithinWorkingHours()) {
        await message.reply(config.autoReply.workingHours.outOfHoursMessage);
        return;
    }

    const chat = await message.getChat();
    const session = getUserSession(message.from);

    const timeSinceLastActivity = Date.now() - session.lastActivity;
    if (timeSinceLastActivity > config.sessionTimeout) {
        session.step = FLOW_STEPS.GREETING;
        session.data = {};
    }

    session.lastActivity = Date.now();

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
            default:
                await handleGreeting(chat, session);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await chat.sendMessage('Sorry, something went wrong. Please try again.');
        session.step = FLOW_STEPS.GREETING;
        session.data = {};
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
});

process.on('SIGINT', async () => {
    console.log('\nShutting down bot gracefully...');
    if (inquiries.length > 0) {
        console.log(`Total inquiries received: ${inquiries.length}`);
    }
    await client.destroy();
    process.exit(0);
});

client.initialize();

console.log('Starting Enhanced WhatsApp Bot...');
console.log('Please wait for QR code to appear...');