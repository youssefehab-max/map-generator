import cloudinary from "../config/cloudinaryConfig.js";
import fs from "fs";


export const uploadToCloudinary = async (
  filePath: string,
  folder: string = "building_floors"
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
    });

    // Clean up temporary local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return result.secure_url;
  } catch (error) {
    // Ensure temporary file is removed if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Cloudinary Upload Error: ${(error as Error).message}`);
  }
};