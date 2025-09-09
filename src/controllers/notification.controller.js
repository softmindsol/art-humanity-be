import Notification from '../models/notification.model.js';
import { ApiResponse } from '../utils/api.utils.js';

// User ki tamam notifications hasil karein
export const getUserNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.body.userId })
            .populate({
                path: 'project',
                select: 'canvasId title'
            })
            .populate('sender', 'fullName')
            .sort({ createdAt: -1 });
        res.status(200).json(new ApiResponse(200, notifications));
    } catch (err) { next(err); }
};

// Notification ko 'read' mark karein
export const markAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ recipient: req.body.userId, isRead: false }, { isRead: true });
        res.status(200).json(new ApiResponse(200, null, "All notifications marked as read."));
    } catch (err) { next(err); }
};
export const markSingleNotificationAsRead = async (req, res, next) => {
    try {
        // Step 1: URL se notification ki ID hasil karein
        const { notificationId } = req.params;
        // Step 2: Logged-in user ki ID hasil karein (security ke liye)
        const userId = req.body.userId;

        // Step 3: Database mein notification dhoondein aur update karein
        // Hum 'findOneAndUpdate' istemal karenge. Yeh dhoondne aur update karne ka kaam ek saath karta hai.
        const updatedNotification = await Notification.findOneAndUpdate(
            {
                _id: notificationId,      // Sirf is ID wali notification
                recipient: userId       // Aur yaqeeni banayein ke yeh notification isi user ki hai
            }, 
            { $set: { isRead: true } }, // 'isRead' ko true set kar do
            { new: true }               // Hamein update hone ke baad wala document wapas do
        ).populate({
            path: 'project',
            select: 'canvasId title'
        }).populate('sender', 'fullName');

        // Step 4: Check karein ke notification mili bhi ya nahi
        // Agar nahi mili (ya user ki nahi thi), to error bhejein
        if (!updatedNotification) {
            throw new ApiError(404, "Notification not found or you don't have permission to view it.");
        }

        // Step 5: Kamyabi ka response bhejein
        res.status(200).json(new ApiResponse(
            200,
            updatedNotification,
            "Notification marked as read."
        ));

    } catch (err) {
        next(err);
    }
};