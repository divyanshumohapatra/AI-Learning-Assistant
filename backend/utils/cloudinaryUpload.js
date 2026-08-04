import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import crypto from "crypto";

/**
 * Upload any file buffer to Cloudinary
 */
export const uploadFileToCloudinary = (
    buffer,
    {
        folder = "documents",
        resourceType = "raw",
        originalName = "file",
    } = {}
) => {

    return new Promise((resolve, reject) => {
        const extension =
            originalName.split(".").pop();

        const publicId =
            `${crypto.randomUUID()}.${extension}`;
        const uploadStream =
            cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: resourceType,
                    public_id: publicId,
                    overwrite: false,
                },
                (error, result) => {
                    if (error)
                        return reject(error);
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        bytes: result.bytes,
                        format: result.format,
                        createdAt: result.created_at,
                    });
                }
            );

        streamifier
            .createReadStream(buffer)
            .pipe(uploadStream);

    });
};