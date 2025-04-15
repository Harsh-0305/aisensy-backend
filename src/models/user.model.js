import { supabase } from "../config/database.js";

export class UserModel {
  static async findByPhone(phoneNumber) {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, first_name, last_name, phone_number")
      .eq("phone_number", phoneNumber)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  static async create(userData) {
    const { data, error } = await supabase
      .from("users")
      .insert([{
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number
      }])
      .select("user_id, first_name, last_name, phone_number")
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
