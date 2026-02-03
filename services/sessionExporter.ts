import JSZip from 'jszip';
import type { ImagePair, EditMode } from '../types';

// --- CONFIGURATION ---

// Modes that are direct edits and should show a before/after comparison slider.
// STRICT LIST as requested: Core, Comic, Art Styles, Puppet, Action Figure.
const COMPARISON_MODES: Set<EditMode> = new Set([
  // Core
  'freestyle', 'edit', 'styleTransfer', 'straighten', 'edge', 'characterSheet',
  // Comic
  'comicPage', 'comicSplash', 'comicBookCover', 
  // Art Styles
  'illustration', 'animeManga', 'watercolor', 'gothicArt', 'pinup', 'bw',
  // Specific
  'puppet', 'actionFigure', 'diorama',
  'photorealistic'
]);

// Defines the display order for the final HTML page, grouping related items.
const DISPLAY_ORDER_MAP: Record<EditMode, number> = {
  // Core/Uncategorized (Show first)
  'freestyle': 1, 'edit': 2, 'styleTransfer': 3, 'straighten': 4, 'edge': 5, 'characterSheet': 6,

  // Photo Fun
  'grid12x': 10, 'panel4x': 11, 'strip3x': 12, 'photorealistic': 13,
  
  // Comic
  'comicPage': 20, 'comicSplash': 21, 'comicBookCover': 22,

  // Posters
  'horrorMoviePoster': 30, 'fantasyMoviePoster': 31, 'sciFiMoviePoster': 32, 'wantedPoster': 33,

  // Magazines
  'magHarpers': 40, 'magSyrens': 41, 'magJoxtrap': 42, 'magFreestyle': 43,

  // Art Styles
  'illustration': 50, 'animeManga': 51, 'watercolor': 52, 'gothicArt': 53, 'pinup': 54, 'bw': 55,

  // Rest
  'mtgCard': 60, 'nonSportsCard': 61, 'sportsCard': 62,
  'videoGameCover': 63, 'vintageBurlesquePostcard': 64, 'vintagePostcard': 65,
  'badgePhoto': 66, 'asSeenOnTV': 67,
  'puppet': 68, 'diorama': 69, 'actionFigure': 70,
  
  // Video
  'veoVideo': 71,
};

// --- HTML TEMPLATE ---

