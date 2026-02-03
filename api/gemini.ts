import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { Part } from '../types';

/**
 * Handles incoming API requests.
 */
export default async function handler(req: any, res: any) {
  if (!process.env.API_KEY) {
    return sendError(res, 500, 'API key is not configured on the server.');
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed.');
  }

  try {
    const body = await parseJSONBody(req);
    const { task, ...payload } = body;

    res.setHeader('Content-Type', 'application/json');

    switch (task) {
      case 'describeImageForTitle': {
        const title = await handleDescribeImageForTitle(ai, payload.imageBase64);
        res.statusCode = 200;
        res.end(JSON.stringify({ title }));
        break;
      }
      case 'generateImageMetadata': {
        const metadata = await handleGenerateImageMetadata(ai, payload.imageBase64);
        res.statusCode = 200;
        res.end(JSON.stringify({ metadata }));
        break;
      }
      case 'generateImageFromApi': {
        const image = await handleGenerateImageFromApi(ai, payload);
        res.statusCode = 200;
        res.end(JSON.stringify({ image }));
        break;
      }
      default:
        sendError(res, 400, `Unknown task: ${task}`);
    }
  } catch (error) {
    console.error('API Handler Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    sendError(res, 500, message);
  }
}

// --- Task Handlers ---

async function handleDescribeImageForTitle(ai: GoogleGenAI, imageBase64: string): Promise<string> {
    const prompt = "Based on the attached image, suggest a short, creative title for an art editing session (max 5 words). Return only plain text.";
    const imagePart = base64ToPart(imageBase64);

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    
    return response.text.trim().replace(/"/g, '');
}

async function handleGenerateImageMetadata(ai: GoogleGenAI, imageBase64: string): Promise<object> {
    const prompt = "Analyze the image and generate JSON metadata: description, altText, seoKeywords.";
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
}

async function handleGenerateImageFromApi(ai: GoogleGenAI, payload: { mainImageBase64: string, referenceImagesBase64: string[], prompt: string }): Promise<string> {
    const { mainImageBase64, referenceImagesBase64 = [], prompt } = payload;
    
    const parts: Part[] = [];
    parts.push(base64ToPart(mainImageBase64));
    referenceImagesBase64.forEach(refImg => parts.push(base64ToPart(refImg)));
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (!imagePart || !imagePart.inlineData) {
        throw new Error('Image generation failed.');
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

// --- Utility Functions ---

function base64ToPart(base64String: string): Part {
  const match = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format');
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function sendError(res: any, statusCode: number, message: string) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message }));
}

async function parseJSONBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}
