import { supabase } from '../config/database.js';

export class PackageModel {
    static async checkDateAvailability(packageId, dateToCheck) {
        const { data, error } = await supabase
            .rpc('check_date_in_start_date_2', {
                pkg_id: packageId,
                date_to_check: dateToCheck,
            });
        
        if (error) throw error;
        return data;
    }

    static async getPackageDetails(title, packageId) {
        const { data, error } = await supabase
            .from('packages')
            .select('advance,title')
            .eq('title', title)
            .eq('package_id', packageId);

        if (error) throw error;
        return data?.[0];
    }

    static async updateSlotAvailability(packageId, startDateSlots) {
        const { error } = await supabase
            .from('packages')
            .update({ start_date_2: startDateSlots })
            .eq('package_id', packageId);

        if (error) throw error;
        return true;
    }
} 