import { supabase } from "../config/database.js";

export class UserModel {
  static async findByPhone(phoneNumber) {
    const { data, error } = await supabase
      .from("users")
      .select("user_id,booked_packages")
      .eq("phone_number", phoneNumber)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  static async create(userData) {
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
      .update({ booked_package: updatedPackages })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }
}
