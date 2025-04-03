const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Load environment variables

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Google Sheets Authentication
const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json", // Make sure this file exists in your project
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // Your Google Sheet ID

// Function to fetch and sync table data
async function syncTable(tableName, sheetName) {
    try {
        console.log(`Syncing ${tableName} to ${sheetName}...`);

        // Fetch data from Supabase
        const { data, error } = await supabase.from(tableName).select("*");
        if (error) throw error;

        if (!data || data.length === 0) {
            console.log(`No data found for ${tableName}`);
            return;
        }

        // Convert Supabase data into array format for Sheets
        const headers = Object.keys(data[0]); // Get column names
        const rows = data.map(Object.values);

        // Write to Google Sheets
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [headers, ...rows] },
        });

        console.log(`✅ Synced ${tableName} successfully!`);
    } catch (error) {
        console.error(`❌ Error syncing ${tableName}:`, error.message);
    }
}

// Sync multiple tables
async function syncAllTables() {
    await syncTable("bookings", "Bookings");
    await syncTable("packages", "Packages");
    await syncTable("users", "Users");
}

// Run the sync
syncAllTables();
