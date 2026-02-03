/**
 * Model Dispatcher - Routes API calls to the correct service based on selected model
 */

import { generateImageFromApi, generateVideoFromApi } from './geminiService';
import { generateImageFromOpenAI, generateVideoFromSora } from './openaiService';
import type { ImageModelId } from '../types';

// Map model IDs to actual API model names
const IMAGE_MODEL_MAP: Record<ImageModelId, string> = {
  'gemini-3-pro': 'gemini-3-pro-image-preview',
  'gemini-25-flash': 'gemini-2.5-flash-preview',
  'gpt-image-1': 'gpt-image-1',
};

const VIDEO_MODEL_MAP: Record<ImageModelId, string> = {
  'gemini-3-pro': 'veo-3.1-generate-preview',
  'gemini-25-flash': 'veo-generate-preview',
  'gpt-image-1': 'sora-2',
};

/**
 * Generate an image using the selected model.
 */
export const generateImage = async (
  modelId: ImageModelId,
  mainImageBase64: string,
  referenceImagesBase64: string[],
  prompt: string,
  onRetryAttempt?: (attempt: number, delay: number) => void
): Promise<string> => {
  switch (modelId) {
    case 'gemini-3-pro':
    case 'gemini-25-flash':
      return generateImageFromApi(
        mainImageBase64,
        referenceImagesBase64,
        prompt,
        onRetryAttempt,
        IMAGE_MODEL_MAP[modelId]
      );

    case 'gpt-image-1':
      return generateImageFromOpenAI(
        mainImageBase64,
        prompt,
        onRetryAttempt
      );

    default:
      throw new Error(`Unknown model: ${modelId}`);
  }
};

/**
 * Generate a video using the selected model's paired video service.
 */
export const generateVideo = async (
  modelId: ImageModelId,
  imageBase64: string,
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  switch (modelId) {
    case 'gemini-3-pro':
    case 'gemini-25-flash':
      return generateVideoFromApi(
        imageBase64,
        prompt,
        onStatusUpdate,
        VIDEO_MODEL_MAP[modelId]
      );

    case 'gpt-image-1':
      return generateVideoFromSora(
        imageBase64,
        prompt,
        onStatusUpdate
      );

    default:
      throw new Error(`Unknown model: ${modelId}`);
  }
};

/**
 * Check if a model supports video generation.
 */
export const supportsVideo = (modelId: ImageModelId): boolean => {
  return modelId in VIDEO_MODEL_MAP;
};

/**
 * Get the display name for a model's video capability.
 */
export const getVideoModelName = (modelId: ImageModelId): string => {
  switch (modelId) {
    case 'gemini-3-pro':
      return 'Veo 3.1';
    case 'gemini-25-flash':
      return 'Veo';
    case 'gpt-image-1':
      return 'Sora-2';
    default:
      return 'Video';
  }
};
