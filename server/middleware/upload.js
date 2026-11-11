import multer from "multer";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
  fileFilter(req, file, cb) {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
}).array("images", MAX_FILES_PER_REQUEST);

export function uploadImages(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: "Each image must be 5 MB or smaller",
        LIMIT_FILE_COUNT: `You can upload up to ${MAX_FILES_PER_REQUEST} images at a time`,
        LIMIT_UNEXPECTED_FILE: "Only JPG, PNG, or WebP images are allowed",
      };
      return res.status(400).json({ message: messages[error.code] || "Invalid upload" });
    }

    console.error("upload error:", error);
    res.status(500).json({ message: "Upload failed" });
  });
}