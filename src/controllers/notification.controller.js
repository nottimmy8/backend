import Notification from "../models/Notification.js";

// Get user notifications
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching notifications", error: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // If id is 'all', mark all as read
    if (id === "all") {
      await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true },
      );
      return res
        .status(200)
        .json({ message: "All notifications marked as read" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating notification", error: error.message });
  }
};

// Internal helper to create notification
export const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  data,
}) => {
  try {
    await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      data,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
