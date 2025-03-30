import { supabase } from '../config/supabase.js';

export async function createBooking(userId, packageId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          user_id: userId,
          package_id: packageId,
          booking_date: new Date().toISOString(),
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}