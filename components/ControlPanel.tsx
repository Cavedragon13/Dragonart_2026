
import React, { useCallback } from 'react';
import type { EditMode, SportType, ConsoleType, WantedStyle, EdgeStyle, ImageModelId } from '../types';
import { ImageUploader } from './ImageUploader';
import { SparklesIcon, XCircleIcon, ClipboardIcon, ChevronDownIcon, CropIcon, CameraIcon, DocumentDownloadIcon } from './icons';
import { MODEL_CONFIGS } from '../constants';
import { getVideoModelName } from '../services/modelDispatcher';

interface ControlPanelProps {
  mainImage: string | null;
  setMainImage: (image: string | null) => void;
  referenceImages: string[];
  setReferenceImages: React.Dispatch<React.SetStateAction<string[]>>;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
  selectedModel: ImageModelId;
  setSelectedModel: (model: ImageModelId) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onCropClick: () => void;
  onClearInputs: () => void;
  onDownloadSession: () => void;
  onEndSession: () => void;
  generationCount: number;
  isSessionActive: boolean;
  logMessages: string[];
  universalFlair: boolean;
  setUniversalFlair: (value: boolean) => void;
  generateFromSource: boolean;
  setGenerateFromSource: (value: boolean) => void;
  sportType: SportType;
  setSportType: (type: SportType) => void;
  consoleType: ConsoleType;
  setConsoleType: (type: ConsoleType) => void;
  wantedStyle: WantedStyle;
  setWantedStyle: (style: WantedStyle) => void;
  edgeStyle: EdgeStyle;
  setEdgeStyle: (style: EdgeStyle) => void;
}

const ModeButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}> = ({ label, isActive, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`py-2.5 px-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${
        isActive
          ? 'bg-purple-600 text-white shadow-lg'
          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
      } ${className}`}
    >
      {label}
    </button>
  );
};

const MAX_REFERENCE_IMAGES = 4;

interface ModeConfig {
  description: string;
  hasTitle?: boolean;
  titleLabel?: string;
  titlePlaceholder?: string;
  hasFlair?: boolean;
  flairLabel?: string;
  hasReference?: boolean;
  hasCustomPrompt?: boolean;
  customPromptLabel?: string;
  customPromptPlaceholder?: string;
}

