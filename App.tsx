
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageComparisonSlider } from './components/ImageComparisonSlider';
import { SessionNameModal } from './components/SessionNameModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { CropModal } from './components/CropModal';
import { Notification } from './components/Notification';
import { VideoModal } from './components/VideoModal';
import { suggestSessionNames, generateImageMetadata } from './services/geminiService';
import { generateImage, generateVideo, getVideoModelName } from './services/modelDispatcher';
import { createSessionZipWithMain } from './services/sessionExporter';
import { compressImageForStorage } from './services/imageCompressor';
import type { ImagePair, EditMode, SportType, ConsoleType, WantedStyle, EdgeStyle, ImageModelId } from './types';
import { getPromptForMode, MODEL_CONFIGS } from './constants';
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon, ReplaceIcon, TrashIcon, StarIcon, StarIconSolid, PhotoIcon, XCircleIcon, SparklesIcon } from './components/icons';

const LOCAL_STORAGE_KEY = 'dragonArtSession';

// Helper function to crop image to a specific aspect ratio
const cropImageToAspectRatio = (imageBase64: string, targetAspectRatio: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const originalWidth = img.width;
      const originalHeight = img.height;
      const originalAspectRatio = originalWidth / originalHeight;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = originalWidth;
      let sourceHeight = originalHeight;

      if (originalAspectRatio > targetAspectRatio) {
        // Image is wider than target, crop width
        sourceWidth = originalHeight * targetAspectRatio;
        sourceX = (originalWidth - sourceWidth) / 2;
      } else if (originalAspectRatio < targetAspectRatio) {
        // Image is taller than target, crop height
        sourceHeight = originalWidth / targetAspectRatio;
        sourceY = (originalHeight - sourceHeight) / 2;
      }
      
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );
      
      const mimeType = 'image/jpeg';
      const quality = 0.92;
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = (err) => {
        const error = err instanceof Event ? new Error('Image could not be loaded for cropping.') : err;
        reject(error);
    };
    img.src = imageBase64;
  });
};

// Map of modes requiring specific aspect ratios
const ASPECT_RATIO_MAP: Partial<Record<EditMode, number>> = {
  // 2:3 aspect ratio
  horrorMoviePoster: 2 / 3,
  fantasyMoviePoster: 2 / 3,
  sciFiMoviePoster: 2 / 3,
  magHarpers: 2 / 3,
  magSyrens: 2 / 3,
  magJoxtrap: 2 / 3,
  magFreestyle: 2 / 3,
  comicPage: 2 / 3,
  comicSplash: 2 / 3,
  comicBookCover: 2 / 3,
  videoGameCover: 2 / 3,
  badgePhoto: 2 / 3,
  mtgCard: 2 / 3,
  nonSportsCard: 2 / 3,
  sportsCard: 2 / 3,
  wantedPoster: 2 / 3,
  // 3:4 aspect ratio
  vintageBurlesquePostcard: 3 / 4,
  actionFigure: 3 / 4,
  grid12x: 3 / 4, 
  // 4:3 aspect ratio (Landscape)
  vintagePostcard: 4 / 3,
  asSeenOnTV: 4 / 3,
  characterSheet: 4 / 3,
  // Video doesn't strictly need cropping as Veo handles various inputs, but let's keep source aspect.
};

