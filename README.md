# Tripuva Backend

A Node.js backend service for Tripuva travel booking platform.

## Features

- WhatsApp integration for booking communication
- Payment processing with Razorpay
- User management and booking system
- Package availability tracking

## Project Structure

```
src/
├── routes/           # API route definitions
├── controllers/      # Route handlers
├── services/        # Business logic
├── models/          # Database models
├── middleware/      # Custom middleware
├── utils/          # Utility functions
├── config/         # Configuration
└── constants/      # Constants and enums
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   WHATSAPP_API_KEY=your_whatsapp_key
   ADMIN_PHONE=admin_phone_number
   ```

## Running the Application

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Webhook Endpoints

- `POST /webhook`
  - Handles incoming WhatsApp messages
  - Processes booking requests
  - Validates package availability

- `POST /razorpaywebhook3`
  - Handles payment confirmations
  - Updates booking status
  - Sends confirmation messages

### Health Check

- `GET /health`
  - Checks service health

## Error Handling

The application includes comprehensive error handling:
- Input validation
- Request logging
- Error middleware
- Custom error classes

## Contributing

1. Create a feature branch
2. Make changes
3. Submit a pull request

## License

MIT 