import dotenv from "dotenv";

dotenv.config();

export const whatsappConfig = {
  apiUrl: "https://api.interakt.ai/v1/public/message/",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Basic ${process.env.INTERAKT_API_KEY}`,
    "x-interakt-secret": process.env.INTERAKT_SECRET
  },
};
