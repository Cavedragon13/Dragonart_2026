
// --- CONFIGURATION ---

// The quality of the JPEG compression (0.0 to 1.0).
// Restored to high quality (0.8) for better visuals.
const IMAGE_QUALITY = 0.8; 

// The maximum width or height for the compressed image.
// Restored to 1024px since we are now using efficient reference storage.
const MAX_DIMENSION = 1024;

/**
 * Compresses and resizes a base64 image string for efficient storage.
 * This function is designed to significantly reduce the size of images
 * before they are saved to localStorage to avoid exceeding storage quotas.
 * 
 * @param imageBase64 The original base64 data URL of the image.
 * @returns A Promise that resolves with the new, compressed base64 data URL (always in image/jpeg format).
 */
export const compressImageForStorage = (imageBase64: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Return non-image data URIs or short strings as is, to avoid errors
    if (!imageBase64 || !imageBase64.startsWith('data:image')) {
      return resolve(imageBase64);
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context for image compression.'));
      }

      let { width, height } = img;
      
      // Calculate new dimensions to fit within the MAX_DIMENSION box
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_DIMENSION;
          width = MAX_DIMENSION;
        } else {
          width = (width / height) * MAX_DIMENSION;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw the resized image onto the canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export the canvas content as a JPEG data URL with the specified quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
      
      resolve(compressedDataUrl);
    };
    img.onerror = (err) => {
        // Fallback: If compression fails, return original to avoid data loss (though it may hit storage limits)
        console.warn('Image compression failed, using original.', err);
        resolve(imageBase64);
    };
    img.src = imageBase64;
  });
};