// Helper to generate a unique ID
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Main App Component
const App: React.FC = () => {
    // API Key State
    const [hasApiKey, setHasApiKey] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    
    // Core State
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [editMode, setEditMode] = useState<EditMode>('freestyle');
    const [selectedModel, setSelectedModel] = useState<ImageModelId>('gemini-3-pro');
    const [universalFlair, setUniversalFlair] = useState(false);
    const [sportType, setSportType] = useState<SportType>('baseball');
    const [consoleType, setConsoleType] = useState<ConsoleType>('generic');
    const [wantedStyle, setWantedStyle] = useState<WantedStyle>('fbi');
    const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('lineArt');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generateFromSource, setGenerateFromSource] = useState(true);

    // Session & History State
    const [sessionName, setSessionName] = useState<string | null>(null);
    const [history, setHistory] = useState<ImagePair[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]); // Array of ImagePair IDs
    const [isStorageFull, setIsStorageFull] = useState(false);
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false);
    
    // Video State
    const [videoResult, setVideoResult] = useState<string | null>(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    
    // UI State
    const [cropModalState, setCropModalState] = useState<{isOpen: boolean; image: string | null}>({isOpen: false, image: null});
    const [notification, setNotification] = useState<{message: string; key: number} | null>(null);

    // Logging State
    const [logMessages, setLogMessages] = useState<string[]>([]);
    const logCounterRef = useRef(1);
    
    // Init ref to prevent save-loop on load
    const isInitialized = useRef(false);
    const justRestoredRef = useRef(false);
    
    const addLogMessage = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogMessages(prev => [`${logCounterRef.current++}: [${timestamp}] ${message}`, ...prev].slice(100));
    }, []);

    const isSessionActive = useMemo(() => sessionName !== null, [sessionName]);
    const currentImagePair = useMemo(() => history[currentIndex], [history, currentIndex]);
    
    // Resolve the "Before" image for the current step dynamically
    const currentBeforeImage = useMemo(() => {
        if (!currentImagePair) return null;
        if (currentImagePair.parentId === 'root') return mainImage;
        const parent = history.find(h => h.id === currentImagePair.parentId);
        return parent ? parent.after : mainImage; // Fallback to main if parent not found
    }, [currentImagePair, history, mainImage]);
    
    const showNotification = useCallback((message: string) => {
        setNotification({ message, key: Date.now() });
    }, []);

    // Check for API Key on mount (Dragonsuite deployment uses env var)
    useEffect(() => {
        setHasApiKey(!!process.env.API_KEY);
    }, []);

    // Load session from localStorage on initial mount
    useEffect(() => {
        try {
            const savedSessionJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedSessionJSON) {
                const savedSession = JSON.parse(savedSessionJSON);
                if (savedSession.sessionName && savedSession.mainImage && Array.isArray(savedSession.history)) {
                    
                    // Restore logs if available
                    if (savedSession.logMessages && Array.isArray(savedSession.logMessages)) {
                        setLogMessages(savedSession.logMessages);
                        // Try to parse the counter from the last log message
                        if (savedSession.logMessages.length > 0) {
                            const lastMsg = savedSession.logMessages[0];
                            const match = lastMsg.match(/^(\d+):/);
                            if (match) {
                                logCounterRef.current = parseInt(match[1]) + 1;
                            }
                        }
                    }

                    addLogMessage("Restoring previous session...");

                    // MIGRATION: Convert old structure (linear implicit) to new Reference structure (parentId)
                    let restoredHistory: ImagePair[] = [];
                    
                    if (savedSession.history.length > 0 && !savedSession.history[0].parentId) {
                        addLogMessage("Migrating session to new efficient data structure...");
                        let previousId = 'root';
                        restoredHistory = savedSession.history.map((pair: any) => {
                            const newPair: ImagePair = {
                                ...pair,
                                parentId: previousId, 
                                // Clean up old 'before' strings if they exist to save memory
                                before: undefined 
                            };
                            previousId = pair.id;
                            return newPair;
                        });
                    } else {
                        restoredHistory = savedSession.history;
                    }

                    setMainImage(savedSession.mainImage);
                    setSessionName(savedSession.sessionName);
                    setHistory(restoredHistory);
                    setCurrentIndex(savedSession.currentIndex ?? restoredHistory.length - 1);
                    setFavorites(savedSession.favorites ?? []);
                    addLogMessage(`Session "${savedSession.sessionName}" restored.`);
                    
                    justRestoredRef.current = true;
                } else {
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                }
            }
        } catch (error) {
            console.error("Failed to load session from localStorage", error);
            addLogMessage("Error: Could not restore previous session.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } finally {
            setTimeout(() => {
                isInitialized.current = true;
                // Clear the 'just restored' flag after a delay to allow safe saving later
                setTimeout(() => { justRestoredRef.current = false; }, 2000);
            }, 500);
        }
    }, [addLogMessage]);

    // Save session to localStorage on change
    useEffect(() => {
        const saveSessionAsync = async () => {
            if (!isInitialized.current) return;
            if (justRestoredRef.current) return; // Prevent saving immediately after restore

            if (isSessionActive && mainImage && sessionName) {
                try {
                    // Compress Main Image
                    const compressedMain = await compressImageForStorage(mainImage);
                    
                    // Compress History Items (only 'after' image needed)
                    // We DO NOT save 'before' or duplicates.
                    const compressedHistory = await Promise.all(
                        history.map(async (pair) => ({
                            id: pair.id,
                            parentId: pair.parentId,
                            after: await compressImageForStorage(pair.after),
                            prompt: pair.prompt,
                            editMode: pair.editMode,
                            customPrompt: pair.customPrompt,
                            createdAt: pair.createdAt,
                            sessionName: pair.sessionName,
                        }))
                    );

                    const sessionData = {
                        mainImage: compressedMain,
                        sessionName,
                        history: compressedHistory,
                        currentIndex,
                        favorites,
                        logMessages // Save logs to persistent storage
                    };

                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionData));
                    
                    if (isStorageFull) {
                        setIsStorageFull(false);
                        setError((prev) => (prev && prev.includes("Storage limit") ? null : prev));
                        addLogMessage("Storage space recovered. Session saved.");
                    }

                } catch (error) {
                    console.error("Failed to save session to localStorage", error);
                    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                        if (!isStorageFull) {
                             setError("Storage limit reached. Cannot save session. Please download your work.");
                             setIsStorageFull(true);
                             addLogMessage("ERROR: Storage limit reached. Session not saved.");
                        }
                    } else {
                        const message = "Could not save session progress.";
                        if (!error) setError(message);
                        addLogMessage(`ERROR: ${message}`);
                    }
                }
            }
        };
        
        saveSessionAsync();
    }, [mainImage, sessionName, history, currentIndex, favorites, isSessionActive, addLogMessage, logMessages]);
    
    const fetchSuggestedNames = useCallback(async (image: string) => {
        setIsLoadingSuggestions(true);
        addLogMessage("Fetching session name suggestions...");
        try {
            const names = await suggestSessionNames(image);
            setSuggestedNames(prev => [...new Set([...prev, ...names])]);
            addLogMessage("Suggestions received.");
        } catch (err) {
            console.error(err);
            addLogMessage("Error fetching suggestions.");
            setError("Could not fetch session name suggestions.");
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [addLogMessage]);

    useEffect(() => {
        if (mainImage && !sessionName) {
            const savedSessionJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedSessionJSON) {
                try {
                    const saved = JSON.parse(savedSessionJSON);
                    if (saved.mainImage === mainImage) return; 
                } catch (e) { /* Ignore parsing errors */ }
            }
            setIsSessionModalOpen(true);
            addLogMessage("New image detected. Opening session modal.");
            fetchSuggestedNames(mainImage);
        }
    }, [mainImage, sessionName, addLogMessage, fetchSuggestedNames]);

    useEffect(() => {
        if (currentImagePair?.after) {
            document.body.style.setProperty('--bg-image', `url(${currentImagePair.after})`);
            document.body.classList.add('has-background');
        } else if (mainImage) {
            document.body.style.setProperty('--bg-image', `url(${mainImage})`);
            document.body.classList.add('has-background');
        } else {
            document.body.classList.remove('has-background');
        }
    }, [currentImagePair, mainImage]);

    const handleStartSession = (name: string) => {
        setSessionName(name);
        setIsSessionModalOpen(false);
        setHistory([]);
        setCurrentIndex(-1);
        setFavorites([]);
        setLogMessages([]);
        logCounterRef.current = 1;
        addLogMessage(`Session started: "${name}"`);
    };

    const handleClearInputs = useCallback(() => {
        setReferenceImages([]);
        setCustomPrompt('');
        setUniversalFlair(false);
        addLogMessage("Cleared all inputs (references, prompt, flair).");
    }, [addLogMessage]);

    const handleGenerateClick = useCallback(async () => {
        if (!mainImage || isLoading) return;

        setIsLoading(true);
        setError(null);
        addLogMessage(`Starting generation with mode: ${editMode}...`);
        
        // Determine Source Image and Parent ID
        const useOriginalSource = generateFromSource || !currentImagePair;
        
        // PARENT ID LOGIC: 
        // If From Source -> 'root'
        // If Iterate -> Current Step's ID
        const parentId = useOriginalSource ? 'root' : currentImagePair.id;
        
        // IMAGE SOURCE LOGIC:
        // If parent is 'root', use mainImage.
        // If parent is an ID, find that item and use its 'after' image.
        let imageToSend = useOriginalSource ? mainImage : currentImagePair.after;
        
        let description = currentImagePair?.beforeMetadata?.description;
        
        if (history.length > 0) {
             if (useOriginalSource) {
                addLogMessage("'From Primary Image' is active. Generating from original source.");
             } else {
                addLogMessage(`'Iterate' is active. Branching from Step ${currentIndex + 1}.`);
             }
        }

        try {
            const prompt = getPromptForMode({
                mode: editMode,
                customInstruction: customPrompt,
                flair: universalFlair,
                description,
                sport: sportType,
                console: consoleType,
                wantedStyle: wantedStyle,
                edgeStyle: edgeStyle
            });
            
            // --- VIDEO GENERATION BRANCH ---
            if (editMode === 'veoVideo') {
                const videoModelName = getVideoModelName(selectedModel);
                addLogMessage(`Video generation mode selected. Calling ${videoModelName} model...`);
                const videoUrl = await generateVideo(selectedModel, imageToSend, prompt, (status) => {
                    addLogMessage(`${videoModelName} Status: ${status}`);
                });

                setVideoResult(videoUrl);
                setIsVideoModalOpen(true);
                addLogMessage("Video generation complete. Opening player.");
                return; // Stop here, do not add to image history
            }
            
            // --- IMAGE GENERATION BRANCH ---
            const targetAspectRatio = ASPECT_RATIO_MAP[editMode];
            if (targetAspectRatio) {
                try {
                    let ratioString = '';
                    if (targetAspectRatio === 2/3) ratioString = '2:3';
                    else if (targetAspectRatio === 3/4) ratioString = '3:4';
                    else if (targetAspectRatio === 4/3) ratioString = '4:3';
                    else ratioString = targetAspectRatio.toFixed(2);

                    addLogMessage(`Pre-processing: Cropping source image to ${ratioString} aspect ratio.`);
                    imageToSend = await cropImageToAspectRatio(imageToSend, targetAspectRatio);
                    addLogMessage(`Image successfully cropped.`);
                } catch (cropError) {
                    const errorMessage = cropError instanceof Error ? cropError.message : 'An unknown error occurred during cropping.';
                    console.error('Image cropping failed:', cropError);
                    addLogMessage(`Warning: Image cropping failed. Using original image. Error: ${errorMessage}`);
                    setError('Failed to pre-process the image for the selected mode. Using original image dimensions instead.');
                }
            }

            if (editMode === 'actionFigure' && !description) {
                addLogMessage("Action Figure mode requires an image description. Generating one now...");
                 const metadata = await generateImageMetadata(imageToSend);
                 description = metadata.description;
                 addLogMessage(`Description generated: "${description}"`);
            }
        
            addLogMessage(`Using model: ${MODEL_CONFIGS[selectedModel].name}`);
            addLogMessage(`Prompt (truncated): "${prompt.substring(0, 150)}..."`);

            const generatedImageBase64 = await generateImage(
                selectedModel,
                imageToSend,
                referenceImages,
                prompt,
                (attempt, delay) => {
                    addLogMessage(`API rate limit hit. Retrying attempt ${attempt}/5 in ${Math.round(delay / 1000)}s...`);
                }
            );
            addLogMessage("Image successfully generated by AI.");

            const newImagePair: ImagePair = {
                id: generateId(),
                parentId: parentId, // Store REFERENCE, not full image
                after: generatedImageBase64,
                prompt: prompt,
                editMode: editMode,
                customPrompt: customPrompt,
                createdAt: Date.now(),
                sessionName: sessionName || 'Untitled Session'
            };
            
            const newHistory = [...history, newImagePair];
            setHistory(newHistory);
            setCurrentIndex(newHistory.length - 1); 
            
        } catch (err) {
            console.error("Generation failed:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during generation.";
            
            if (errorMessage.includes('403') || errorMessage.toLowerCase().includes('permission denied') || errorMessage.includes('PERMISSION_DENIED')) {
                const denialMessage = "Permission Denied: The selected API key does not have access to the Gemini 3 Pro models. Please select a Google Cloud project with billing enabled.";
                setApiKeyError(denialMessage);
                addLogMessage(`CRITICAL ERROR: ${denialMessage}`);
                setHasApiKey(false);
                return;
            }

            setError(errorMessage);
            addLogMessage(`ERROR: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            addLogMessage("Generation process finished.");
        }
    }, [mainImage, isLoading, editMode, customPrompt, universalFlair, referenceImages, history, currentIndex, addLogMessage, sessionName, currentImagePair, generateFromSource, sportType, consoleType, wantedStyle, edgeStyle]);
    
    const handleCropClick = () => {
        if (mainImage) {
            setCropModalState({ isOpen: true, image: mainImage });
        } else {
            alert("Please upload a primary image to crop.");
        }
    };
    
    const handleCropConfirm = (croppedImage: string) => {
        setMainImage(croppedImage);
        setCropModalState({ isOpen: false, image: null });
        addLogMessage("Primary image cropped successfully.");
    };

    const handleNav = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
        if (direction === 'next' && currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSetAsSource = () => {
        if (currentImagePair) {
            setMainImage(currentImagePair.after);
            showNotification(`Step ${currentIndex + 1} is now the new Primary Image.`);
            addLogMessage(`Set Step ${currentIndex + 1} as the new primary image. Next generation will branch from this point.`);
        }
    };

    // Save image to server disk (Dragonsuite integration)
    const saveToServer = async (imageBase64: string, step: number, mode: string) => {
        try {
            const response = await fetch('/api/save-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    sessionName: sessionName || 'untitled',
                    step: step,
                    editMode: mode
                })
            });
            const result = await response.json();
            if (result.success) {
                addLogMessage(`Saved to disk: ${result.filename}`);
            }
        } catch (error) {
            console.error('Failed to save to server:', error);
        }
    };

    const handleDownloadCurrent = () => {
        if (currentImagePair) {
            // Download to browser
            const link = document.createElement('a');
            link.href = currentImagePair.after;
            link.download = `${sessionName}_step_${currentIndex + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Also save to server disk
            saveToServer(currentImagePair.after, currentIndex + 1, currentImagePair.editMode);
        }
    };

    const handleDownloadSession = async () => {
        if (!sessionName || history.length === 0 || !mainImage) {
            alert("No session history to download.");
            return;
        }
        addLogMessage("Preparing session download as HTML gallery...");
        setIsLoading(true);
        try {
            // Updated Exporter Call with mainImage
            const zipBlob = await createSessionZipWithMain(history, sessionName, mainImage);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${sessionName}_gallery.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            addLogMessage("Session gallery download started.");
        } catch (error) {
            console.error("Failed to create session zip:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setError(`Failed to create session zip: ${errorMessage}`);
            addLogMessage(`ERROR: Could not create session zip. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFavoriteToggle = () => {
        if (currentImagePair) {
            setFavorites(prev => {
                const isFav = prev.includes(currentImagePair.id);
                if (isFav) {
                    return prev.filter(id => id !== currentImagePair.id);
                } else {
                    return [...prev, currentImagePair.id];
                }
            });
        }
    };

    const handleDeleteCurrentStep = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentImagePair) return;

        const deletedId = currentImagePair.id;
        const parentOfDeleted = currentImagePair.parentId;
        const indexToDelete = history.findIndex(p => p.id === deletedId);
        
        if (indexToDelete === -1) return;

        // TREE REPAIR: 
        // Find any items that were children of the deleted item, and re-parent them to the deleted item's parent.
        // This ensures the chain isn't broken visually or logically.
        const newHistory = history
            .filter(pair => pair.id !== deletedId)
            .map(pair => {
                if (pair.parentId === deletedId) {
                    return { ...pair, parentId: parentOfDeleted };
                }
                return pair;
            });

        setFavorites(prev => prev.filter(id => id !== deletedId));
        setHistory(newHistory);
        setCurrentIndex(Math.min(currentIndex, newHistory.length - 1));
        
        showNotification(`Step ${indexToDelete + 1} deleted.`);
        addLogMessage(`Step ${indexToDelete + 1} deleted.`);
    };

    const handleDeleteOldestSteps = (count: number = 10) => {
        if (history.length < count) {
            showNotification(`Need at least ${count} steps in history to use this function.`);
            return;
        }

        const itemsToDelete = history.slice(0, count);
        const idsToDelete = new Set(itemsToDelete.map(h => h.id));
        const newHistory = history.slice(count);
        
        // Relink orphans (items in newHistory whose parent was deleted) to 'root' or a safe ancestor?
        const safeHistory = newHistory.map(pair => {
            if (idsToDelete.has(pair.parentId)) {
                 return { ...pair, parentId: 'root' };
            }
            return pair;
        });

        setFavorites(prev => prev.filter(id => !idsToDelete.has(id)));
        setHistory(safeHistory);
        setCurrentIndex(Math.max(-1, currentIndex - count));
        
        setIsStorageFull(false); 
        setError((prev) => (prev && prev.includes("Storage limit") ? null : prev));

        showNotification(`${count} oldest steps deleted.`);
        addLogMessage(`${count} oldest steps deleted.`);
    };

    // Trigger the custom modal
    const handleEndSession = () => {
        setIsEndSessionModalOpen(true);
    };

    // Actual logic to clear session, called by modal confirm
    const confirmEndSession = () => {
        // Prevent any pending auto-saves from overwriting the clear
        isInitialized.current = false;
        
        // Clear storage
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        
        // Visual reset (optional but good)
        setSessionName(null);
        setMainImage(null);
        setHistory([]);
        
        // Force a reload to ensure memory and state are absolutely 100% clean
        window.location.reload();
    };

    if (!hasApiKey) {
        return (
            <div className="flex h-screen bg-gray-900 text-white items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">DragonArt Studio</h1>

                    {apiKeyError ? (
                        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm text-left flex items-start gap-3 animate-fade-in-up">
                             <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                             <p>{apiKeyError}</p>
                        </div>
                    ) : (
                        <p className="text-gray-300">
                            API key not configured. DragonArt Studio requires a Google Cloud API key with Gemini access.
                        </p>
                    )}

                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 text-sm text-gray-400 text-left space-y-2">
                        <p className="font-semibold text-gray-300">Configuration:</p>
                        <p>1. Add your key to <code className="text-purple-400">/srv/containers/edq/.env</code>:</p>
                        <code className="block bg-gray-950 p-2 rounded text-xs text-green-400">GOOGLE_API_KEY=your_key_here</code>
                        <p>2. Rebuild the app:</p>
                        <code className="block bg-gray-950 p-2 rounded text-xs text-green-400">bash scripts/start_dragonart.sh</code>
                    </div>
                    <p className="text-xs text-gray-500">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-gray-400">
                            View Billing Documentation
                        </a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            <SessionNameModal 
                isOpen={isSessionModalOpen}
                onClose={() => {
                    setIsSessionModalOpen(false);
                    if (!sessionName) setMainImage(null);
                }}
                onSubmit={handleStartSession}
                suggestedNames={suggestedNames}
                isLoadingSuggestions={isLoadingSuggestions}
                onSuggestMore={() => mainImage && fetchSuggestedNames(mainImage)}
            />
            
            <ConfirmationModal 
                isOpen={isEndSessionModalOpen}
                title="End Current Session?"
                message="Are you sure you want to end this session? All history, images, and settings will be permanently deleted. This action cannot be undone."
                confirmText="End Session"
                onConfirm={confirmEndSession}
                onCancel={() => setIsEndSessionModalOpen(false)}
            />

            <VideoModal 
                isOpen={isVideoModalOpen} 
                videoUrl={videoResult} 
                onClose={() => setIsVideoModalOpen(false)} 
            />
            
             <CropModal
                isOpen={cropModalState.isOpen}
                imageSrc={cropModalState.image}
                onClose={() => setCropModalState({ isOpen: false, image: null })}
                onCropConfirm={handleCropConfirm}
            />
            
            <div className="w-[450px] flex-shrink-0 p-4 h-full overflow-y-auto">
                <ControlPanel
                    mainImage={mainImage}
                    setMainImage={setMainImage}
                    referenceImages={referenceImages}
                    setReferenceImages={setReferenceImages}
                    customPrompt={customPrompt}
                    setCustomPrompt={setCustomPrompt}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    isLoading={isLoading}
                    onGenerate={handleGenerateClick}
                    onCropClick={handleCropClick}
                    onClearInputs={handleClearInputs}
                    onDownloadSession={handleDownloadSession}
                    onEndSession={handleEndSession}
                    generationCount={history.length}
                    isSessionActive={isSessionActive}
                    logMessages={logMessages}
                    universalFlair={universalFlair}
                    setUniversalFlair={setUniversalFlair}
                    generateFromSource={generateFromSource}
                    setGenerateFromSource={setGenerateFromSource}
                    sportType={sportType}
                    setSportType={setSportType}
                    consoleType={consoleType}
                    setConsoleType={setConsoleType}
                    wantedStyle={wantedStyle}
                    setWantedStyle={setWantedStyle}
                    edgeStyle={edgeStyle}
                    setEdgeStyle={setEdgeStyle}
                />
            </div>
            <main className="flex-1 p-4 flex flex-col items-center justify-start relative overflow-hidden">
                 {notification && (
                    <Notification 
                        key={notification.key} 
                        message={notification.message} 
                        onDismiss={() => setNotification(null)} 
                    />
                )}

                {history.length > 0 && currentImagePair ? (
                    <div className="w-full max-w-7xl h-full flex flex-col rounded-xl overflow-hidden shadow-2xl bg-black/20 border border-gray-700/50">
                        <div className="flex-1 relative min-h-0">
                            <ImageComparisonSlider 
                                key={currentImagePair.id}
                                beforeSrc={currentBeforeImage || ''} 
                                afterSrc={currentImagePair.after}
                            />
                        </div>
                        <div className="flex-shrink-0 w-full flex items-center justify-between p-3 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleNav('prev')} disabled={currentIndex <= 0} className="nav-button disabled:opacity-30 disabled:cursor-not-allowed p-2.5"><ArrowLeftIcon className="w-5 h-5" /></button>
                                <span className="font-semibold text-lg whitespace-nowrap">{`Step ${currentIndex + 1} of ${history.length}`}</span>
                                <button onClick={() => handleNav('next')} disabled={currentIndex >= history.length - 1} className="nav-button disabled:opacity-30 disabled:cursor-not-allowed p-2.5"><ArrowRightIcon className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button onClick={handleSetAsSource} className="nav-button flex items-center gap-2" title="Use this result as the new primary image for further edits">
                                    <ReplaceIcon className="w-5 h-5"/> Source
                                </button>
                                <button onClick={handleDownloadCurrent} className="nav-button flex items-center gap-2" title="Download this image">
                                    <DownloadIcon className="w-5 h-5"/> Download
                                </button>
                                <button onClick={handleFavoriteToggle} className="nav-button p-2.5" title="Toggle favorite">
                                    {favorites.includes(currentImagePair.id) ? <StarIconSolid className="w-5 h-5 text-yellow-400" /> : <StarIcon className="w-5 h-5" />}
                                </button>
                                 <div className="w-px h-6 bg-gray-600"></div>
                                <button onClick={handleDeleteCurrentStep} className="nav-button bg-red-800/50 hover:bg-red-700/80 text-red-200 p-2.5" title="Delete this step">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : mainImage && !isLoading ? (
                     <div className="w-full h-full flex items-center justify-center">
                        <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                            <img src={mainImage} alt="Initial image" className="object-contain w-full h-full rounded-xl" />
                             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white/90 px-4 py-2 rounded-lg text-sm">
                                Choose an edit mode and click Generate to start!
                            </div>
                        </div>
                    </div>
                ) : !isLoading ? (
                    <div className="text-center text-gray-500 my-auto">
                        <PhotoIcon className="w-24 h-24 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Welcome to DragonArt Studio</h2>
                        <p>Upload an image in the control panel to begin your session.</p>
                    </div>
                ) : null}

                {isStorageFull && (
                    <div className="absolute bottom-4 inset-x-4 mx-auto max-w-4xl bg-red-900/90 backdrop-blur-sm border border-red-700 text-white p-4 rounded-lg shadow-lg z-20 flex items-center gap-4 animate-fade-in-up">
                        <XCircleIcon className="w-10 h-10 text-red-300 flex-shrink-0" />
                        <div className="flex-grow">
                            <h3 className="font-bold text-lg">Storage Limit Reached</h3>
                            <p className="text-sm text-red-200 mt-1">Your browser storage is full. Download your work, delete history, or reset the session.</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            <button onClick={handleDownloadSession} disabled={history.length === 0} className="nav-button bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 text-sm px-3 py-2 disabled:opacity-50">
                                <DownloadIcon className="w-4 h-4" /> Download
                            </button>
                            <button onClick={() => handleDeleteOldestSteps(5)} disabled={history.length < 5} className="nav-button bg-yellow-600 hover:bg-yellow-500 text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm px-3 py-2">
                                <TrashIcon className="w-4 h-4" /> Delete 5
                            </button>
                             <button onClick={handleEndSession} className="nav-button bg-red-950 hover:bg-red-800 text-red-100 flex items-center gap-2 text-sm px-3 py-2 border border-red-800">
                                <XCircleIcon className="w-4 h-4" /> Reset
                            </button>
                            <button onClick={() => { setIsStorageFull(false); setError((prev) => (prev && prev.includes("Storage limit") ? null : prev)); }} className="nav-button p-2.5" title="Dismiss">
                               <XCircleIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                )}

                {error && !isStorageFull && (
                    <div className="absolute bottom-4 left-4 max-w-md bg-red-800/80 backdrop-blur-sm border border-red-600 text-white p-4 rounded-lg shadow-lg z-20">
                        <div className="flex">
                            <XCircleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold">Generation Error</h3>
                                <p className="text-sm">{error}</p>
                            </div>
                             <button onClick={() => setError(null)} className="ml-4 flex-shrink-0 text-red-200 hover:text-white"><XCircleIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
