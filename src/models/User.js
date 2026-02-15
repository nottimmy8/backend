import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { type } from "os";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // very important for security
    },

    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetOtp: {
      type: String,
      select: false,
    },

    resetOtpExpiresAt: {
      type: Date,
    },

    resetOtpAttempts: {
      type: Number,
      default: 0,
    },
    // New Fields for Settings & Profile
    bio: {
      type: String,
      maxlength: 500,
    },
    headline: {
      type: String,
      maxlength: 100,
    },
    socialLinks: {
      website: String,
      twitter: String,
      linkedin: String,
      youtube: String,
    },
    notificationPreferences: {
      courseUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      messages: { type: Boolean, default: true },
    },
    paymentMethods: [
      {
        type: { type: String, default: "card" },
        last4: String,
        brand: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    // Wishlist
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    refreshToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
);

/* Hash password before save */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

/* Compare password */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
