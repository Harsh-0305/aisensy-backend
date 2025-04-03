import { google } from "googleapis";

// 1. Load and decode credentials
const credentialsBase64 = process.env.GOOGLE_CREDENTIALS;

if (!credentialsBase64) {
  console.error("❌ GOOGLE_CREDENTIALS environment variable is missing.");
  process.exit(1);
}

let credentialsJSON;
try {
  credentialsJSON = JSON.parse(
    Buffer.from(credentialsBase64, "base64").toString("utf8")
  );
} catch (error) {
  console.error("Failed to decode/parse GOOGLE_CREDENTIALS:", error.message);
  process.exit(1);
}

// 2. Validate required fields
const requiredFields = ["client_email", "private_key", "project_id"];
const missingFields = requiredFields.filter((field) => !credentialsJSON[field]);

if (missingFields.length > 0) {
  console.error("❌ Missing required credential fields:", missingFields.join(", "));
  process.exit(1);
}

// 3. Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: credentialsJSON,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// 4. Test authentication
(async () => {
  try {
    console.log("🔹 Attempting Google Sheets authentication...");
    
    // Get the auth client
    const authClient = await auth.getClient();
    console.log("✅ Auth client created successfully.");

    // Test listing spreadsheets (optional)
    const sheets = google.sheets({ version: "v4", auth: authClient });
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID, // Optional: Test with a real Sheet ID
      fields: "spreadsheetId,properties.title",
    });

    console.log("✅ Successfully accessed Google Sheets API!");
    console.log("📄 Spreadsheet Title:", response.data.properties.title);
    console.log("🆔 Spreadsheet ID:", response.data.spreadsheetId);
  } catch (error) {
    console.error("❌ Authentication or API access failed:", error.message);
    if (error.response?.data) {
      console.error("🔍 Details:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
})();