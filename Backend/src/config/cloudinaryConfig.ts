import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();


console.log("Cloud Name Loaded:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key Loaded:", process.env.CLOUDINARY_API_KEY ? "YES" : "NO");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
  secure:true,
});

export default cloudinary;
