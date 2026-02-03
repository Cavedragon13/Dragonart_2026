/**
 * OpenAI API Service for GPT-Image-1 and Sora-2
 */

/**
 * Utility to handle API calls with exponential backoff and retries.
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();

      const isRetryable =
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('503') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('timeout');

      if (isRetryable && attempt < maxRetries) {
        const delay = (Math.pow(2, attempt) * 1000) + (Math.random() * 1000);
        if (onRetry) onRetry(attempt, delay);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError || new Error('All retry attempts failed.');
}

/**
 * Generate an image using OpenAI's GPT-Image-1 model.
 * Uses the image edit endpoint to transform source images.
 */
export const generateImageFromOpenAI = async (
  mainImageBase64: string,
  prompt: string,
  onRetryAttempt?: (attempt: number, delay: number) => void
): Promise<string> => {
  return callWithRetry(async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Check your .env file.');
    }

    // Extract base64 data from data URL
    const base64Match = mainImageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image format. Expected base64 data URL.');
    }
    const [, imageFormat, base64Data] = base64Match;

    // Convert base64 to blob for FormData
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: `image/${imageFormat}` });

    // Create FormData for the edit request
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('image', blob, `source.${imageFormat === 'jpeg' ? 'jpg' : imageFormat}`);
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const result = await response.json();

    // OpenAI returns either URL or b64_json depending on request
    const imageData = result.data?.[0];
    if (!imageData) {
      throw new Error('No image returned from OpenAI');
    }

    // If URL, fetch and convert to base64
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
      const imageBlob = await imageResponse.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });
    }

    // If b64_json, convert to data URL
    if (imageData.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    }

    throw new Error('Unexpected response format from OpenAI');
  }, 5, onRetryAttempt);
};

/**
 * Generate a video using OpenAI's Sora-2 model.
 * Uses polling pattern similar to Veo.
 */
export const generateVideoFromSora = async (
  imageBase64: string,
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  return callWithRetry(async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Check your .env file.');
    }

    // Extract base64 data
    const base64Match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image format. Expected base64 data URL.');
    }
    const [, imageFormat, base64Data] = base64Match;

    if (onStatusUpdate) onStatusUpdate("Initializing Sora-2 Studio...");

    // Create video generation request
    const response = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sora-2',
        prompt: prompt,
        image: {
          type: 'base64',
          media_type: `image/${imageFormat}`,
          data: base64Data,
        },
        n: 1,
        size: '1280x720',
        duration: 5, // 5 second video
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Sora API error: ${response.status}`);
    }

    const createResult = await response.json();
    const videoId = createResult.id;

    if (!videoId) {
      throw new Error('No video ID returned from Sora');
    }

    // Poll for completion
    if (onStatusUpdate) onStatusUpdate("Rendering video with Sora-2...");

    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10s intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
      attempts++;

      const statusResponse = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Sora status check failed: ${statusResponse.status}`);
      }

      const statusResult = await statusResponse.json();

      if (statusResult.status === 'succeeded') {
        const videoUrl = statusResult.video?.url;
        if (!videoUrl) {
          throw new Error('Video completed but no URL provided');
        }

        if (onStatusUpdate) onStatusUpdate("Downloading video...");
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error("Video download failed.");
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);
      }

      if (statusResult.status === 'failed') {
        throw new Error(statusResult.error?.message || 'Video generation failed');
      }

      if (onStatusUpdate) onStatusUpdate("Still rendering your masterpiece...");
    }

    throw new Error('Video generation timed out');
  });
};
