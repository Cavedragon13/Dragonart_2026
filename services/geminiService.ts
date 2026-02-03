import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from '@google/genai';
import type { ImageMetadata, Part } from '../types';

/**
 * Utility to handle API calls with exponential backoff and retries.
 * Respects rate limits (429) and temporary service issues (503).
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
        errorMessage.includes('deadline exceeded');

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff: 2, 4, 8, 16, 32 seconds + jitter
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
 * Converts a base64 data URL into a Part object for the Gemini API.
 */
function base64ToPart(base64String: string): Part {
  const match = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid base64 image string format.');
  }
  const [, mimeType, data] = match;
  return { inlineData: { mimeType, data } };
}

export const suggestSessionNames = async (imageBase64: string): Promise<string[]> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = "Based on the attached image, suggest 3 distinct, creative, and catchy titles for an art editing session. Each title must be 5 words or less. Return a JSON object with a 'suggestions' key, which is an array of 3 strings.";
    const imagePart = base64ToPart(imageBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
      },
    });
    
    const result = JSON.parse(response.text);
    return result.suggestions || [response.text.trim()];
  });
};

export const generateImageMetadata = async (imageBase64: string): Promise<ImageMetadata> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = "Analyze the attached image and generate metadata for it in JSON format. Provide: 1. A one-sentence, engaging 'description'. 2. Concise 'altText' for accessibility. 3. A comma-separated string of 5-7 relevant 'seoKeywords'.";
    const imagePart = base64ToPart(imageBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            altText: { type: Type.STRING },
            seoKeywords: { type: Type.STRING },
          },
          required: ['description', 'altText', 'seoKeywords'],
        },
      },
    });

    return JSON.parse(response.text);
  });
};

export const generateImageFromApi = async (
  mainImageBase64: string,
  referenceImagesBase64: string[],
  prompt: string,
  onRetryAttempt?: (attempt: number, delay: number) => void
): Promise<string> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ];

    const parts: Part[] = [];
    parts.push(base64ToPart(mainImageBase64));
    referenceImagesBase64.forEach(refImg => parts.push(base64ToPart(refImg)));
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
        safetySettings: safetySettings,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (!imagePart || !imagePart.inlineData) {
      const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
      if (textPart?.text) {
        throw new Error(`Model Response: ${textPart.text}`);
      }
      throw new Error('Safety filter blocked the image generation. Please try a different prompt.');
    }
    
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }, 5, onRetryAttempt);
};

export const generateVideoFromApi = async (
    imageBase64: string,
    prompt: string,
    onStatusUpdate?: (status: string) => void
): Promise<string> => {
    return callWithRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imagePart = base64ToPart(imageBase64);
        
        if (!('inlineData' in imagePart)) {
            throw new Error("Invalid source data.");
        }
        
        if (onStatusUpdate) onStatusUpdate("Initializing Veo 3.1 Studio...");
        
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            if (onStatusUpdate) onStatusUpdate("Still rendering your masterpiece...");
        }

        if (operation.error) {
            throw new Error(`Veo error: ${operation.error.message}`);
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("Video generation failed to return a file.");

        if (onStatusUpdate) onStatusUpdate("Downloading video...");
        const response = await fetch(`${videoUri}${videoUri.includes('?') ? '&' : '?'}key=${process.env.API_KEY}`);
        
        if (!response.ok) throw new Error("Download failed.");
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    });
};
