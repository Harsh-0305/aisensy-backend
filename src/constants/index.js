export const WHATSAPP = {
  BASE_URL: "https://api.interakt.ai/v1/public/message/",
  MESSAGE_TYPES: {
    TEXT: "Text",
    IMAGE: "Image",
  },
  DEFAULT_IMAGE:
    "https://oahorqgkqbcslflkqhiv.supabase.co/storage/v1/object/public/package-assets/static%20assets/Tripuva%20(9).png",
};

export const BOOKING = {
  STATUS: {
    PAID: "Paid",
    PENDING: "Pending",
  },
};

export const MESSAGES = {
  INVALID_REQUEST:
    'Hey there! 😊 I couldn\'t understand your message.\n\nYou can explore all our amazing trips at ⛰️ Tripuva.com\n\nOr just reply with "Hi" to get started! 🚀',
  PACKAGE_NOT_FOUND:
    "No matching trip found 😔\n\nPlease check the trip details\n\nYou can explore more trips at Tripuva.com 🚀",
  PAYMENT_SUCCESS:
    "✨ Thank you for your Payment! ✨\n\nPayment Details:\n📝 ID: {paymentId}\n💰 Amount: ₹{amount}\n\nWe're processing your booking request and will confirm your slot shortly.\n\nWe'll keep you updated on the next steps. 😊",
  NO_BOOKINGS:
    '🧳 You haven\'t booked any trips yet.\n\nExplore exciting trips at Tripuva.com 🌍 or reply with "Hi" to get started.',
  USER_NOT_FOUND:
    '😕 Couldn\'t find your account. Please try booking again or reply with "Hi" to restart.',
  GREETING_RESPONSE:
    'Hey Vedant ! 👋\n\nWelcome to Tripuva! 🌍✨\n\nWe help you find amazing group travel experiences across India. Check out our latest trips. 🚀\n\nExplore Group Trips: Tripuva.com',
};
