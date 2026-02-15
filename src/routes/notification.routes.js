import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getUserNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", getUserNotifications);
router.put("/:id/read", markAsRead);

export default router;
