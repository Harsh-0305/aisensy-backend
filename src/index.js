import express from 'express';
import dotenv from 'dotenv';
import { handleAISensyWebhook } from './controllers/webhookController.js';
import { getPackageById } from './services/packageService.js';

dotenv.config();

const app = express();
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the API',
    endpoints: {
      webhook: '/webhook/aisensy',
      testPackage: '/test/package/:packageId'
    }
  });
});

// Webhook endpoint for AISensy
app.post('/webhook/aisensy', handleAISensyWebhook);

// Test endpoint
app.get('/test/package/:packageId', async (req, res) => {
  try {
    const packageId = req.params.packageId;
    const packageDetails = await getPackageById(packageId);
    
    if (!packageDetails) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.status(200).json(packageDetails);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});