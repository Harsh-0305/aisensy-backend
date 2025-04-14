import { WhatsAppService } from '../services/whatsapp.service.js';
import { BookingService } from '../services/booking.service.js';

export class WebhookController {
    static async handleWebhook(req, res) {
        try {
            const data = req.body.data;
            if (!data || !data.customer || !data.message) {
                return res.status(400).json({ error: "Invalid webhook data" });
            }

            const userName = data.customer.traits?.name || "Unknown User";
            const userPhone = `+91${data.customer.phone_number}`;
            const userMessage = data.message.message;
            
            let buttonTitle = '';
            const rawMessage = data.message?.message || '';

            if (rawMessage.startsWith('{') && rawMessage.endsWith('}')) {
                try {
                    const parsedMessage = JSON.parse(rawMessage);
                    buttonTitle = parsedMessage?.button_reply?.title?.trim().toLowerCase();
                } catch (error) {
                    console.error('Failed to parse button message:', error);
                }
            }

            if (!userMessage && buttonTitle) {
                userMessage = buttonTitle;
            }

            if (buttonTitle === 'manage bookings') {
                return await this.handleManageBookings(userPhone, res);
            }

            // Process booking request
            const packageNameMatch = userMessage.match(/Trip:\s*(.+)/i);
            const expCodeMatch = userMessage.match(/\(?\s*Experience\s*code[:\s]*([A-Z0-9]+)\s*\)?/i);
            const dateMatch = userMessage.match(/Trip\s*Date[:\s]*([0-9]{2}-[A-Za-z]{3}-[0-9]{2})/i);

            if (!this.isValidBookingRequest(packageNameMatch, expCodeMatch, dateMatch)) {
                await this.handleInvalidMessage(userPhone);
                return res.status(200).json({ message: 'Invalid booking request handled' });
            }

            const packageName = packageNameMatch[1].trim();
            const packageId = expCodeMatch[1].trim();
            const packageDate = dateMatch[1];

            const packageDetails = await BookingService.processBookingRequest(
                packageName, 
                packageId, 
                packageDate, 
                userName, 
                userPhone
            );

            // Generate payment link
            const paymentLink = await this.generatePaymentLink(packageDetails, packageName, packageDate, packageId, userName, userPhone);
            
            // Send payment message
            await WhatsAppService.sendImageMessage(
                userPhone,
                `Thank you for choosing us! 🌟\n\nTo proceed with your booking, please pay the advance amount of ₹${packageDetails.advance} using the link:\n\n${paymentLink}\n\nLooking forward to hosting you! ✨🌍`
            );

            res.status(200).json({
                paymentLink: paymentLink,
                paymentId: packageDetails.id
            });

        } catch (error) {
            console.error("Error processing webhook:", error);
            if (!res.headersSent) {
                res.status(500).send("Internal Server Error");
            }
        }
    }

    static async handleManageBookings(userPhone, res) {
        try {
            const user = await UserModel.findByPhone(userPhone);
            
            if (!user) {
                await WhatsAppService.sendTextMessage(
                    userPhone, 
                    `😕 Couldn't find your account. Please try booking again or reply with "Hi" to restart.`
                );
                return res.status(404).json({ error: 'User not found' });
            }

            if (!user.booked_packages) {
                await WhatsAppService.sendTextMessage(
                    userPhone,
                    `🧳 You haven't booked any trips yet.\n\nExplore exciting trips at Tripuva.com 🌍 or reply with "Hi" to get started.`
                );
                return res.status(200).json({ message: 'No bookings' });
            }

            const packageList = user.booked_packages.map((pkg, index) => `${index + 1}. ${pkg}`).join('\n');
            await WhatsAppService.sendTextMessage(
                userPhone,
                `📚 Here are your booked trips:\n\n${packageList}\n\nNeed help managing any of these? Just reply with "Hi" or visit Tripuva.com`
            );

            return res.status(200).json({ message: 'Bookings sent' });
        } catch (error) {
            console.error("Error handling manage bookings:", error);
            throw error;
        }
    }

    static isValidBookingRequest(packageNameMatch, expCodeMatch, dateMatch) {
        return packageNameMatch && expCodeMatch && dateMatch;
    }

    static async handleInvalidMessage(userPhone) {
        await WhatsAppService.sendTextMessage(
            userPhone,
            `Hey there! 😊 I couldn't understand your message.\n\nYou can explore all our amazing trips at ⛰️ Tripuva.com\n\nOr just reply with "Hi" to get started! 🚀`
        );
    }

    static async generatePaymentLink(packageDetails, packageName, packageDate, packageId, userName, userPhone) {
        const response = await axios.post(
            'https://api.razorpay.com/v1/payment_links',
            {
                amount: packageDetails.advance * 100,
                currency: 'INR',
                description: `Payment for ${packageName} and date: ${packageDate} and Exp code: ${packageId}`,
                customer: {
                    name: userName,
                    contact: userPhone
                },
                notify: { sms: true }
            },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET
                }
            }
        );

        return response.data.short_url;
    }
} 