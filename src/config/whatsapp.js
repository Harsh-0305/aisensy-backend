import dotenv from "dotenv";

dotenv.config();

export const whatsappConfig = {
  apiUrl: "https://api.interakt.ai/v1/public/message/",
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.WHATSAPP_API_KEY,
  },
};
