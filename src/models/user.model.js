import { supabase } from "../config/database.js";

export class UserModel {
  static async findByPhone(phoneNumber) {
    // Remove any +91 prefix and ensure consistent format
    const cleanPhone = phoneNumber.replace("+91", "");
    
    const { data, error } = await supabase
      .from("users")
      .select("user_id,booked_packages")
      .eq("phone_number", cleanPhone)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  static async create(userData) {
    // Ensure phone number format is consistent
    if (userData.phone_number) {
      userData.phone_number = userData.phone_number.replace("+91", "");
    }
    
    const { data, error } = await supabase
      .from("users")
      .insert([userData])
      .select("user_id")
      .single();

    if (error) throw error;
    return data;
  }

  static async updateBookedPackages(userId, updatedPackages) {
    const { error } = await supabase
      .from("users")
      .update({ booked_packages: updatedPackages })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }
}
