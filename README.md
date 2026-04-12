# WhatsApp Tile & Sanitary Business Bot

An automated WhatsApp bot for handling customer inquiries about tiles, sanitary products, and other building materials. The bot follows a structured conversation flow to collect customer requirements and provide product catalogs.

## Features

### Core Functionality
- **Auto Greeting**: Instantly greets customers in a friendly, bilingual manner (English/Gujarati)
- **Product Selection**: Customers can choose from Floor Tiles, Sanitary, Export Inquiry, or Other
- **Smart Catalog Sending**: Automatically sends relevant product catalogs based on selection
- **Size & Type Selection**: For tiles, collects specific size and type requirements
- **Quantity Collection**: Records required quantity in boxes or square feet
- **Location Tracking**: Collects delivery location for logistics planning
- **Budget Options**: Optional budget selection (Economy/Premium/No Budget)
- **Contact Collection**: Gathers customer contact details
- **Inquiry Summary**: Sends a complete summary of the inquiry to the customer

### Advanced Features (Enhanced Version)
- **Admin Notifications**: Sends real-time alerts to admin numbers for new inquiries
- **Working Hours**: Configurable business hours with auto-reply for off-hours
- **Session Management**: 30-minute timeout for inactive conversations
- **Data Export**: Saves inquiries to CSV format for analysis
- **Configurable Messages**: All messages can be customized via config file
- **Multi-language Support**: Bilingual communication (English/Gujarati)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd kuldeep
```

2. Install dependencies:
```bash
npm install
```

3. Create catalog directory:
```bash
mkdir catalogs
```

4. Add your catalog files:
   - Place product images in `catalogs/` folder
   - Add PDF catalog as `catalogs/catalog.pdf`

## Configuration

Edit `config.js` to customize:

- **Business Details**: Name, phone, email, address
- **Messages**: Customize all bot messages in your preferred language
- **Products & Options**: Modify available products, sizes, budgets
- **Admin Settings**: Add admin numbers for notifications
- **Working Hours**: Set business hours for auto-reply
- **Database**: Enable/disable inquiry saving

## Usage

### Basic Version
```bash
npm start
```

### Enhanced Version (with admin notifications and data export)
```bash
npm start:enhanced
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

## Bot Flow

1. **Customer sends any message** → Bot sends greeting with product options
2. **Customer selects product** (1-4) → Bot asks for specific requirements
3. **For Tiles**:
   - Asks for tile type (Floor/Wall/Parking)
   - Automatically sends catalog
   - Asks for size (2x2, 2x4, Custom)
4. **Quantity Input** → Customer provides quantity needed
5. **Location Input** → Customer provides delivery location
6. **Budget Selection** (Optional) → Customer selects budget preference
7. **Contact Details** → Customer provides phone number
8. **Summary** → Bot sends complete inquiry summary

## File Structure

```
kuldeep/
├── bot.js                 # Basic bot implementation
├── enhanced-bot.js        # Advanced bot with extra features
├── config.js             # Configuration file
├── package.json          # Project dependencies
├── catalogs/            # Catalog storage
│   ├── catalog-data.json # Product information
│   ├── catalog.pdf      # PDF catalog (add your own)
│   └── [images]         # Product images
└── inquiries.csv        # Auto-generated inquiry log
```

## Customization

### Adding New Products

In `config.js`, modify the products object:
```javascript
products: {
    1: { name: 'Floor Tiles', key: 'floor' },
    2: { name: 'Sanitary', key: 'sanitary' },
    3: { name: 'Export Inquiry', key: 'export' },
    4: { name: 'Other', key: 'other' },
    5: { name: 'Your New Product', key: 'new_product' }  // Add new
}
```

### Changing Messages

All messages can be customized in `config.js`:
```javascript
messages: {
    greeting: {
        initial: 'Welcome!',  // Change greeting
        inquiry: 'How can we help you today?'
    }
}
```

### Setting Working Hours

```javascript
workingHours: {
    enabled: true,
    start: '09:00',
    end: '18:00',
    timezone: 'Asia/Kolkata'
}
```

## Admin Features

### Real-time Notifications
Admins receive instant WhatsApp messages for each new inquiry with:
- Customer name
- Product requested
- Quantity needed
- Location
- Contact details
- Budget preference

### Data Export
All inquiries are automatically saved to `inquiries.csv` with timestamps for:
- Sales analysis
- Customer tracking
- Performance monitoring

## Troubleshooting

### QR Code Not Appearing
- Check internet connection
- Ensure Node.js version is 14 or higher
- Try deleting `.wwebjs_auth` folder and restart

### Bot Not Responding
- Check if within working hours (if configured)
- Verify session hasn't timed out (30 minutes default)
- Check console for error messages

### Catalog Not Sending
- Ensure catalog files exist in `catalogs/` folder
- Check file permissions
- Verify PDF file path in config

## Requirements

- Node.js 14 or higher
- npm or yarn
- Active WhatsApp account
- Chrome/Chromium browser (automatically downloaded by Puppeteer)

## Security Notes

- Never share your `.wwebjs_auth` folder
- Keep admin numbers private
- Regularly backup `inquiries.csv`
- Use environment variables for sensitive data in production

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console error messages
3. Ensure all dependencies are installed
4. Verify configuration settings

## License

ISC

## Future Enhancements

- [ ] Database integration (MongoDB/MySQL)
- [ ] Multi-language support expansion
- [ ] Payment gateway integration
- [ ] Advanced analytics dashboard
- [ ] AI-powered product recommendations
- [ ] Voice message support
- [ ] Group messaging capabilities