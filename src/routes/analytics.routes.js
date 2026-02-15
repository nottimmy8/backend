import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  getTutorAnalytics,
  getMyCertificates,
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.use(protect);

// Tutor Analytics
router.get("/tutor", authorize("tutor", "admin"), getTutorAnalytics);

// Student Certificates (Keep in analytics for now as grouped in controller, but route logically)
router.get("/certificates", getMyCertificates);

export default router;
