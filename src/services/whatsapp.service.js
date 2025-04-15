import axios from "axios";
import { whatsappConfig } from "../config/whatsapp.js";
import { logger } from "../utils/logger.js";

export class WhatsAppService {
  static async sendTextMessage(phone, message) {
    try {
      // Handle interactive button messages
      if (typeof message === 'object' && message.type === "InteractiveButton") {
        const messageText = message.data.message.body.text;
        if (messageText.length > 1024) {
          logger.warn("Message exceeds 1024 characters, truncating...");
          message.data.message.body.text = messageText.substring(0, 1021) + "...";
        }

        const response = await axios.post(
          whatsappConfig.apiUrl,
          {
            countryCode: "+91",
            phoneNumber: phone.replace("+91", ""),
            callbackData: "response_sent",
            type: "InteractiveButton",
            data: {
              message: message.data.message.body.text,
              preview_url: false,
              buttons: message.data.message.action.buttons
            },
          },
          {
            headers: whatsappConfig.headers,
          },
        );
        logger.info("Interactive message sent successfully:", response.data);
        return response.data;
      }

      // Handle regular text messages
      if (typeof message === 'string' && message.length > 1024) {
        logger.warn("Message exceeds 1024 characters, truncating...");
        message = message.substring(0, 1021) + "...";
      }

      const response = await axios.post(
        whatsappConfig.apiUrl,
        {
          countryCode: "+91",
          phoneNumber: phone.replace("+91", ""),
          callbackData: "response_sent",
          type: "Text",
          data: {
            message: message,
            preview_url: false,
          },
        },
        {
          headers: whatsappConfig.headers,
        },
      );
      logger.info("Message sent successfully:", response.data);
      return response.data;
    } catch (error) {
      logger.error("Error sending message:", error.response?.data || error);
      throw error;
    }
  }

  static async sendImageMessage(phone, message, imageUrl) {
    try {
      if (typeof message === 'string' && message.length > 1024) {
        logger.warn("Message exceeds 1024 characters, truncating...");
        message = message.substring(0, 1021) + "...";
      }

      const response = await axios.post(
        whatsappConfig.apiUrl,
        {
          countryCode: "+91",
          phoneNumber: phone.replace("+91", ""),
          callbackData: "response_sent",
          type: "Image",
          data: {
            caption: message,
            mediaUrl:
              imageUrl ||
              "https://oahorqgkqbcslflkqhiv.supabase.co/storage/v1/object/public/package-assets/static%20assets/Tripuva%20(9).png",
            message: message,
          },
        },
        {
          headers: whatsappConfig.headers,
        },
      );
      logger.info("Image sent successfully:", response.data);
      return response.data;
    } catch (error) {
      logger.error("Error sending image:", error.response?.data || error);
      throw error;
    }
  }
}
