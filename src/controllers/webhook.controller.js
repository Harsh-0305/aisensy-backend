import { WhatsAppService } from "../services/whatsapp.service.js";
import { BookingService } from "../services/booking.service.js";
import { UserModel } from "../models/user.model.js";
import { logger } from "../utils/logger.js";
import { MESSAGES } from "../constants/index.js";
import crypto from "crypto";
import axios from "axios";

export class WebhookController {
  static async handleWebhook(req, res) {
    try {
      const data = req.body.data;
      if (!data || !data.customer || !data.message) {
        return res.status(400).json({ error: "Invalid webhook data" });
      }

      const userName = data.customer.traits?.name || "Unknown User";
      const userPhone = `+91${data.customer.phone_number}`;
      let userMessage = data.message.message;

      let buttonTitle = "";
      const rawMessage = data.message?.message || "";

      if (rawMessage.startsWith("{") && rawMessage.endsWith("}")) {
        try {
          const parsedMessage = JSON.parse(rawMessage);
          buttonTitle = parsedMessage?.button_reply?.title
            ?.trim()
            .toLowerCase();
        } catch (error) {
          logger.error("Failed to parse button message:", error);
        }
      }

      if (!userMessage && buttonTitle) {
        userMessage = buttonTitle;
      }

      // Check for manage bookings (both button and text)
      if (buttonTitle === "manage bookings" || userMessage.toLowerCase().trim() === "manage bookings") {
        return await WebhookController.handleManageBookings(userPhone, res);
      }

      // Process booking request
      const packageNameMatch = userMessage.match(/Trip:\s*(.+)/i);
      const expCodeMatch = userMessage.match(
        /\(?\s*Experience\s*code[:\s]*([A-Z0-9]+)\s*\)?/i,
      );
      const dateMatch = userMessage.match(
        /Trip\s*Date[:\s]*([0-9]{2}-[A-Za-z]{3}-[0-9]{2})/i,
      );

      const trimmedMessage = userMessage.trim().toLowerCase();
      const greetings = ["hi", "hello", "hey"];
      const isGreetingOnly = greetings.includes(trimmedMessage);

      // Check if it's a valid booking request
      const isValidBookingRequest = packageNameMatch && expCodeMatch && dateMatch;

      if (!isValidBookingRequest && !isGreetingOnly) {
        await WhatsAppService.sendTextMessage(userPhone, {
          type: "InteractiveButton",
          data: {
            message: {
              type: "button",
              body: {
                text: `Hey there! 😊 I couldn't understand your message.\n\nYou can explore all our amazing trips at ⛰ Tripuva.com\n\nOr just reply with "Hi" to get started! 🚀`
              },
              action: {
                buttons: [
                  {
                    type: "reply",
                    reply: {
                      id: "manage_bookings",
                      title: "Manage Bookings"
                    }
                  }
                ]
              }
            }
          }
        });
        return res.status(200).json({ message: "Invalid request handled" });
      }

      if (isGreetingOnly) {
        await WhatsAppService.sendTextMessage(userPhone, {
          type: "InteractiveButton",
          data: {
            message: {
              type: "button",
              body: {
                text: `Hey ${userName} ! 👋\n\nWelcome to Tripuva! 🌍✨\n\nWe help you find amazing group travel experiences across India. Check out our latest trips. 🚀\n\nExplore Group Trips: Tripuva.com`
              },
              action: {
                buttons: [
                  {
                    type: "reply",
                    reply: {
                      id: "manage_bookings",
                      title: "Manage Bookings"
                    }
                  }
                ]
              }
            }
          }
        });
        
        return res.status(200).json({ message: "Greeting handled" });
      }

      // If we get here, it's a valid booking request
      const packageName = packageNameMatch[1].trim();
      const packageId = expCodeMatch[1].trim();
      const packageDate = dateMatch[1];

      try {
        const packageDetails = await BookingService.processBookingRequest(
          packageName,
          packageId,
          packageDate,
          userName,
          userPhone,
        );

        // Generate payment link
        const paymentLink = await WebhookController.generatePaymentLink(
          packageDetails,
          packageName,
          packageDate,
          packageId,
          userName,
          userPhone,
        );

        // Send payment message with image
        await WhatsAppService.sendImageMessage(
          userPhone,
          `Thank you for choosing us! ⭐\n\nTo proceed with your booking, please pay the advance amount of ₹${packageDetails.advance} using the link:\n\n${paymentLink}\n\nLooking forward to hosting you! ✨🌍`,
          "https://oahorqgkqbcslflkqhiv.supabase.co/storage/v1/object/public/package-assets/static%20assets/Tripuva%20(9).png"
        );

        res.status(200).json({
          paymentLink: paymentLink,
          paymentId: packageDetails.id,
        });
      } catch (error) {
        logger.error("Error processing booking request:", error);
        
        if (error.message === "No matching trip found") {
          await WhatsAppService.sendTextMessage(userPhone, MESSAGES.PACKAGE_NOT_FOUND);
          return res.status(200).json({ message: "Package not found handled" });
        }

        // For other errors, send a generic error message
        await WhatsAppService.sendTextMessage(
          userPhone,
          'Sorry, we encountered an error processing your request. Please try again or contact support.'
        );
        return res.status(500).json({ error: "Internal server error" });
      }
    } catch (error) {
      logger.error("Error processing webhook:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  }

  static async generatePaymentLink(
    packageDetails,
    packageName,
    packageDate,
    packageId,
    userName,
    userPhone,
  ) {
    try {
      const response = await axios.post(
        "https://api.razorpay.com/v1/payment_links",
        {
          amount: packageDetails.advance * 100,
          currency: "INR",
          description: `Payment for ${packageName} and date: ${packageDate} and Exp code: ${packageId}`,
          customer: {
            name: userName,
            contact: userPhone,
          },
          notify: { sms: true },
        },
        {
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        },
      );

      return response.data.short_url;
    } catch (error) {
      logger.error("Error generating payment link:", error);
      throw error;
    }
  }

  static async handleManageBookings(userPhone, res) {
    try {
      const user = await UserModel.findByPhone(userPhone);

      if (!user) {
        await WhatsAppService.sendTextMessage(
          userPhone,
          MESSAGES.USER_NOT_FOUND,
        );
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.booked_packages) {
        await WhatsAppService.sendTextMessage(userPhone, MESSAGES.NO_BOOKINGS);
        return res.status(200).json({ message: "No bookings" });
      }

      const packageList = user.booked_packages
        .map((pkg, index) => `${index + 1}. ${pkg}`)
        .join("\n");
      await WhatsAppService.sendTextMessage(
        userPhone,
        `🗺️ Here are your booked trips:\n\n${packageList}\n\nNeed help managing any of these? Just reply with "Hi" or visit Tripuva.com`,
      );

      return res.status(200).json({ message: "Bookings sent" });
    } catch (error) {
      logger.error("Error handling manage bookings:", error);
      throw error;
    }
  }

  static async handleRazorpayWebhook(req, res) {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const body = req.body;

      // Verify signature before processing
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      // Create HMAC with SHA256
      const hmac = crypto.createHmac("sha256", secret);
      
      // Use the raw request body for signature verification
      const rawBody = JSON.stringify(body);
      hmac.update(rawBody);
      
      // Get the digest in hex format
      const digest = hmac.digest("hex");

      // Compare the signatures
      if (digest !== signature) {
        logger.error("Invalid webhook signature. Expected:", digest, "Received:", signature);
        return res.status(400).json({ error: "Invalid signature" });
      }

      // Send acknowledgment only after signature verification
      res.status(200).json({ status: "received" });

      // Process the webhook
      await WebhookController.processRazorpayWebhook(body);
    } catch (error) {
      logger.error("Error processing Razorpay webhook:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }

  static async processRazorpayWebhook(body) {
    try {
      const event = body.event;
      if (event !== "payment_link.paid") {
        logger.info("Ignoring non-payment event:", event);
        return;
      }

      const entity = body.payload.payment_link.entity;
      const status = entity.status;

      if (status !== "paid") {
        logger.info("Ignoring non-paid status:", status);
        return;
      }

      const paymentId = entity.id;
      const userName = entity.customer.name;
      const userPhone = entity.customer.contact;
      const description = entity.description;

      // Parse booking details from description
      const bookingMatch = description.match(
        /^Payment for (.+?) and date: (.+?) and Exp code: (.+)$/i,
      );
      if (!bookingMatch) {
        logger.error("Invalid booking description format:", description);
        return;
      }

      const [, packageName, packageDate, packageId] = bookingMatch;

      // Process the successful payment
      await BookingService.handlePaymentSuccess({
        userName,
        userPhone,
        packageName: packageName.trim(),
        packageId: packageId.trim(),
        date: packageDate.trim(),
        paymentId,
        amount: entity.amount / 100, // Convert from paise to rupees
      });

      // Send payment success message with image
      await WhatsAppService.sendImageMessage(
        userPhone,
        `✨ Thank you for your Payment! ✨\n\nPayment Details:\n📝 ID: ${paymentId}\n💰 Amount: ₹${entity.amount / 100}\n\nThank you for your payment! We're processing your booking request and will confirm your slot shortly.\n\nWe'll keep you updated on the next steps. 😊`,
        "https://oahorqgkqbcslflkqhiv.supabase.co/storage/v1/object/public/package-assets/static%20assets/Tripuva%20(9).png"
      );
    } catch (error) {
      logger.error("Webhook processing failed:", error);
      throw error;
    }
  }
}