const MODE_CONFIGS: Record<EditMode, ModeConfig> = {
  freestyle: { description: 'The AI will creatively colorize your image. Just upload and click generate!' },
  edit: { description: 'Provide reference images and/or text instructions to guide the AI in editing your image.', hasReference: true, hasCustomPrompt: true, customPromptLabel: 'Text Prompt', customPromptPlaceholder: "e.g., 'make this photo look like a vintage postcard'" },
  styleTransfer: { description: 'The AI will use your reference images for color/style and apply it to the main image.', hasReference: true },
  characterSheet: { description: 'Generates a Concept Art Character Turnaround (Front, Side, Back, Headshot) on a neutral background.', hasCustomPrompt: true, customPromptLabel: 'Specific Details (Optional)', customPromptPlaceholder: "e.g., 'wearing a backpack'" },
  straighten: { description: 'Re-renders the subject to face the camera in a full-body shot, isolating them on a neutral background.' },
  diorama: { description: 'Reimagines your image as a detailed McFarlane Toys-style collectible diorama.' },
  
  grid12x: { description: "Creates a 3x4 grid (12 panels) of different poses and expressions. Preserves source art style." },
  strip3x: { description: "Creates a vertical 1x3 photo strip. Preserves source art style." },
  panel4x: { description: "Recreates subject in 4 unique panels. Preserves source art style.", hasCustomPrompt: true, customPromptLabel: 'Instructions (Optional)', customPromptPlaceholder: "e.g., 'add a robot sidekick in one panel'" },
  photorealistic: { description: "Converts drawings, sketches, or cartoons into high-end photorealistic photography." },

  edge: { description: "Generates structural representations of the image (Line Art, Depth Map, Canny Edge, Heat Map)." },
  
  comicPage: { description: "Creates a multi-panel INTERIOR comic page (Inked, No Color).", hasCustomPrompt: true, customPromptLabel: 'Story Instructions (Optional)', customPromptPlaceholder: "e.g., 'make it a horror comic'" },
  comicSplash: { description: "Creates a single full-page INTERIOR splash panel (Inked, No Color).", hasCustomPrompt: true, customPromptLabel: 'Scene Details (Optional)', customPromptPlaceholder: "e.g., 'character is jumping from a building'" },
  puppet: { description: "Transforms the main character into a Muppet-style puppet with a matching background." },
  bw: { description: "Converts your image to a high-contrast, artistic black and white photograph." },
  pinup: { description: "Reimagines the main character in a classic, painterly 1950s pinup style." },

  actionFigure: { description: "Transforms your subject into a collectible action figure in a blister pack.", hasTitle: true, titleLabel: 'Action Figure Name', titlePlaceholder: "e.g., 'Galactic Ranger'", hasFlair: true, flairLabel: 'Add Packaging Flair' },
  comicBookCover: { description: "Turns your image into a modern comic book cover. Provide a title, or the AI will create one.", hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'Tales of the Unknown'", hasFlair: true, flairLabel: 'Add Cover Flair' },
  videoGameCover: { description: "Turns your image into a 2010s-era video game cover. Select a platform below.", hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'Shadow Protocol'", hasFlair: true, flairLabel: 'Add Cover Flair' },
  horrorMoviePoster: { description: 'Turns your image into a modern horror movie poster. Provide a title, or the AI will create one.', hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'The Last Signal'", hasFlair: true, flairLabel: 'Add Poster Flair' },
  fantasyMoviePoster: { description: 'Turns your image into an epic fantasy movie poster. Provide a title, or the AI will create one.', hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'The Obsidian Crown'", hasFlair: true, flairLabel: 'Add Poster Flair' },
  sciFiMoviePoster: { description: 'Turns your image into an epic sci-fi movie poster. Provide a title, or the AI will create one.', hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'Chronos Rebellion'", hasFlair: true, flairLabel: 'Add Poster Flair' },
  vintageBurlesquePostcard: { description: 'Creates a vintage burlesque show postcard (3:4). Provide text.', hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'Le Fantôme de l'Opéra'", hasFlair: true, flairLabel: 'Add Decorative Flair' },
  vintagePostcard: { description: 'Creates a widescreen (4:3) vintage travel postcard. Idealized scene.', hasTitle: true, titleLabel: 'Location / Text', titlePlaceholder: "e.g., 'Greetings from Paradise'", hasFlair: true, flairLabel: 'Add Stamp Flair' },
  
  gothicArt: { description: "Reimagines your image in a dark, romantic, ornate gothic art style.", hasCustomPrompt: true, customPromptLabel: 'Instructions (Optional)', customPromptPlaceholder: "e.g., 'add a raven on the shoulder'" },
  watercolor: { description: "Creates an amateur-style watercolor painting, like a child's art project.", hasCustomPrompt: true, customPromptLabel: 'Instructions (Optional)', customPromptPlaceholder: "e.g., 'make the sky purple'" },
  
  mtgCard: { description: "Turns your image into a Magic: The Gathering card. Provide a name, or the AI will invent one.", hasTitle: true, titleLabel: 'Card Name / Instructions', titlePlaceholder: "e.g., 'Serra Angel'", hasFlair: true, flairLabel: 'Add Holofoil Stamp' },
  nonSportsCard: { description: "Creates a 'Non-Sports' trading card (Pokemon style). Provide a name.", hasTitle: true, titleLabel: 'Card Name', titlePlaceholder: "e.g., 'Electric Mouse'", hasFlair: true, flairLabel: 'Add Holofoil' },
  sportsCard: { description: "Creates a vintage Topps-style sports card. Select the sport below.", hasTitle: true, titleLabel: 'Player Name', titlePlaceholder: "e.g., 'The Sultan of Swat'", hasFlair: true, flairLabel: 'Add Rookie Logo' },
  
  wantedPoster: { description: "Creates a Wanted Poster. Select style below.", hasTitle: true, titleLabel: 'Headline / Text', titlePlaceholder: "e.g., 'WANTED DEAD OR ALIVE'", hasFlair: true, flairLabel: 'Add "Captured" Stamp' },
  asSeenOnTV: { description: "Creates a tacky 'As Seen on TV' ad for a bizarre gadget.", hasFlair: true, flairLabel: 'Add Promo Burst' },

  illustration: { description: "Turns your image into a colorful children's book illustration in a Sendak/Scarry style.", hasCustomPrompt: true, customPromptLabel: 'Instructions (Optional)', customPromptPlaceholder: "e.g., 'add a small mouse reading a book'" },
  animeManga: { description: "Redraws your image in a classic anime style inspired by Lupin III and Star Blazers.", hasCustomPrompt: true, customPromptLabel: 'Instructions (Optional)', customPromptPlaceholder: "e.g., 'make it a 90s shoujo style'" },

  magHarpers: { description: "Harper's Bizarre style cover. Avant-garde, surreal high fashion.", hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., Harper's Bizarre", hasFlair: true, flairLabel: 'Add Cover Flair' },
  magSyrens: { description: "SYRENS style cover. Mystical, powerful, alluring.", hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., Syrens", hasFlair: true, flairLabel: 'Add Cover Flair' },
  magJoxtrap: { description: "JOXTRAP style cover. Athletic, bold, high-energy.", hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., Joxtrap", hasFlair: true, flairLabel: 'Add Cover Flair' },
  magFreestyle: { description: "A magazine cover inspired by the image content. AI invents the title.", hasTitle: true, titleLabel: 'Title / Instructions', titlePlaceholder: "e.g., 'Create a music magazine'", hasFlair: true, flairLabel: 'Add Cover Flair' },

  badgePhoto: { description: "Creates an ID badge photo. Provide a Name/Title, or the AI will create a funny one.", hasTitle: true, titleLabel: 'Name & Title', titlePlaceholder: "e.g., 'Starlight Inc., Chief Dreamer'" },

  veoVideo: { description: "Uses Veo to generate a high-quality, cinematic video animation of your source image.", hasCustomPrompt: true, customPromptLabel: 'Motion Instructions (Optional)', customPromptPlaceholder: "e.g., 'Slow zoom in, hair blowing in the wind'"},
};

const useImagePaster = (onImagesPasted: (images: string[]) => void) => {
  const processFiles = useCallback((files: FileList) => {
    const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const promises = imageFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(onImagesPasted).catch(err => {
      console.error("Error processing files:", err);
      alert("There was an error processing one or more images from files.");
    });
  }, [onImagesPasted]);

  const paste = useCallback(async (event: React.ClipboardEvent | React.MouseEvent) => {
    event.preventDefault();
    if ('clipboardData' in event && event.clipboardData.files.length > 0) {
      const clipboardFiles = event.clipboardData.files;
      const imageFiles = Array.from(clipboardFiles).filter((file: File) => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        processFiles(clipboardFiles);
        return;
      }
    }
    try {
      if (!navigator.clipboard?.read) {
        alert("Clipboard API not available. Try drag-and-drop.");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      const imageBlobs: Blob[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          imageBlobs.push(await item.getType(imageType));
        }
      }
      if (imageBlobs.length === 0) {
        alert("No image found in clipboard.");
        return;
      }
      const base64Promises = imageBlobs.map(blob => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      });
      const base64Images = await Promise.all(base64Promises);
      onImagesPasted(base64Images);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      let message = "Failed to paste image. You may need to grant clipboard permissions.";
      if (err instanceof Error && err.name === 'NotAllowedError') {
        message = 'Please grant clipboard read permissions in your browser settings to paste images.';
      }
      alert(message);
    }
  }, [onImagesPasted, processFiles]);

  return { paste };
};

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    return (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-200"
            >
                {title}
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-3 border-t border-gray-700/50">{children}</div>}
        </div>
    );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mainImage, setMainImage, referenceImages, setReferenceImages,
  customPrompt, setCustomPrompt, editMode, setEditMode,
  selectedModel, setSelectedModel,
  isLoading, onGenerate, onCropClick, onClearInputs, onDownloadSession, onEndSession,
  generationCount, isSessionActive, logMessages,
  universalFlair, setUniversalFlair, generateFromSource, setGenerateFromSource,
  sportType, setSportType, consoleType, setConsoleType, wantedStyle, setWantedStyle,
  edgeStyle, setEdgeStyle
}) => {
  
  const handlePrimaryImagePasted = useCallback((images: string[]) => {
    if (images.length > 0) {
      setMainImage(images[0]);
    }
  }, [setMainImage]);

  const handleReferenceImagesPasted = useCallback((images: string[]) => {
    setReferenceImages(prev => [...prev, ...images].slice(0, MAX_REFERENCE_IMAGES));
  }, [setReferenceImages]);

  const { paste: pastePrimary } = useImagePaster(handlePrimaryImagePasted);
  const { paste: pasteReference } = useImagePaster(handleReferenceImagesPasted);
  
  const handleRemoveReference = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const currentModeConfig = MODE_CONFIGS[editMode];

  const handleModeChange = (mode: EditMode) => {
      onClearInputs();
      setEditMode(mode);
  };
  
  return (
    <div className="flex flex-col h-full space-y-4 text-gray-300">
      <h1 className="text-2xl font-bold text-center text-white">Controls</h1>
      
      {/* --- STEP 1: UPLOAD --- */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <label className="block text-lg font-semibold text-white mb-3">1. Upload Primary Image</label>
        <ImageUploader 
            image={mainImage} 
            onImagesSelected={(images) => setMainImage(images[0])}
            onRemove={() => setMainImage(null)}
            onPaste={pastePrimary}
        />
        {mainImage && (
             <div className="flex w-full gap-2 mt-2">
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pastePrimary(e);
                    }}
                    className="w-full text-sm bg-gray-700/60 text-gray-300 hover:bg-gray-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200"
                    title="Paste image from clipboard"
                >
                    <ClipboardIcon className="w-5 h-5 mr-2" />
                    Paste
                </button>
                <button
                    onClick={onCropClick}
                    className="w-full text-sm bg-gray-700/60 text-gray-300 hover:bg-gray-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200"
                >
                    <CropIcon className="w-5 h-5 mr-2" />
                    Crop
                </button>
            </div>
        )}
        <p className="text-xs text-gray-500 mt-2 text-center">Uploading an image will start a new session.</p>
      </div>

      {/* --- MODEL SELECTOR --- */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <label htmlFor="model-select" className="block text-sm font-semibold text-gray-300 mb-2">AI Model</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ImageModelId)}
          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        >
          {Object.values(MODEL_CONFIGS).map((config) => (
            <option key={config.id} value={config.id}>
              {config.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {MODEL_CONFIGS[selectedModel].description}
        </p>
      </div>

      {/* --- GENERATE BUTTON (MOVED UP) --- */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col space-y-4">
        <button
            onClick={onGenerate}
            disabled={isLoading || !mainImage}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-lg font-bold rounded-lg transition-all duration-200 text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
            <SparklesIcon className="w-6 h-6" />
            {isLoading ? (
            <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
            </>
            ) : 'Generate'}
        </button>

        {generationCount > 0 && (
            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <label className="block text-sm font-semibold text-gray-300 mb-2">Generation Source</label>
            <div role="radiogroup" className="flex flex-wrap gap-x-4 gap-y-2">
                <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                <input
                    type="radio"
                    name="generationSource"
                    checked={!generateFromSource}
                    onChange={() => setGenerateFromSource(false)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-offset-gray-800"
                />
                <span className="ml-2">Iterate (from last step)</span>
                </label>
                <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                <input
                    type="radio"
                    name="generationSource"
                    checked={generateFromSource}
                    onChange={() => setGenerateFromSource(true)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-offset-gray-800"
                />
                <span className="ml-2">From Primary Image</span>
                </label>
            </div>
            </div>
        )}
      </div>

      {/* --- ALL CONTROLS VISIBLE (REORDERED) --- */}
      <Accordion title="2. Choose Edit Mode" defaultOpen={true}>
        <div className="space-y-3">
            {/* 1. CORE */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Core</p>
            <div className="grid grid-cols-3 gap-2">
                <ModeButton label="Freestyle" isActive={editMode === 'freestyle'} onClick={() => handleModeChange('freestyle')} />
                <ModeButton label="Edit" isActive={editMode === 'edit'} onClick={() => handleModeChange('edit')} />
                <ModeButton label="Style Transfer" isActive={editMode === 'styleTransfer'} onClick={() => handleModeChange('styleTransfer')} />
            </div>
            </div>

            {/* 2. TRANSFORMATIONS */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Transformations</p>
            <div className="grid grid-cols-3 gap-2">
                <ModeButton label="Straighten" isActive={editMode === 'straighten'} onClick={() => handleModeChange('straighten')} />
                <ModeButton label="Edge" isActive={editMode === 'edge'} onClick={() => handleModeChange('edge')} />
                <ModeButton label="Char Sheet" isActive={editMode === 'characterSheet'} onClick={() => handleModeChange('characterSheet')} />
                <ModeButton label="Diorama" isActive={editMode === 'diorama'} onClick={() => handleModeChange('diorama')} />
                <ModeButton label="Puppet" isActive={editMode === 'puppet'} onClick={() => handleModeChange('puppet')} />
                <ModeButton label="Action Figure" isActive={editMode === 'actionFigure'} onClick={() => handleModeChange('actionFigure')} />
            </div>
            </div>

            {/* 3. PHOTO FUN (Ordered: Grid, 4, Booth) */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Photo Fun</p>
            <div className="grid grid-cols-2 gap-2">
                <ModeButton label="12x Grid" isActive={editMode === 'grid12x'} onClick={() => handleModeChange('grid12x')} />
                <ModeButton label="4x Panel" isActive={editMode === 'panel4x'} onClick={() => handleModeChange('panel4x')} />
                <ModeButton label="3x Strip" isActive={editMode === 'strip3x'} onClick={() => handleModeChange('strip3x')} />
                <ModeButton label="Photorealistic" isActive={editMode === 'photorealistic'} onClick={() => handleModeChange('photorealistic')} />
            </div>
            </div>

            {/* 4. COMIC STYLE */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Comic Style</p>
            <div className="grid grid-cols-3 gap-2">
                <ModeButton label="Comic Page" isActive={editMode === 'comicPage'} onClick={() => handleModeChange('comicPage')} />
                <ModeButton label="Comic Splash" isActive={editMode === 'comicSplash'} onClick={() => handleModeChange('comicSplash')} />
                <ModeButton label="Comic Book" isActive={editMode === 'comicBookCover'} onClick={() => handleModeChange('comicBookCover')} />
            </div>
            </div>

            {/* 5. POSTERS */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Posters</p>
            <div className="grid grid-cols-3 gap-2">
                <ModeButton label="Horror Poster" isActive={editMode === 'horrorMoviePoster'} onClick={() => handleModeChange('horrorMoviePoster')} />
                <ModeButton label="Fantasy Poster" isActive={editMode === 'fantasyMoviePoster'} onClick={() => handleModeChange('fantasyMoviePoster')} />
                <ModeButton label="Sci-fi Poster" isActive={editMode === 'sciFiMoviePoster'} onClick={() => handleModeChange('sciFiMoviePoster')} />
            </div>
            </div>

            {/* 6. MAGAZINES */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Magazines</p>
            <div className="grid grid-cols-2 gap-2">
                <ModeButton label="Harper's Bizarre" isActive={editMode === 'magHarpers'} onClick={() => handleModeChange('magHarpers')} />
                <ModeButton label="SYRENS" isActive={editMode === 'magSyrens'} onClick={() => handleModeChange('magSyrens')} />
                <ModeButton label="JOXTRAP" isActive={editMode === 'magJoxtrap'} onClick={() => handleModeChange('magJoxtrap')} />
                <ModeButton label="Freestyle Mag" isActive={editMode === 'magFreestyle'} onClick={() => handleModeChange('magFreestyle')} />
            </div>
            </div>

            {/* 7. ART STYLES */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Art Styles</p>
            <div className="grid grid-cols-3 gap-2">
                <ModeButton label="Illustration" isActive={editMode === 'illustration'} onClick={() => handleModeChange('illustration')} />
                <ModeButton label="Anime" isActive={editMode === 'animeManga'} onClick={() => handleModeChange('animeManga')} />
                <ModeButton label="Watercolor" isActive={editMode === 'watercolor'} onClick={() => handleModeChange('watercolor')} />
                <ModeButton label="Gothic Art" isActive={editMode === 'gothicArt'} onClick={() => handleModeChange('gothicArt')} />
                <ModeButton label="Pin-up Art" isActive={editMode === 'pinup'} onClick={() => handleModeChange('pinup')} />
                <ModeButton label="B&W Photo" isActive={editMode === 'bw'} onClick={() => handleModeChange('bw')} />
            </div>
            </div>
            
             {/* 8. EVERYTHING ELSE */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Everything Else</p>
            <div className="grid grid-cols-3 gap-2">
                <ModeButton label="MTG Card" isActive={editMode === 'mtgCard'} onClick={() => handleModeChange('mtgCard')} />
                <ModeButton label="Non-Sports" isActive={editMode === 'nonSportsCard'} onClick={() => handleModeChange('nonSportsCard')} />
                <ModeButton label="Sports Card" isActive={editMode === 'sportsCard'} onClick={() => handleModeChange('sportsCard')} />
                
                <ModeButton label="VG Cover" isActive={editMode === 'videoGameCover'} onClick={() => handleModeChange('videoGameCover')} />
                <ModeButton label="Burlesque" isActive={editMode === 'vintageBurlesquePostcard'} onClick={() => handleModeChange('vintageBurlesquePostcard')} />
                <ModeButton label="ID Badge" isActive={editMode === 'badgePhoto'} onClick={() => handleModeChange('badgePhoto')} />
                
                <ModeButton label="Vintage Postcard" isActive={editMode === 'vintagePostcard'} onClick={() => handleModeChange('vintagePostcard')} />
                <ModeButton label="Wanted Poster" isActive={editMode === 'wantedPoster'} onClick={() => handleModeChange('wantedPoster')} />
                <ModeButton label="As Seen On TV" isActive={editMode === 'asSeenOnTV'} onClick={() => handleModeChange('asSeenOnTV')} />
            </div>
            </div>
            
             {/* 9. VIDEO STUDIO */}
            <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider text-purple-400">Video Studio</p>
            <div className="grid grid-cols-1 gap-2">
                <ModeButton
                    label={`Cinematic Video (${getVideoModelName(selectedModel)})`}
                    isActive={editMode === 'veoVideo'}
                    onClick={() => handleModeChange('veoVideo')}
                    className="bg-gray-800 border border-purple-900/50"
                />
            </div>
            </div>

        </div>
        </Accordion>

        <Accordion title="3. Mode Options" defaultOpen={true}>
        <div className="space-y-4">
            <p className="text-sm text-gray-400">{currentModeConfig.description}</p>
            
            {/* --- CONDITIONAL SELECTORS FOR SPECIFIC MODES --- */}
            {editMode === 'sportsCard' && (
                <div>
                    <label htmlFor="sport-select" className="block text-sm font-semibold text-gray-300 mb-1">Select Sport</label>
                    <select
                        id="sport-select"
                        value={sportType}
                        onChange={(e) => setSportType(e.target.value as SportType)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    >
                        <option value="baseball">Baseball</option>
                        <option value="football">Football (US)</option>
                        <option value="basketball">Basketball</option>
                        <option value="hockey">Hockey</option>
                        <option value="soccer">Soccer (Futbol)</option>
                        <option value="cheerleader">Cheerleader</option>
                        <option value="official">Official / Referee</option>
                    </select>
                </div>
            )}

            {editMode === 'videoGameCover' && (
                <div>
                    <label htmlFor="console-select" className="block text-sm font-semibold text-gray-300 mb-1">Select Platform Style</label>
                    <select
                        id="console-select"
                        value={consoleType}
                        onChange={(e) => setConsoleType(e.target.value as ConsoleType)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    >
                        <option value="generic">Generic / All Platforms</option>
                        <option value="xbox">Xbox Style (Green)</option>
                        <option value="playstation">PlayStation Style (Blue)</option>
                        <option value="nintendo">Nintendo Style (Red)</option>
                        <option value="pc">PC / Windows Style</option>
                    </select>
                </div>
            )}

            {editMode === 'wantedPoster' && (
                <div>
                    <label htmlFor="wanted-select" className="block text-sm font-semibold text-gray-300 mb-1">Select Style</label>
                    <select
                        id="wanted-select"
                        value={wantedStyle}
                        onChange={(e) => setWantedStyle(e.target.value as WantedStyle)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    >
                        <option value="fbi">FBI Most Wanted (Modern)</option>
                        <option value="western">Old West Reward Poster</option>
                    </select>
                </div>
            )}

            {editMode === 'edge' && (
                <div>
                    <label htmlFor="edge-select" className="block text-sm font-semibold text-gray-300 mb-1">Select Algorithm</label>
                    <select
                        id="edge-select"
                        value={edgeStyle}
                        onChange={(e) => setEdgeStyle(e.target.value as EdgeStyle)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    >
                        <option value="lineArt">Line Art</option>
                        <option value="depthMap">Depth Map</option>
                        <option value="cannyEdge">Canny Edge</option>
                        <option value="heatMap">Heat Map</option>
                    </select>
                </div>
            )}

            {(currentModeConfig.hasTitle || currentModeConfig.hasCustomPrompt) && (
            <div>
                <label htmlFor="custom-prompt" className="block text-sm font-semibold text-gray-300 mb-1">{currentModeConfig.titleLabel || currentModeConfig.customPromptLabel}</label>
                <textarea 
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={currentModeConfig.titlePlaceholder || currentModeConfig.customPromptPlaceholder}
                    rows={3}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                />
            </div>
            )}

            {currentModeConfig.hasReference && (
            <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Reference Image(s) <span className="text-xs text-gray-500">(up to {MAX_REFERENCE_IMAGES})</span></label>
                <div className="grid grid-cols-2 gap-2">
                    {referenceImages.map((img, index) => (
                        <div key={index} className="relative">
                            <img src={img} alt={`Reference ${index + 1}`} className="w-full aspect-video object-cover rounded-md" />
                            <button onClick={() => handleRemoveReference(index)} className="absolute top-1 right-1 bg-gray-900/70 text-white rounded-full p-0.5 transition-transform hover:scale-110">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {referenceImages.length < MAX_REFERENCE_IMAGES && (
                        <ImageUploader 
                            image={null} 
                            onImagesSelected={handleReferenceImagesPasted}
                            onRemove={() => {}}
                            multiple
                            onPaste={pasteReference}
                        />
                    )}
                </div>
            </div>
            )}
            
            {currentModeConfig.hasFlair && (
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="universal-flair"
                    checked={universalFlair}
                    onChange={(e) => setUniversalFlair(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800"
                />
                <label htmlFor="universal-flair" className="ml-2 text-sm text-gray-300">{currentModeConfig.flairLabel || 'Add Flair'}</label>
            </div>
            )}

            <button
                onClick={onClearInputs}
                className="w-full text-sm text-red-400 hover:text-red-300 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200"
            >
                <XCircleIcon className="w-5 h-5 mr-2" />
                Clear All Inputs
            </button>
        </div>
        </Accordion>
        
       {/* --- SESSION MANAGEMENT --- */}
       <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
          <label className="block text-sm font-semibold text-gray-300">Session Management</label>
          {isSessionActive ? (
             <div className="space-y-2">
               <button
                  onClick={onDownloadSession}
                  disabled={generationCount === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 bg-blue-600/50 text-blue-200 hover:bg-blue-600/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <DocumentDownloadIcon className="w-5 h-5" /> Download Session
              </button>
              <button
                  onClick={onEndSession}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 bg-red-800/50 text-red-200 hover:bg-red-700/80"
              >
                  <XCircleIcon className="w-5 h-5" /> End Session
              </button>
            </div>
          ) : (
             <p className="text-xs text-gray-500 italic">Session options will appear here after you start generating.</p>
          )}
       </div>

       {/* --- LOGS --- */}
      <div className="flex-grow min-h-0">
        <Accordion title="Logs & Debug">
          <div className="bg-gray-900 rounded-md p-2 h-48 overflow-y-auto">
            {logMessages.length > 0 ? (
                <pre className="text-xs text-gray-400 whitespace-pre-wrap break-words">
                    {logMessages.join('\n')}
                </pre>
            ) : (
                <p className="text-xs text-gray-500 text-center pt-4">Log is empty. Start a generation to see messages.</p>
            )}
          </div>
        </Accordion>
      </div>

    </div>
  );
};
