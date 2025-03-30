import { supabase } from '../config/supabase.js';

export async function getPackageByName(packageName) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('package_id, package_name, package_amount')
      .eq('package_name', packageName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching package:', error);
    throw error;
  }
}

export async function getPackageById(packageId) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('package_id, package_name, package_amount')
      .eq('package_id', packageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching package:', error);
    throw error;
  }
}