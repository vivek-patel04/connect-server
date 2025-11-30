import { v2 as cloudinary } from "cloudinary";
import { cloudinaryApiKey, cloudinaryApiSecret, cloudinaryName } from "./envConfig.js";

cloudinary.config({
    cloud_name: cloudinaryName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
});

export { cloudinary };
