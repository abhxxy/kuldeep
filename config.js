module.exports = {
    business: {
        name: 'Your Business',
        phone: '9876545210',
        email: 'info@yourbusiness.com',
        address: 'Mumbai, India'
    },

    messages: {
        greeting: {
            initial: 'Namaste! 🙏',
            inquiry: 'Kem cho? Tamari tiles/sanitary ma koi inquiry hoy to mane kahiye. 🏠'
        },
        productSelection: {
            tiles: 'Bahuj saras! 👍\nTamne kaya type na Tiles joiye?',
            sanitary: 'Please share your sanitary requirements:',
            other: 'Please share your specific requirements:'
        },
        sizeSelection: 'Kaya Size ma joiye? 😊',
        quantityRequest: 'Ketli Quantity joiye?\n(Approx. Box / Sq. Ft.)\n\nExample: 500 Box',
        locationRequest: 'Delivery kya karvani che?\n(City / Country)\n\nExample: Mumbai / USA',
        budgetRequest: 'Saru 👍 Ketli chhok vatav che? (optional)',
        contactRequest: 'Thanks! 🙏\nTamary mobile number mokisho?\n\nAme Best Price ane Details mokisho.',
        summaryIntro: 'Dhanyowad {name}! 🙏\nTamari Inquiry Details madavi gayi che:',
        summaryEnd: 'Team jaldi contact karse 📞\nHave a Great Day! 😊'
    },

    sessionTimeout: 30 * 60 * 1000,

    catalogs: {
        enablePdfSending: true,
        pdfPath: './catalogs/catalog.pdf',
        imagesPath: './catalogs/',
        catalogDownloadText: '📥 Click here for full catalog\n⬇️ Download Catalog'
    },

    products: {
        1: { name: 'Floor Tiles', key: 'floor' },
        2: { name: 'Sanitary', key: 'sanitary' },
        3: { name: 'Export Inquiry', key: 'export' },
        4: { name: 'Other', key: 'other' }
    },

    tileTypes: {
        1: { name: 'Floor Tiles', key: 'floor' },
        2: { name: 'Wall Tiles', key: 'wall' },
        3: { name: 'Parking Tiles', key: 'parking' }
    },

    sizes: {
        1: { name: '2x2 Feet', key: '2x2' },
        2: { name: '2x4 Feet', key: '2x4' },
        3: { name: 'Custom Size', key: 'custom' }
    },

    budgets: {
        1: { name: 'Economy', key: 'economy' },
        2: { name: 'Premium', key: 'premium' },
        3: { name: 'No Budget - Best Suggestion', key: 'no_budget' }
    },

    adminNotification: {
        enabled: true,
        adminNumbers: ['+919876543210'],
        sendInquirySummary: true
    },

    autoReply: {
        enabled: true,
        workingHours: {
            enabled: false,
            start: '09:00',
            end: '18:00',
            timezone: 'Asia/Kolkata',
            outOfHoursMessage: 'Thank you for your message! Our business hours are 9 AM to 6 PM. We will respond to your inquiry as soon as possible.'
        }
    },

    database: {
        enabled: false,
        saveInquiries: false,
        exportFormat: 'csv'
    }
};