import Course from "../models/Course.js";
import { deleteFile, cleanupCourseFiles } from "../utils/fileCleanup.js";
import { uploadImage, uploadVideo } from "../utils/cloudinaryUpload.js";

/* =========================
   Tutor: Create Course (Draft or Publish)
========================= */
export const createCourse = async (req, res) => {
  try {
    let courseData = req.body;

    // If data is sent via FormData as a string
    if (typeof req.body.courseData === "string") {
      courseData = JSON.parse(req.body.courseData);
    }

    console.log("Create Course Request:");
    console.log("Endpoint:", req.path);
    console.log("Raw Body Keys:", Object.keys(req.body));
    console.log(
      "Files:",
      req.files ? req.files.map((f) => f.fieldname) : "None",
    );
    console.log("Parsed Course Data:", JSON.stringify(courseData, null, 2));

    const {
      title,
      subtitle,
      description,
      category,
      level,
      price,
      language,
      chapters,
    } = courseData;

    let { status } = courseData;

    // Detect status from endpoint
    if (req.path.includes("save-draft")) status = "draft";
    if (req.path.includes("publish")) status = "published";

    let { thumbnail } = courseData;

    // Files are now handled via separate endpoints, so we expect URLs in the body
    // No inline file processing here

    // Conditional Validation
    if (status === "published") {
      if (!title || !description || !category || !subtitle) {
        return res.status(400).json({
          message:
            "Title, subtitle, description, and category are required to publish.",
        });
      }
      if (!chapters || chapters.length === 0) {
        return res.status(400).json({
          message: "At least one chapter is required to publish.",
        });
      }
      // Check that each chapter has at least one lesson
      for (const chapter of chapters) {
        if (!chapter.title) {
          return res.status(400).json({
            message: "All chapters must have a title to publish.",
          });
        }
        if (!chapter.lessons || chapter.lessons.length === 0) {
          return res.status(400).json({
            message: `Chapter "${chapter.title || "Untitled"}" must have at least one lesson to publish.`,
          });
        }
      }
    } else {
      // Draft requirements - minimal validation
      if (!title) {
        return res.status(400).json({
          message: "Title is required to save a draft.",
        });
      }
    }

    console.log(
      "User in Request:",
      req.user ? req.user._id : "Missing req.user",
    );

    // Sanitize enum fields to avoid empty string validation errors
    const sanitizedLevel = level && level.trim() !== "" ? level : undefined;
    const sanitizedLanguage =
      language && language.trim() !== "" ? language : undefined;

    const course = await Course.create({
      title,
      subtitle,
      description,
      category,
      level: sanitizedLevel,
      price: Number(price) || 0,
      language: sanitizedLanguage,
      thumbnail,
      chapters: chapters || [],
      status: status || "draft",
      publishedAt: status === "published" ? new Date() : undefined,
      tutor: req.user._id,
    });

    res.status(201).json({
      message:
        status === "published"
          ? "Course published successfully"
          : "Draft saved successfully",
      course,
    });
  } catch (error) {
    console.error("CREATE COURSE ERROR:", error);
    if (error.name === "ValidationError") {
      console.log("Validation Errors:", JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      message: "Failed to create course",
      error: error.message,
    });
  }
};

/* =========================
   Tutor: Get My Created Courses
========================= */
export const getTutorCourses = async (req, res) => {
  try {
    const tutorId = req.user._id;
    const { status } = req.query; // Filter by ?status=draft or ?status=published

    const query = { tutor: tutorId };
    if (status) {
      query.status = status;
    }

    const courses = await Course.find(query).sort({ updatedAt: -1 });
    res.status(200).json({ courses });
  } catch (error) {
    console.error("GET TUTOR COURSES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch tutor courses" });
  }
};

