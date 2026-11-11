import cloudinary from "../config/cloudinary.js";

const ASSET_FOLDER = process.env.CLOUDINARY_FOLDER || "rooms";

export function uploadImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        asset_folder: ASSET_FOLDER,
        resource_type: "image",
        allowed_formats: ["jpg", "png", "webp"],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true, 
  });
  if (!["ok", "not found"].includes(result.result)) {
    throw new Error(`Cloudinary refused to delete ${publicId}: ${result.result}`);
  }
}