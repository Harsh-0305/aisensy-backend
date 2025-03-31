import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { handleAISensyWebhook } from './controllers/webhookController.js';
import { getPackageById } from './services/packageService.js';
import { createClient } from '@supabase/supabase-js'; // Missing supabase client
import fetch from 'node-fetch'; // Missing fetch import
import crypto from 'crypto';


dotenv.config();

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/get-package-amount', async (req, res) => {
  try {
    const { packageName } = req.query;

    if (!packageName) {
      return res.status(400).json({ error: 'Missing packageName parameter' });
    }

    // Query Supabase for package amount
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('package_amount')
      .eq('package_name', packageName)
      .single();

    if (pkgError) throw pkgError;
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    res.status(200).json({ package_amount: pkg.package_amount });
  } catch (error) {
    console.error('Error fetching package amount:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch package amount' });
  }
});

// Create Razorpay Payment Link

app.post('/create-payment-link', async (req, res) => {
  try {
    const { userName, userPhone, packageName } = req.body;

    if (!userName || !userPhone || !packageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get package details from database
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('package_amount')
      .eq('package_name', packageName)
      .single();

    if (pkgError) throw pkgError;
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const amount = pkg.package_amount * 100; // Convert to paise

    // Create Razorpay Payment Link
    const response = await axios.post(
      'https://api.razorpay.com/v1/payment_links',
      {
        amount: amount,
        currency: 'INR',
        description: `Payment for ${packageName}`,
        customer: {
          name: userName,
          contact: userPhone
        },
        notify: { sms: true }
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET
        }
      }
    );

    res.status(200).json({
      paymentLink: response.data.short_url,
      paymentId: response.data.id
    });
  } catch (error) {
    console.error('Error creating payment link:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

app.post('/webhook', express.json({ type: 'application/json' }), async (req, res) => {
  try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET; // Set in .env
      const signature = req.headers['x-razorpay-signature'];
      const crypto = await import('crypto'); // Dynamic import to avoid issues
      
      // Validate webhook signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(JSON.stringify(req.body));
      const digest = hmac.digest('hex');

      if (digest !== signature) {
          return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body.event;
      const paymentId = req.body.payload.payment_link.entity.id;
      const status = req.body.payload.payment_link.entity.status;
      const userPhone = req.body.payload.payment_link.entity.customer.contact;

      if (event === 'payment_link.paid' && status === 'paid') {
          console.log(`Payment received! ✅`);
          console.log(`Payment ID: ${paymentId}`);
          console.log(`Status: ${status}`);
          console.log(`User Phone: ${userPhone}`);
      }

      res.status(200).json({ success: true });
  } catch (error) {
      console.error('Webhook Error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

