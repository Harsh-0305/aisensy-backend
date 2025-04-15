import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js"; // Missing supabase client
import fetch from "node-fetch"; // Missing fetch import
import crypto from "crypto";
import webhookRoutes from "./routes/webhook.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/logging.middleware.js";
import { logger } from "./utils/logger.js";
import { WebhookController } from "./controllers/webhook.controller.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(requestLogger);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Routes
app.use("/", webhookRoutes);

// Error handling middleware
app.use(errorHandler);

const port = process.env.PORT || 10000;
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
