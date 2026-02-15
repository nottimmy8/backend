import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  updateProfile,
  updatePassword,
  getWishlist,
  toggleWishlist,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protect); // Protect all routes

router.put("/profile", updateProfile);
router.put("/password", updatePassword);
router.get("/wishlist", getWishlist);
router.post("/wishlist/toggle", toggleWishlist);

export default router;
