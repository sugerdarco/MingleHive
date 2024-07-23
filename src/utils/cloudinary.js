import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
import {ApiError} from "./apiError.js";
dotenv.config({path: '.env'});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });

        fs.unlinkSync(localFilePath);
        return response;
    } catch (err) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) {
            return "fileUrl required";
        }

        //regex to extract publicId
        const regex = /\/([^\/]+)\.[^\/]+$/;
        const match = fileUrl.match(regex);
        if (match && match[1]) {
            const publicId = match[1];
            await cloudinary.uploader.destroy(publicId)
        } else {
            throw new ApiError(400, "PublicId not found");
        }

    } catch (err) {
        throw new ApiError(400, "error while deleting the file.");
    }
}

export {uploadOnCloudinary, deleteFromCloudinary};