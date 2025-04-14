import { AppError } from "./error.middleware.js";

export const validateWebhookData = (req, res, next) => {
  const { data } = req.body;

  if (!data || !data.customer || !data.message) {
    return next(new AppError("Invalid webhook data format", 400));
  }

  const { customer, message } = data;

  // Validate customer data
  if (!customer.phone_number) {
    return next(new AppError("Phone number is required", 400));
  }

  // Validate message format for booking requests
  if (message.message) {
    const messageText = message.message;

    // If it's a booking request, validate the format
    if (messageText.includes("Trip:")) {
      const packageNameMatch = messageText.match(/Trip:\s*(.+)/i);
      const expCodeMatch = messageText.match(
        /\(?\s*Experience\s*code[:\s]*([A-Z0-9]+)\s*\)?/i,
      );
      const dateMatch = messageText.match(
        /Trip\s*Date[:\s]*([0-9]{2}-[A-Za-z]{3}-[0-9]{2})/i,
      );

      if (!packageNameMatch || !expCodeMatch || !dateMatch) {
        return next(new AppError("Invalid booking request format", 400));
      }
    }
  }

  next();
};

export const validateRazorpayWebhook = (req, res, next) => {
  const { event, payload } = req.body;

  if (
    !event ||
    !payload ||
    !payload.payment_link ||
    !payload.payment_link.entity
  ) {
    return next(new AppError("Invalid Razorpay webhook data", 400));
  }

  const { entity } = payload.payment_link;

  if (!entity.customer || !entity.customer.name || !entity.customer.contact) {
    return next(new AppError("Invalid customer data in payment", 400));
  }

  if (!entity.description || !entity.status) {
    return next(new AppError("Missing payment details", 400));
  }

  next();
};
