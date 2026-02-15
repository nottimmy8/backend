import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import { createNotification } from "./notification.controller.js";

/**
 * @desc    Initiate enrollment (create pending enrollment)
 * @route   POST /api/enrollments/initiate
 * @access  Private (Student)
 */
export const initiateEnrollment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user._id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.status !== "published") {
      return res
        .status(400)
        .json({ message: "Course is not available for enrollment" });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: "completed",
    });

    if (existingEnrollment) {
      return res
        .status(400)
        .json({ message: "You are already enrolled in this course" });
    }

    // Create or update pending enrollment
    let enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: "pending",
    });

    if (!enrollment) {
      enrollment = await Enrollment.create({
        student: userId,
        course: courseId,
        amount: course.price,
        paymentStatus: "pending",
      });
    } else {
      enrollment.amount = course.price;
      await enrollment.save();
    }

    res.status(201).json({
      message: "Enrollment initiated successfully",
      enrollment,
    });
  } catch (error) {
    console.error("INITIATE ENROLLMENT ERROR:", error);
    res.status(500).json({
      message: "Failed to initiate enrollment",
      error: error.message,
    });
  }
};

/**
 * @desc    Verify payment and finalize enrollment
 * @route   POST /api/enrollments/verify
 * @access  Private (Student)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { enrollmentId, transactionId, status } = req.body;
    const userId = req.user._id;

    if (!enrollmentId || !transactionId) {
      return res
        .status(400)
        .json({ message: "Enrollment ID and Transaction ID are required" });
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment record not found" });
    }

    if (enrollment.student.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (enrollment.paymentStatus === "completed") {
      return res.status(400).json({ message: "Payment already verified" });
    }

    // In a real production scenario, you would verify the transactionId with a payment provider (Paystack, Stripe, etc.)
    // For this implementation, we assume the frontend sends the status from the payment provider hook.

    // ... (existing imports)

    // ...

    if (status === "success") {
      enrollment.paymentStatus = "completed";
      enrollment.transactionId = transactionId;
      await enrollment.save();

      // Add student to the course's students array
      await Course.findByIdAndUpdate(enrollment.course, {
        $addToSet: { students: userId },
      });

      // Notify the student
      await createNotification({
        recipient: userId,
        type: "enrollment",
        title: "Course Enrollment Successful",
        message: `You have successfully enrolled in the course. Happy learning!`,
        data: { courseId: enrollment.course },
      });

      // Notify the tutor (instructor)
      const course = await Course.findById(enrollment.course);
      if (course && course.instructor) {
        await createNotification({
          recipient: course.instructor,
          sender: userId,
          type: "enrollment",
          title: "New Student Enrolled",
          message: `A new student has enrolled in your course: ${course.title}`,
          data: { courseId: course._id, studentId: userId },
        });
      }

      res.status(200).json({
        message: "Enrollment completed successfully",
        enrollment,
      });
    } else {
      enrollment.paymentStatus = "failed";
      enrollment.transactionId = transactionId;
      await enrollment.save();

      res.status(400).json({
        message: "Payment verification failed",
        enrollment,
      });
    }
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    res.status(500).json({
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

/**
 * @desc    Check enrollment status
 * @route   GET /api/enrollments/check/:courseId
 * @access  Private (Student)
 */
export const checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: "completed",
    });

    res.status(200).json({
      isEnrolled: !!enrollment,
    });
  } catch (error) {
    console.error("CHECK ENROLLMENT ERROR:", error);
    res.status(500).json({ message: "Failed to check enrollment status" });
  }
};
