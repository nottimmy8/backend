import { uploadImage, uploadVideo } from "../utils/cloudinaryUpload.js";

export const uploadImageHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image file provided" });
    }
    // upload.middleware use .any() or .single()? We'll assume .single('file') or similar
    // The previous middleware used .any(). We can stick to that or use .single().
    // If using .any(), req.files is array.

    const file = req.files[0];
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "File must be an image" });
    }

    const url = await uploadImage(file.buffer);
    res.status(200).json({ url });
  } catch (error) {
    console.error("Upload Image Error:", error);
    res
      .status(500)
      .json({ message: "Image upload failed", error: error.message });
  }
};

export const uploadVideoHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No video file provided" });
    }

    const file = req.files[0];
    if (!file.mimetype.startsWith("video/")) {
      return res.status(400).json({ message: "File must be a video" });
    }

    const url = await uploadVideo(file.buffer);
    res.status(200).json({ url });
  } catch (error) {
    console.error("Upload Video Error:", error);
    res
      .status(500)
      .json({ message: "Video upload failed", error: error.message });
  }
};
