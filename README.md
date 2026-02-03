<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DragonArt Studio

AI-powered image editor with 72 creative modes and video generation.

**Try it online:** https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221o0H761tnX8U7cSDhYCQ4gkYkNZmqR4-Z%22%5D,%22action%22:%22open%22,%22userId%22:%22104383582638498498498%22,%22resourceKeys%22:%7B%7D%7D

## Features

- **72 Edit Modes** - Comic covers, movie posters, trading cards, art styles, and more
- **Multi-Model Support** - Choose between Gemini 3 Pro, Gemini 2.5 Flash, or OpenAI GPT-Image-1
- **Video Generation** - Veo 3.1, Veo, or Sora-2 depending on selected model
- **Session History** - Track edits with branching, download as ZIP
- **Style Transfer** - Use reference images to guide the AI

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with your API keys:
   ```bash
   # Required for Gemini models
   GEMINI_API_KEY=your_google_api_key

   # Optional - enables OpenAI GPT-Image-1 and Sora-2
   OPENAI_API_KEY=your_openai_api_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Build for Production

```bash
npm run build
npm run preview
```

## Supported Models

| Model | Image Generation | Video Generation |
|-------|-----------------|------------------|
| Gemini 3 Pro Image | Yes | Veo 3.1 |
| Gemini 2.5 Flash | Yes | Veo |
| OpenAI GPT-Image-1 | Yes | Sora-2 |

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Google GenAI SDK (`@google/genai`)
- Tailwind CSS
