import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  format?: string;
  resource_type: string;
}

/**
 * Uploads a video buffer/file to Cloudinary.
 * Used for server-side uploads.
 */
export async function uploadVideo(
  file: File | string, // Can be a File object or a local path/URL
  folder: string = 'narratix/videos'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    // If it's a File (from request.formData()), we need to convert to Buffer
    if (file instanceof File) {
      const reader = file.stream().getReader();
      const chunks: Uint8Array[] = [];
      
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const buffer = Buffer.concat(chunks);
        
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder,
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Upload failed'));
            }
            resolve(result as CloudinaryUploadResult);
          }
        );
        
        uploadStream.end(buffer);
      })().catch(reject);
    } else {
      // If it's a URL or server path
      cloudinary.uploader.upload(
        file,
        {
          resource_type: 'video',
          folder,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }
          resolve(result as CloudinaryUploadResult);
        }
      );
    }
  });
}