/* =========================
   Tutor: Update Course (Save Draft / Publish)
========================= */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorId = req.user._id;

    let course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.tutor.toString() !== tutorId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this course" });
    }

    let updateData = req.body;
    if (typeof req.body.courseData === "string") {
      updateData = JSON.parse(req.body.courseData);
    }

    // Detect target status from endpoint
    const isPublishing = req.path.includes("publish");
    const isSavingDraft = req.path.includes("save-draft");

    if (isSavingDraft) {
      updateData.status = "draft";
    } else if (isPublishing) {
      updateData.status = "published";
      updateData.publishedAt = new Date();
    }

    // ============================================
    // FILE CLEANUP - Delete old files when replaced
    // ============================================

    // ============================================
    // FILE CLEANUP - Delete old files if replaced
    // ============================================

    // 1. Thumbnail cleanup
    if (updateData.thumbnail && updateData.thumbnail !== course.thumbnail) {
      await deleteFile(course.thumbnail).catch((err) =>
        console.error("Thumbnail cleanup failed:", err.message),
      );
    }

    // 2. Video cleanup (simplified)
    // If we have chapters in update data, we should check for changed videos
    // This is complex to map perfectly, but sticking to "separate endpoints" means
    // the frontend has already uploaded new files.
    // We mainly want to avoid orphan files from the OLD course version.

    // For now, removing the file-based cleanup.
    // Ideally we would diff `course.chapters` vs `updateData.chapters`.

    // ============================================
    // VALIDATION
    // ============================================
    const currentStatus = updateData.status || course.status;
    if (currentStatus === "published") {
      const mergedData = {
        ...course.toObject(),
        ...updateData,
      };

      if (
        !mergedData.title ||
        !mergedData.description ||
        !mergedData.category ||
        !mergedData.subtitle
      ) {
        return res.status(400).json({
          message:
            "Title, subtitle, description, and category are required for published courses.",
        });
      }
      if (!mergedData.chapters || mergedData.chapters.length === 0) {
        return res.status(400).json({
          message: "At least one chapter is required to publish.",
        });
      }
      // Check that each chapter has at least one lesson
      for (const chapter of mergedData.chapters) {
        if (!chapter.title) {
          return res.status(400).json({
            message: "All chapters must have a title to publish.",
          });
        }
        if (!chapter.lessons || chapter.lessons.length === 0) {
          return res.status(400).json({
            message: `Chapter "${chapter.title || "Untitled"}" must have at least one lesson to publish.`,
          });
        }
      }
    } else {
      // Draft update requirement
      const mergedData = {
        ...course.toObject(),
        ...updateData,
      };
      if (!mergedData.title) {
        return res.status(400).json({
          message: "Title is required to save a draft.",
        });
      }
    }

    // Sanitize enum fields
    if (updateData.level === "") updateData.level = undefined;
    if (updateData.language === "") updateData.language = undefined;

    course = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: isPublishing
        ? "Course published successfully"
        : "Draft saved successfully",
      course,
    });
  } catch (error) {
    console.error("UPDATE COURSE ERROR:", error);
    if (error.name === "ValidationError") {
      console.log("Validation Errors:", JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res
      .status(500)
      .json({ message: "Failed to update course", error: error.message });
  }
};

/* =========================
   Tutor: Unpublish Course
========================= */
export const unpublishCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorId = req.user._id;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.tutor.toString() !== tutorId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to unpublish this course" });
    }

    if (course.status === "draft") {
      return res.status(400).json({ message: "Course is already a draft" });
    }

    course.status = "draft";
    await course.save();

    res.status(200).json({
      message: "Course unpublished successfully. It is now a draft.",
      course,
    });
  } catch (error) {
    console.error("UNPUBLISH COURSE ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to unpublish course", error: error.message });
  }
};

/* =========================
   Tutor: Delete Course
========================= */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorId = req.user._id;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.tutor.toString() !== tutorId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this course" });
    }

    // Clean up all associated files (thumbnail + videos)
    await cleanupCourseFiles(course);

    // Delete the course
    await Course.findByIdAndDelete(id);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("DELETE COURSE ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to delete course", error: error.message });
  }
};

/* =========================
   General: Get Course By ID 
========================= */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).populate("tutor", "name email");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (error) {
    console.error("GET COURSE BY ID ERROR:", error);
    res.status(500).json({ message: "Failed to fetch course details" });
  }
};

/* =========================
   Public: Get All Published Courses
========================= */
export const getPublishedCourses = async (req, res) => {
  try {
    const {
      category,
      level,
      language,
      search,
      page = 1,
      limit = 12,
    } = req.query;

    const query = { status: "published" };

    // Apply filters
    if (category) query.category = category;
    if (level) query.level = level;
    if (language) query.language = language;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate("tutor", "name email")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Course.countDocuments(query),
    ]);

    res.status(200).json({
      courses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("GET PUBLISHED COURSES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};
