import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller.js";
import {
  validateWebhookData,
  validateRazorpayWebhook,
} from "../middleware/validation.middleware.js";
import { requestLogger } from "../middleware/logging.middleware.js";

const router = Router();

// Apply logging middleware to all routes
router.use(requestLogger);

// Webhook routes with validation
router.post("/webhook", validateWebhookData, WebhookController.handleWebhook);
router.post(
  "/razorpaywebhook3",
  validateRazorpayWebhook,
  WebhookController.handleRazorpayWebhook,
);

export default router;
