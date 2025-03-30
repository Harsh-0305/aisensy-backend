import express from 'express';
import dotenv from 'dotenv';
import { handleAISensyWebhook } from './controllers/webhookController.js';
import { getPackageById } from './services/packageService.js';
import { createClient } from '@supabase/supabase-js'; // Missing supabase client
import fetch from 'node-fetch'; // Missing fetch import

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Supabase client (missing in your code)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the API',
    endpoints: {
      webhook: '/webhook/aisensy',
      testPackage: '/test/package/:packageId',
      razorpayWebhook: '/razorpay-webhook' // Added this endpoint to documentation
    }
  });
});

// Webhook endpoint for AISensy
app.post('/webhook/aisensy', handleAISensyWebhook);

// Razorpay webhook endpoint (moved after app initialization)
app.post('/razorpay-webhook', async (req, res) => {
  try {
    // Verify Razorpay signature
    const crypto = require('crypto');
    const razorpaySignature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (razorpaySignature !== expectedSignature) {
      return res.status(403).send('Invalid signature');
    }

    // Extract details from payload
    const { payload } = req.body;
    const payment = payload.payment.entity;
    const userPhone = payment.notes.user_phone;
    const packageId = payment.notes.package_id;

    if (!userPhone || !packageId) {
      return res.status(400).send('Missing user_phone or package_id in notes');
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'paid' })
      .eq('package_id', packageId);

    if (updateError) throw updateError;

    // Get package details
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('package_name, package_amount')
      .eq('package_id', packageId)
      .single();

    if (pkgError) throw pkgError;
    if (!pkg) return res.status(404).send('Package not found');

    // Send WhatsApp confirmation
    const message = `✅ Payment of ₹${pkg.package_amount} for ${pkg.package_name} confirmed!\nBooking ID: ${payment.id}`;
    
   
    res.status(200).json({
      sentMessage: message // This will be printed in Postman
    });
  } catch (error) {
    console.error('Error in razorpay-webhook:', error);
    res.status(500).send('Internal server error');
  }
});

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