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

app.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Validate webhook signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(req.body));
    const digest = hmac.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Extract required details
    const event = req.body.event;
    const paymentId = req.body.payload.payment_link.entity.id;
    const status = req.body.payload.payment_link.entity.status;
    const userName = req.body.payload.payment_link.entity.customer.name;
    const userPhone = req.body.payload.payment_link.entity.customer.contact;
    const packageName = req.body.payload.payment_link.entity.description.replace("Payment for ", "");

    // ✅ Process only if payment is successful
    if (event === 'payment_link.paid' && status === 'paid') {
      console.log(`✅ Payment received!`);
      console.log(`Payment ID: ${paymentId}`);
      console.log(`User Name: ${userName}`);
      console.log(`User Phone: ${userPhone}`);
      console.log(`Package Name: ${packageName}`);

      // 🔹 Step 1: Check if User Exists in Users Table
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_name', userName)
        .single();

      // 🔹 Step 2: If User Does Not Exist, Create New User
      if (userError || !user) {
        console.log(`👤 User ${userName} not found. Creating a new user...`);

        const { data: newUser, error: newUserError } = await supabase
          .from('users')
          .insert([{ user_name: userName, user_phone: userPhone }])
          .select('user_id')
          .single();

        if (newUserError) {
          console.error('Error creating new user:', newUserError);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        user = newUser; // Assign new user data
        console.log(`✅ New user created: ${userName} (ID: ${user.user_id})`);
      }

      // 🔹 Step 3: Get Package ID from Packages Table
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select('package_id')
        .eq('package_name', packageName)
        .single();

      if (pkgError || !pkg) {
        console.error('Package not found:', pkgError);
        return res.status(404).json({ error: 'Package not found' });
      }

      // 🔹 Step 4: Insert Booking into Bookings Table
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            booking_user_id: user.user_id,
            booking_user_name: userName,
            booking_date: new Date().toISOString(),
            booking_package_id: pkg.package_id,
            booking_adv_status: 'Paid',
            booking_rm_status: 'Pending' // Assuming remaining payment is still pending
          }
        ]);

      if (bookingError) {
        console.error('Error inserting booking:', bookingError);
        return res.status(500).json({ error: 'Failed to insert booking' });
      }

      console.log(`✅ Booking inserted successfully for ${userName}`);

      return res.status(200).json({ success: true, message: 'Booking created' });
    }

    res.status(400).json({ error: 'Invalid payment event' });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

