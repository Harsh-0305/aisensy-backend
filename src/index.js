import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'; // Missing supabase client
import fetch from 'node-fetch'; // Missing fetch import
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


app.post("/webhook", async (req, res) => {
  try {

    //  console.log("Working");
    //  console.log("Incoming Webhook Data:", req.body);
    //  console.log("Customer Traits:", req.body.data.customer.traits);

      
      const data = req.body.data;
      if(!data || !data.customer || !data.message){
        return res.status(400).json({ error: "Invalid webhook data" });
      }

      const userName = req.body.data.customer.traits?.name || "Unknown User";
      const userPhone = `+91${req.body.data.customer.phone_number}`
      const userMessage = req.body.data.message.message;

        const packageNameMatch = userMessage.match(/Trip:\s*(.+)/i);
        const expCodeMatch = userMessage.match(/\(?\s*Experience\s*code[:\s]*([A-Z0-9]+)\s*\)?/i);
        const dateMatch = userMessage.match(/Trip\s*Date[:\s]*([0-9]{2}-[A-Za-z]{3}-[0-9]{2})/i);

        console.log(dateMatch);
        
        const packagen = packageNameMatch ? packageNameMatch[1].trim() : null;
        const packageDate = dateMatch ? dateMatch[1] : null;
        

let userPackageId = "";

if (expCodeMatch && expCodeMatch[1]) {
  userPackageId = expCodeMatch[1];
}

const packageNameId = userPackageId.trim();

{/*  Trip Details Check  - Begin*/}

const { data: pkg3, error: pkgError3 } = await supabase
  .rpc('check_date_in_start_date_2', {
    pkg_id: userPackageId,
    date_to_check: packageDate,
  });

if (pkgError3) {
  console.error('Error checking date in start_date_2:', pkgError3);
  return res.status(500).json({ error: 'Something went wrong checking the date' });
}

  if (pkgError3) {
    console.error("Supabase query error:", pkgError3);
    return res.status(500).json({ error: "Database error" });
  }
  
  if (!pkg3 || pkg3.length === 0) {
    const notFoundMsg = "No matching trip found 😔\n\nPlease check the trip details\n\nYou can explore more trips at Tripuva.com 🚀";
    await sendWhatsAppMessage1(userPhone, notFoundMsg);
    return res.status(404).json({ error: "Package not found" });
  }

  if(pkg3){console.log("Valid Trip");

  }

  {/*  Trip Details Check  - End*/}


// const packageNotFoundMessage = `We couldn’t find any trips matching the provided details. Please double-check the information or explore available options at Tripuva.com`;


      console.log("Name", userName);
      //console.log("Phone", userPhone);
      //console.log("Package Id", userPackageId);
      console.log("Trip Date:",packageDate);

      

      const { data: pkgData, error: pkgError } = await supabase
      .from('packages')
      .select('advance,title')
      .eq('title', packagen)
      .eq('package_id', packageNameId);
      

    if (pkgError) {
      console.error("Supabase query error:",pkgError);
      return res.status(500).json({error: "Database error"});
    }
    if (!pkgData || pkgData.length === 0) {
      console.warn("Package not found");
      await sendWhatsAppMessage1(userPhone, packageNotFoundMessage);
      return res.status(404).json({ error: 'Package not found' });
    }

    const pkg = pkgData[0];

    const packageAmount = pkg.advance
    const packageName = pkg.title

    //console.log("Advance: ",packageAmount);
    //console.log("Name: ",packageName);

    const amount = pkg.advance * 100;

    const response = await axios.post(
      'https://api.razorpay.com/v1/payment_links',
      {
        amount: amount,
        currency: 'INR',
        description: `Payment for ${packageName} and date: ${packageDate} and Exp code: ${packageNameId}`,
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

    const paymentLink = response.data.short_url;
    const responseMessage1 = `Thank you for choosing us! 🌟\n\nTo proceed with your booking, please pay the advance amount of ₹${packageAmount} using the link:\n\n${paymentLink}\n\nLooking forward to hosting you! ✨🌍`; 

    const messageSent1 = await sendWhatsAppMessage2(userPhone," ", responseMessage1);

   if (!messageSent1) {
        return res.status(500).json({ error: "Failed to send WhatsApp message to the customer" });
    }

  {/*}  if (!messageSent2) {
      return res.status(500).json({ error: "Failed to send WhatsApp message to the admin" });
  } */}

    //  console.log("Incoming Webhook Data:", userMessage);
      res.status(200).json({
        paymentLink: response.data.short_url,
        paymentId: response.data.id
      }); // Print response in console 
      
  } catch (error) {
      console.error("Error processing webhook:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
    }
  } 
});


const sendWhatsAppMessage1 = async (phone, message) => {
  try {
      const response = await axios.post(
          "https://api.interakt.ai/v1/public/message/",
          {
            userId: "", // Optional, keep empty if not needed
            fullPhoneNumber: phone,
            callbackData: "response_sent",
            type: "Text",
            data: {
                message: message,
                preview_url: false
            }
          },
          {
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Basic dU9OWUI3bEtRbmFhM0t6VWViSWlBVVRyN09COG1sNENzdHVnalAtQkdBSTo="
              }
          }
      );

      console.log("Message sent successfully:", response.data);
  } catch (error) {
      console.error("Error sending message:", error.response ? error.response.data : error);
  }
};

const sendWhatsAppMessage2 = async (phone, imageUrl,  message) => {
  try {
    const response = await axios.post(
      "https://api.interakt.ai/v1/public/message/",
      {
        userId: "",
        fullPhoneNumber: phone,
        callbackData: "response_sent",
        type: "Image",
        data: {
           // Public image URL (JPEG, PNG)
          caption: message,
          mediaUrl: "https://oahorqgkqbcslflkqhiv.supabase.co/storage/v1/object/public/package-assets/static%20assets/Tripuva%20(9).png",
          message: message
          // Optional caption
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic dU9OWUI3bEtRbmFhM0t6VWViSWlBVVRyN09COG1sNENzdHVnalAtQkdBSTo="
        }
      }
    );

    console.log("✅ Image sent successfully:", response.data);
  } catch (error) {
    console.error("❌ Error sending image:", error.response ? error.response.data : error);
  }
};




app.post('/razorpaywebhook2', async (req, res) => {

  res.status(200).json({ status: 'received' });

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
    
    const description = req.body.payload.payment_link.entity.description;

    const bookingMatch = description.match(/^Payment for (.+?) and date: (.+?) and Exp code: (.+)$/i);

    const bookingPackageName = bookingMatch[1].trim();
    const bookingPackageDate = bookingMatch[2].trim();
    const bookingExpCode = bookingMatch[3].trim();
    console.log("Package:", bookingPackageName);
    console.log("Date:", bookingPackageDate);
      


    // ✅ Process only if payment is successful
    if (event === 'payment_link.paid' && status === 'paid') {
      console.log(`✅ Payment received!`);
      console.log(`Payment ID: ${paymentId}`);
      console.log(`User Name: ${userName}`);
      console.log(`User Phone: ${userPhone}`);
      console.log(`Package Name: ${packageName}`);
      console.log(`Package:", ${bookingPackageName}`);
      console.log(`Date:", ${bookingPackageDate}`);
      console.log(`Exp Code:", ${bookingExpCode}`);

      const nameParts = userName.split(' ');

      const userFirstName = nameParts[0];
      const userLastName = nameParts.slice(1).join(' ') || ''; // Handles cases where there's no last name

{/* BEGIN  */}


// 🔹 Step 1: Decrement the available slot for the selected date
const { data: packageData, error: fetchPackageError } = await supabase
  .from('packages')
  .select('start_date_2')
  .eq('package_id', bookingExpCode)
  .single();

if (fetchPackageError || !packageData?.start_date_2) {
  console.error('❌ Error fetching start_date_2:', fetchPackageError);
} else {
  const startDateSlots = packageData.start_date_2;

  // Check if the selected date exists
  if (startDateSlots[bookingPackageDate] !== undefined && startDateSlots[bookingPackageDate] > 0) {
    startDateSlots[bookingPackageDate] -= 1;

    const { error: updateError } = await supabase
      .from('packages')
      .update({ start_date_2: startDateSlots })
      .eq('package_id', bookingExpCode);

    if (updateError) {
      console.error('❌ Error updating available slots:', updateError);
    } else {
      console.log(`🛎️ Slot updated for ${bookingPackageDate}. Remaining slots: ${startDateSlots[bookingPackageDate]}`);
    }
  } else {
    console.warn(`⚠️ No available slot to decrement for ${bookingPackageDate} or date not found`);
  }
}





{/*  END    */}









      const { data: pkg2, error: pkgError2 } = await supabase
      .from('packages')
      .select('advance')
      .eq('package_id', bookingExpCode)
      .single();

    if (pkgError2) throw pkgError2;
    if (!pkg2) return res.status(404).json({ error: 'Package not found' });

    const amount = pkg2.advance * 100; // Convert to paise

    console.log(`Amount:", ${amount}`);

      // Send WhatsApp message

      const responseMessage2 = ` ✅ Thank you for your payment.\nPayment Id: ${paymentId}\n\nWe’ll confirm your slot shortly and let you know the next steps.\n\nStay tuned 😊`;
      const responseMessage3 = `A booking payment has been received of ₹${pkg2.advance} for ${packageName} from ${userName}`;

      const adminPhone = "918094556379";
      

      await sendWhatsAppMessage1(userPhone, responseMessage2);
      await sendWhatsAppMessage1(adminPhone, responseMessage3);
      

      //await sendConfirmationWhatsAppMessage(userPhone, userFirstName, packageName, paymentId, amount);


      // 🔹 Step 1: Check if User Exists in Users Table
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('first_name', userFirstName)
        .single();

      // 🔹 Step 2: If User Does Not Exist, Create New User
      if (userError || !user) {
        console.log(`👤 User ${userName} not found. Creating a new user...`);

        const { data: newUser, error: newUserError } = await supabase
          .from('users')
          .insert([{ first_name: userFirstName, last_name: userLastName, phone_number: userPhone }])
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
    {/*}  const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select('package_id')
        .eq('title', bookingPackageName)
        .single();

      if (pkgError || !pkg) {
        console.error('Package not found:', pkgError);
        return res.status(404).json({ error: 'Package not found' });
      }
        */}

      // 🔹 Step 4: Insert Booking into Bookings Table
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            booking_user_id: user.user_id,
            booking_user_name: userName,
            booking_date: new Date().toISOString(),
            booking_package_id: bookingExpCode,
            booking_package_name: bookingPackageName,
            booking_adv_status: 'Paid',
            booking_package_start_date: bookingPackageDate,
            booking_rm_status: 'Pending', // Assuming remaining payment is still pending
          }
        ]);

      if (bookingError) {
        console.error('Error inserting booking:', bookingError);
        return res.status(500).json({ error: 'Failed to insert booking' });
      }

     // 🔹 Step 5: Update User's booked_package in users table
     const { error: updateError } = await supabase
  .from('users')
  .update({
    booked_package: supabase.rpc('array_append', {
      column: 'booked_package',  // Column name (PostgreSQL array)
      value: packageName          // New value to append
    })
  })
  .eq('user_id', user.user_id);

if (updateError) {
  console.error('Failed to append package:', updateError);
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

app.get('/health', (req, res) => {
  console.log('Health check received at:', new Date().toISOString());
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


app.post('/razorpaywebhook3', async (req, res) => {
  res.status(200).json({ status: 'received' }); // 🔹 Early ACK to Razorpay

  processRazorpayWebhook(req.body, req.headers['x-razorpay-signature']);
});









async function processRazorpayWebhook(body, signature) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 🔐 Signature Verification (raw body preferred!)
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(body)); // ⚠️ Should be `req.body` as raw
    const digest = hmac.digest('hex');

    if (digest !== signature) {
      console.error("❌ Invalid webhook signature");
      return;
    }

    const event = body.event;
    const paymentId = body.payload.payment_link.entity.id;
    const status = body.payload.payment_link.entity.status;
    const userName = body.payload.payment_link.entity.customer.name;
    const userPhone = body.payload.payment_link.entity.customer.contact;
    const packageName = body.payload.payment_link.entity.description.replace("Payment for ", "");
    
    const description = body.payload.payment_link.entity.description;

    const bookingMatch = description.match(/^Payment for (.+?) and date: (.+?) and Exp code: (.+)$/i);

    const bookingPackageName = bookingMatch[1].trim();
    const bookingPackageDate = bookingMatch[2].trim();
    const bookingExpCode = bookingMatch[3].trim();
    console.log("Package:", bookingPackageName);
    console.log("Date:", bookingPackageDate);

    

    if (event === 'payment_link.paid' && status === 'paid') {
      // 🧠 Move all your booking logic here like before
      // Send WhatsApp, update slots, insert bookings etc.
      console.log(`✅ Payment received!`);
      console.log(`Payment ID: ${paymentId}`);
      console.log(`User Name: ${userName}`);
      console.log(`User Phone: ${userPhone}`);
      console.log(`Package Name: ${packageName}`);
      console.log(`Package:", ${bookingPackageName}`);
      console.log(`Date:", ${bookingPackageDate}`);
      console.log(`Exp Code:", ${bookingExpCode}`);

      const nameParts = userName.split(' ');

      const userFirstName = nameParts[0];
      const userLastName = nameParts.slice(1).join(' ') || '';

      const { data: packageData, error: fetchPackageError } = await supabase
     .from('packages')
     .select('start_date_2,advance')
     .eq('package_id', bookingExpCode)
     .single();
        
     if (fetchPackageError || !packageData?.start_date_2) {
      console.error('❌ Error fetching start_date_2:', fetchPackageError);
    }else {
      const startDateSlots = packageData.start_date_2;

        console.log(startDateSlots);
        console.log(startDateSlots[bookingPackageDate]);
        console.log(bookingMatch);
        console.log(description);

      if (startDateSlots[bookingPackageDate] !== undefined && startDateSlots[bookingPackageDate] > 0) {
        startDateSlots[bookingPackageDate] -= 1;

      
      const { error: updateError } = await supabase
      .from('packages')
      .update({ start_date_2: startDateSlots })
      .eq('package_id', bookingExpCode);


      if (updateError) {
        console.error('❌ Error updating available slots:', updateError);
      } else {
        console.log(`🛎️ Slot updated for ${bookingPackageDate}. Remaining slots: ${startDateSlots[bookingPackageDate]}`);
      }
    } else {
      console.warn(`⚠️ No available slot to decrement for ${bookingPackageDate} or date not found`);
    }
  }
  
    const amount = pkgData.advance * 100;

    onsole.log(`Amount:", ${amount}`);

    // Send WhatsApp message

    const responseMessage2 = ` ✅ Thank you for your payment.\nPayment Id: ${paymentId}\n\nWe’ll confirm your slot shortly and let you know the next steps.\n\nStay tuned 😊`;
    const responseMessage3 = `A booking payment has been received of ₹${pkg2.advance} for ${bookingPackageName} from ${userName}`;

    const adminPhone = "918094556379";

    await sendWhatsAppMessage1(userPhone, responseMessage2);
    await sendWhatsAppMessage1(adminPhone, responseMessage3);

    // Step 2: Check if User Exists in Users Table

    let { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('phone_number', userPhone)
        .single();

    // Step 3: If User Does Not Exist, Create New User

    if (userError || !user) {
      console.log(`👤 User ${userPhone} not found. Creating a new user...`);

      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .insert([{ first_name: userFirstName, last_name: userLastName, phone_number: userPhone }])
        .select('user_id')
        .single();

      if (newUserError) {
        console.error('Error creating new user:', newUserError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser; // Assign new user data
      console.log(`✅ New user created: ${userName} (ID: ${user.user_id})`);
    }

    else {
      console.log("User already exists");
    }






    



    }
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
  }

}



