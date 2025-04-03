import { google } from "googleapis";

// Decode Base64 credentials
const credentialsBase64 = process.env.GOOGLE_CREDENTIALS;

if (!credentialsBase64) {
  throw new Error("GOOGLE_CREDENTIALS environment variable is not set.");
}

// Convert Base64 string to JSON
const credentialsJSON = JSON.parse(Buffer.from(credentialsBase64, "base64").toString("utf8"));

// Authenticate Google API
const auth = new google.auth.GoogleAuth({
  credentials: credentialsJSON,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Adjust scope as needed
});

// Export authenticated Google API client
export const sheets = google.sheets({ version: "v4", auth });
export default auth;
