import User from "../models/User.js";
import Course from "../models/Course.js";
import bcrypt from "bcrypt";

// Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email, bio, headline, socialLinks, notificationPreferences } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email; // Note: In a real app, email change might require re-verification
    if (bio) user.bio = bio;
    if (headline) user.headline = headline;
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };
    if (notificationPreferences)
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences,
      };

    await user.save();

    // Return user without sensitive data
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.refreshToken;

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
};

// Update Password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid current password" });
    }

    user.password = newPassword; // Pre-save hook will hash it
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating password", error: error.message });
  }
};

// Get Wishlist
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "wishlist",
      select: "title price thumbnail instructor",
      populate: { path: "instructor", select: "name" },
    });

    res.status(200).json(user.wishlist);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching wishlist", error: error.message });
  }
};

// Toggle Wishlist Item
export const toggleWishlist = async (req, res) => {
  try {
    const { courseId } = req.body;
    const user = await User.findById(req.user._id);

    const isWishlisted = user.wishlist.includes(courseId);

    if (isWishlisted) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== courseId);
    } else {
      user.wishlist.push(courseId);
    }

    await user.save();

    res.status(200).json({
      message: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      wishlist: user.wishlist,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating wishlist", error: error.message });
  }
};
