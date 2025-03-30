import { getPackageByName } from '../services/packageService.js';
import { createBooking } from '../services/bookingService.js';

export async function handleAISensyWebhook(req, res) {
  try {
    const { userId, packageName } = req.body;

    // Get package details from Supabase
    const packageDetails = await getPackageByName(packageName);
    
    if (!packageDetails) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Create a booking record
    const booking = await createBooking(userId, packageDetails.package_id);

    // Prepare response for AISensy
    const response = {
      packageAmount: packageDetails.package_amount,
      bookingId: booking.booking_id,
      message: `Package ${packageName} costs ₹${packageDetails.package_amount}`
    };

    // Send response back to AISensy
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}