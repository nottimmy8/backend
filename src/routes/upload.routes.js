import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import {
  uploadImageHandler,
  uploadVideoHandler,
} from "../controllers/upload.controller.js";

const router = express.Router();

// Routes
router.post(
  "/image",
  protect,
  authorizeRoles("tutor", "admin"),
  upload.any(), // Using any() to be flexible, but controller expects 1 file
  uploadImageHandler,
);

router.post(
  "/video",
  protect,
  authorizeRoles("tutor", "admin"),
  upload.any(),
  uploadVideoHandler,
);

export default router;
