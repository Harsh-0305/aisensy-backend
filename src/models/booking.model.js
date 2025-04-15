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
        booking_user_phone: bookingData.userPhone
      },
    ]);

    if (error) throw error;
    return data;
  }

  static async getBookingsByPhone(phoneNumber) {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        booking_id,
        booking_user_id,
        booking_user_name,
        booking_date,
        booking_package_id,
        booking_package_name,
        booking_adv_status,
        booking_package_start_date,
        booking_rm_status,
        booking_user_phone
      `)
      .eq("booking_user_phone", phoneNumber)
      .order("booking_date", { ascending: false });

    if (error) throw error;
    return data;
  }
}
