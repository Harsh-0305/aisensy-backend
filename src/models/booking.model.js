import { supabase } from "../config/database.js";

export class BookingModel {
  static async create(bookingData) {
    const { data, error } = await supabase.from("bookings").insert([
      {
        booking_user_id: bookingData.userId,
        booking_user_name: bookingData.userName,
        booking_date: new Date().toISOString(),
        booking_package_id: bookingData.packageId,
        booking_package_name: bookingData.packageName,
        booking_adv_status: bookingData.advanceStatus || "Paid",
        booking_package_start_date: bookingData.startDate,
        booking_rm_status: bookingData.remainingStatus || "Pending",
      },
    ]);

    if (error) throw error;
    return data;
  }
}
