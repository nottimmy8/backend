import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Certificate from "../models/Certificate.js"; // You'll need to create this model later if not exists

// Get Tutor Analytics (Earnings)
export const getTutorAnalytics = async (req, res) => {
  try {
    const tutorId = req.user._id;

    // 1. Get all courses by this tutor
    const courses = await Course.find({ instructor: tutorId }).select(
      "_id title price",
    );
    const courseIds = courses.map((c) => c._id);

    // 2. Get enrollments for these courses
    const enrollments = await Enrollment.find({
      course: { $in: courseIds },
      paymentStatus: "completed",
    });

    // 3. Calculate total revenue
    const totalRevenue = enrollments.reduce(
      (acc, curr) => acc + curr.amount,
      0,
    );

    // 4. Calculate revenue by course
    const revenueByCourse = courses.map((course) => {
      const courseEnrollments = enrollments.filter(
        (e) => e.course.toString() === course._id.toString(),
      );
      const revenue = courseEnrollments.reduce((sum, e) => sum + e.amount, 0);
      return {
        _id: course._id,
        title: course.title,
        revenue,
        enrollmentCount: courseEnrollments.length,
      };
    });

    res.status(200).json({
      totalRevenue,
      totalEnrollments: enrollments.length,
      revenueByCourse,
      // Mock data for balance pending real payment gateway integration
      availableBalance: totalRevenue * 0.9, // Assuming 10% platform fee
      pendingClearance: totalRevenue * 0.1,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching analytics", error: error.message });
  }
};

// Get Student Certificates
export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.user._id })
      .populate("course", "title thumbnail")
      .sort({ createdAt: -1 });

    res.status(200).json(certificates);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching certificates", error: error.message });
  }
};
