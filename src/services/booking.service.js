import { PackageModel } from '../models/package.model.js';
import { UserModel } from '../models/user.model.js';
import { BookingModel } from '../models/booking.model.js';
import { WhatsAppService } from './whatsapp.service.js';

export class BookingService {
    static async processBookingRequest(
        packageName,
        packageId,
        date,
        userName,
        userPhone,
    ) {
    // Check package availability
        const availability = await PackageModel.checkDateAvailability(
            packageId,
            date,
        );
        if (!availability || availability.length === 0) {
            throw new Error('No matching trip found');
        }

        // Get package details
        const packageDetails = await PackageModel.getPackageDetails(
            packageName,
            packageId,
        );
        if (!packageDetails) {
            throw new Error('Package not found');
        }

        return packageDetails;
    }

    static async handlePaymentSuccess(paymentData) {
        const { userName, userPhone, packageName, packageId, date, amount } =
      paymentData;

        // Split name into first and last name
        const nameParts = userName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        // Find or create user
        let user = await UserModel.findByPhone(userPhone);
        if (!user) {
            user = await UserModel.create({
                first_name: firstName,
                last_name: lastName,
                phone_number: userPhone,
            });
        }

        // Create booking
        await BookingModel.create({
            userId: user.user_id,
            userName: userName,
            packageId: packageId,
            packageName: packageName,
            startDate: date,
        });

        // Update user's booked packages
        const userData = await UserModel.findByPhone(userPhone);
        if (userData) {
            const updatedPackages = [...(userData.booked_package || []), packageName];
            await UserModel.updateBookedPackages(user.user_id, updatedPackages);
        }

        // Send confirmation messages
        await this.sendBookingConfirmations(
            userPhone,
            userName,
            packageName,
            amount,
        );
    }

    static async sendBookingConfirmations(
        userPhone,
        userName,
        packageName,
        amount,
    ) {
        const userMessage =
      '✅ Thank you for your payment.\nWe\'ll confirm your slot shortly and let you know the next steps.\n\nStay tuned 😊';
        const adminMessage = `A booking payment has been received of ₹${amount} for ${packageName} from ${userName}`;

        await WhatsAppService.sendTextMessage(userPhone, userMessage);
        await WhatsAppService.sendTextMessage(
            process.env.ADMIN_PHONE,
            adminMessage,
        );
    }
}
