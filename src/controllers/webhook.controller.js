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

      if (buttonTitle === "manage bookings") {
        return await this.handleManageBookings(userPhone, res);
      }

      // Process booking request
      const packageNameMatch = userMessage.match(/Trip:\s*(.+)/i);
      const expCodeMatch = userMessage.match(
        /\(?\s*Experience\s*code[:\s]*([A-Z0-9]+)\s*\)?/i,
      );
      const dateMatch = userMessage.match(
        /Trip\s*Date[:\s]*([0-9]{2}-[A-Za-z]{3}-[0-9]{2})/i,
      );

      if (
        !this.isValidBookingRequest(packageNameMatch, expCodeMatch, dateMatch)
      ) {
        await this.handleInvalidMessage(userPhone);
        return res
          .status(200)
          .json({ message: "Invalid booking request handled" });
      }

      const packageName = packageNameMatch[1].trim();
      const packageId = expCodeMatch[1].trim();
      const packageDate = dateMatch[1];

      const packageDetails = await BookingService.processBookingRequest(
        packageName,
        packageId,
        packageDate,
        userName,
        userPhone,
      );

      // Generate payment link
      const paymentLink = await this.generatePaymentLink(
        packageDetails,
        packageName,
        packageDate,
        packageId,
        userName,
        userPhone,
      );

      // Send payment message
      await WhatsAppService.sendImageMessage(
        userPhone,
        `Thank you for choosing us! 🌟\n\nTo proceed with your booking, please pay the advance amount of ₹${packageDetails.advance} using the link:\n\n${paymentLink}\n\nLooking forward to hosting you! ✨🌍`,
      );

      res.status(200).json({
        paymentLink: paymentLink,
        paymentId: packageDetails.id,
      });
    } catch (error) {
      logger.error("Error processing webhook:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
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
        `📚 Here are your booked trips:\n\n${packageList}\n\nNeed help managing any of these? Just reply with "Hi" or visit Tripuva.com`,
      );

      return res.status(200).json({ message: "Bookings sent" });
    } catch (error) {
      logger.error("Error handling manage bookings:", error);
      throw error;
    }
  }

  static isValidBookingRequest(packageNameMatch, expCodeMatch, dateMatch) {
    return packageNameMatch && expCodeMatch && dateMatch;
  }

  static async handleInvalidMessage(userPhone) {
    await WhatsAppService.sendTextMessage(userPhone, MESSAGES.INVALID_REQUEST);
  }

  static async generatePaymentLink(
    packageDetails,
    packageName,
    packageDate,
    packageId,
    userName,
    userPhone,
  ) {
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
  }

  static async handleRazorpayWebhook(req, res) {
    // Send immediate acknowledgment to Razorpay
    res.status(200).json({ status: "received" });

    try {
      const signature = req.headers["x-razorpay-signature"];
      await this.processRazorpayWebhook(req.body, signature);
    } catch (error) {
      logger.error("Error processing Razorpay webhook:", error);
    }
  }

  static async processRazorpayWebhook(body, signature) {
    try {
      // Verify signature
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(JSON.stringify(body));
      const digest = hmac.digest("hex");

      if (digest !== signature) {
        logger.error("Invalid webhook signature");
        return;
      }

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
    } catch (error) {
      logger.error("Webhook processing failed:", error);
      throw error;
    }
  }
}
