import { logger } from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request details
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Log request body if present
  if (req.body && Object.keys(req.body).length > 0) {
    logger.info("Request Body:", JSON.stringify(req.body, null, 2));
  }

  // Capture response
  const oldSend = res.send;
  res.send = function () {
    // Log response
    const duration = Date.now() - start;
    logger.info(`[${new Date().toISOString()}] Response sent in ${duration}ms`);
    logger.info("Status:", res.statusCode);

    // Call original send
    oldSend.apply(res, arguments);
  };

  next();
};