const generateHtmlForSession = (sessionName: string, comparisonsHtml: string, galleryHtml: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session: ${sessionName}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #18181b; /* Zinc 900 */
            color: #f4f4f5; /* Zinc 100 */
            margin: 0; 
            padding: 2rem; 
        }
        h1 { 
            text-align: center; 
            color: #e4e4e7; /* Zinc 200 */
            margin-bottom: 2rem;
            font-weight: 700;
        }
        h2 {
            color: #a1a1aa;
            border-bottom: 1px solid #3f3f46;
            padding-bottom: 0.5rem;
            margin-top: 3rem;
            margin-bottom: 1.5rem;
        }
        .gallery { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); 
            gap: 2rem; 
            max-width: 1920px;
            margin: 0 auto;
        }
        .gallery-item { 
            background-color: #27272a; /* Zinc 800 */
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
            display: flex; 
            flex-direction: column;
            border: 1px solid #3f3f46; /* Zinc 700 */
        }
        .gallery-item .image-container { 
            position: relative; 
            width: 100%; 
            background-color: #18181b; /* Zinc 900 */
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden; 
        }
        /* Maintain aspect ratios based on containers, but limit height */
        .gallery-item .image-container { min-height: 400px; }

        .gallery-item img { 
            max-width: 100%; 
            height: auto;
            display: block;
            user-select: none;
            -webkit-user-drag: none;
        }
        .gallery-item .caption { 
            padding: 0.75rem 1rem; 
            background-color: #3f3f46; /* Zinc 700 */
            text-align: center; 
            font-weight: 600;
            font-size: 0.9rem;
            color: #d4d4d8; /* Zinc 300 */
        }
        footer { 
            text-align: center; 
            margin-top: 3rem; 
            padding-top: 1.5rem; 
            border-top: 1px solid #3f3f46; /* Zinc 700 */
            color: #a1a1aa; /* Zinc 400 */
        }
        
        /* -- SLIDER STYLES -- */
        .comparison-slider { 
            cursor: ew-resize; 
            position: relative;
            aspect-ratio: 2/3; /* Default fallback */
        }
        .comparison-slider img {
            width: 100%; height: 100%; object-fit: contain;
        }
        .comparison-slider .after-image {
            position: absolute; top: 0; left: 0;
        }
        .comparison-slider .before-wrapper { 
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
            overflow: hidden; 
        }
        .comparison-slider .slider-line { 
            position: absolute; 
            top: 0; bottom: 0; 
            width: 3px; 
            background-color: rgba(255,255,255,0.7); 
            pointer-events: none; 
            transform: translateX(-1.5px); 
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .comparison-slider .slider-handle { 
            position: absolute; 
            top: 50%; 
            width: 44px; height: 44px; 
            border: 3px solid rgba(255,255,255,0.7); 
            border-radius: 50%; 
            background-color: rgba(24, 24, 27, 0.6); 
            backdrop-filter: blur(4px);
            pointer-events: none; 
            transform: translate(-50%, -50%); 
            display: flex; align-items: center; justify-content: center; 
        }
        .slider-handle svg { 
            width: 24px; height: 24px; color: white; transform: rotate(90deg); 
        }
    </style>
</head>
<body>
    <h1>${sessionName}</h1>
    
    ${comparisonsHtml ? `<h2>Transformations & Comparisons</h2><div class="gallery">${comparisonsHtml}</div>` : ''}
    ${galleryHtml ? `<h2>Gallery</h2><div class="gallery">${galleryHtml}</div>` : ''}

    <footer>
        &copy; ${new Date().getFullYear()} Seed 13 Productions
    </footer>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.comparison-slider').forEach(slider => {
                let isDragging = false;
                const beforeWrapper = slider.querySelector('.before-wrapper');
                const sliderLine = slider.querySelector('.slider-line');

                const setSliderPosition = (x) => {
                    const rect = slider.getBoundingClientRect();
                    const percent = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
                    beforeWrapper.style.clipPath = \`inset(0 \${100 - percent}% 0 0)\`;
                    sliderLine.style.left = \`\${percent}%\`;
                };

                slider.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    isDragging = true;
                    setSliderPosition(e.clientX);
                });
                
                slider.addEventListener('pointermove', (e) => {
                    if (isDragging) {
                        e.preventDefault();
                        setSliderPosition(e.clientX);
                    }
                });

                window.addEventListener('pointerup', (e) => {
                    if (isDragging) {
                        e.preventDefault();
                        isDragging = false;
                    }
                });
                
                slider.addEventListener('pointerleave', (e) => {
                    if(isDragging) {
                       // Keep dragging if mouse leaves container
                    }
                });

                setSliderPosition(slider.getBoundingClientRect().left + slider.getBoundingClientRect().width / 2);
            });
        });
    </script>
</body>
</html>`;


// --- CORE FUNCTION ---

// Re-defining the export to include mainImage
export const createSessionZipWithMain = async (history: ImagePair[], sessionName: string, mainImage: string): Promise<Blob> => {
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    if (!imagesFolder) {
        throw new Error("Could not create images folder in zip.");
    }

    // Sort history based on the predefined display order
    const sortedHistory = [...history].sort((a, b) => {
        const orderA = DISPLAY_ORDER_MAP[a.editMode] ?? 99;
        const orderB = DISPLAY_ORDER_MAP[b.editMode] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    let comparisonsHtml = '';
    let galleryHtml = '';
    
    // We need to write the main image to the zip once if used.
    const mainImageFilename = "source_image.png";
    const mainImageBlob = await (await fetch(mainImage)).blob();
    imagesFolder.file(mainImageFilename, mainImageBlob);

    for (let i = 0; i < sortedHistory.length; i++) {
        const pair = sortedHistory[i];
        const stepNumber = history.indexOf(pair) + 1;
        const caption = `${sessionName} - Step ${stepNumber} (${pair.editMode})`;

        const afterFilename = `step_${stepNumber}_after.png`;
        const afterBlob = await (await fetch(pair.after)).blob();
        imagesFolder.file(afterFilename, afterBlob);

        if (COMPARISON_MODES.has(pair.editMode)) {
            // Resolve the before image
            let beforeFilename = mainImageFilename; // Default to main
            if (pair.parentId !== 'root') {
                 // Find the parent in the history
                 const parent = history.find(h => h.id === pair.parentId);
                 if (parent) {
                     // We need to name it consistent with the parent's after file
                     const parentStep = history.indexOf(parent) + 1;
                     beforeFilename = `step_${parentStep}_after.png`;
                 }
            }

            comparisonsHtml += `
            <div class="gallery-item">
                <div class="image-container comparison-slider">
                    <img src="images/${afterFilename}" class="after-image" alt="After: ${caption}">
                    <div class="before-wrapper">
                        <img src="images/${beforeFilename}" class="before-image" alt="Before: ${caption}">
                    </div>
                    <div class="slider-line">
                        <div class="slider-handle">
                           <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                        </div>
                    </div>
                </div>
                <div class="caption">${caption}</div>
            </div>`;
        } else { 
            galleryHtml += `
            <div class="gallery-item">
                <div class="image-container">
                    <img src="images/${afterFilename}" alt="${caption}">
                </div>
                <div class="caption">${caption}</div>
            </div>`;
        }
    }

    const finalHtml = generateHtmlForSession(sessionName, comparisonsHtml, galleryHtml);
    zip.file("index.html", finalHtml);

    return zip.generateAsync({ type: "blob" });
};