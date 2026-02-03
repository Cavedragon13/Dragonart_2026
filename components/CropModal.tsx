import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropConfirm: (croppedImage: string) => void;
}

const MIN_CROP_SIZE = 50; // Minimum pixel dimension for the crop area
const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

export const CropModal: React.FC<CropModalProps> = ({ isOpen, imageSrc, onClose, onCropConfirm }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 0, height: 0 });
  const [imageLayout, setImageLayout] = useState<ImageLayout | null>(null);

  const [activeInteraction, setActiveInteraction] = useState<'move' | 'resize' | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  const interactionStart = useRef({ clientX: 0, clientY: 0, crop: crop });

  const onImageLoad = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const containerRect = container.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;
    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerRect.width / containerRect.height;
    
    let displayWidth = containerRect.width;
    let displayHeight = containerRect.height;

    if (imageAspectRatio > containerAspectRatio) {
      displayHeight = displayWidth / imageAspectRatio;
    } else {
      displayWidth = displayHeight * imageAspectRatio;
    }

    const x = (containerRect.width - displayWidth) / 2;
    const y = (containerRect.height - displayHeight) / 2;
    
    const layout = { x, y, width: displayWidth, height: displayHeight };
    setImageLayout(layout);

    const initialSize = Math.min(displayWidth, displayHeight) * 0.8;
    setCrop({
      x: x + (displayWidth - initialSize) / 2,
      y: y + (displayHeight - initialSize) / 2,
      width: initialSize,
      height: initialSize,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setImageLayout(null);
    }
  }, [isOpen]);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>, 
    interaction: 'move' | 'resize', 
    handle?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveInteraction(interaction);
    if (interaction === 'resize' && handle) {
      setResizeHandle(handle);
    }
    interactionStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      crop: crop,
    };
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!activeInteraction || !imageLayout) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - interactionStart.current.clientX;
    const dy = e.clientY - interactionStart.current.clientY;
    let { x, y, width, height } = interactionStart.current.crop;

    if (activeInteraction === 'move') {
      x += dx;
      y += dy;
    } else if (activeInteraction === 'resize' && resizeHandle) {
        if (resizeHandle.includes('e')) width += dx;
        if (resizeHandle.includes('w')) { width -= dx; x += dx; }
        if (resizeHandle.includes('s')) height += dy;
        if (resizeHandle.includes('n')) { height -= dy; y += dy; }

        if (width < MIN_CROP_SIZE) {
          width = MIN_CROP_SIZE;
          if (resizeHandle.includes('w')) x = interactionStart.current.crop.x + interactionStart.current.crop.width - MIN_CROP_SIZE;
        }
        if (height < MIN_CROP_SIZE) {
          height = MIN_CROP_SIZE;
          if (resizeHandle.includes('n')) y = interactionStart.current.crop.y + interactionStart.current.crop.height - MIN_CROP_SIZE;
        }
    }
    
    // Constrain to image boundaries
    x = Math.max(imageLayout.x, Math.min(x, imageLayout.x + imageLayout.width - width));
    y = Math.max(imageLayout.y, Math.min(y, imageLayout.y + imageLayout.height - height));
    
    if (x + width > imageLayout.x + imageLayout.width) {
        width = imageLayout.x + imageLayout.width - x;
    }
    if (y + height > imageLayout.y + imageLayout.height) {
        height = imageLayout.y + imageLayout.height - y;
    }

    setCrop({ x, y, width, height });
  }, [activeInteraction, resizeHandle, imageLayout, crop]);


  const handlePointerUp = useCallback((e: PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveInteraction(null);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);
  
  const handleCropConfirmClick = () => {
    if (!imgRef.current || !canvasRef.current || !imageLayout) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { naturalWidth, naturalHeight } = img;
    const scaleX = naturalWidth / imageLayout.width;
    const scaleY = naturalHeight / imageLayout.height;

    const sourceX = (crop.x - imageLayout.x) * scaleX;
    const sourceY = (crop.y - imageLayout.y) * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

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
    onCropConfirm(canvas.toDataURL('image/jpeg', 0.95));
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" aria-modal="true">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 m-4 max-w-5xl w-full h-[90vh] border border-gray-700 flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">Crop Image</h2>
            <div ref={containerRef} className="relative flex-grow min-h-0 w-full select-none touch-none bg-gray-900/50 rounded-lg">
                <img 
                    ref={imgRef} 
                    src={imageSrc || ''} 
                    alt="Image to crop" 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 block max-w-full max-h-full object-contain"
                    onLoad={onImageLoad}
                    style={{ visibility: imageLayout ? 'visible' : 'hidden' }}
                />
                
                {imageLayout && (
                    <>
                        {/* Overlay Dims */}
                        <div className="absolute inset-0 bg-black/60 pointer-events-none" style={{
                            clipPath: `path(evenodd, "M0 0 H ${containerRef.current?.clientWidth || 0} V ${containerRef.current?.clientHeight || 0} H 0 Z M ${crop.x} ${crop.y} H ${crop.x + crop.width} V ${crop.y + crop.height} H ${crop.x} Z")`
                        }} />

                        {/* Crop Selection */}
                        <div 
                          className="absolute border-2 border-dashed border-white cursor-move" 
                          style={{ transform: `translate(${crop.x}px, ${crop.y}px)`, width: crop.width, height: crop.height }}
                          onPointerDown={(e) => handlePointerDown(e, 'move')}
                        >
                            {HANDLES.map(handle => (
                                <div
                                    key={handle}
                                    onPointerDown={(e) => handlePointerDown(e, 'resize', handle)}
                                    className={`absolute w-3 h-3 bg-white rounded-full border-2 border-gray-800 
                                        ${handle.includes('n') ? '-top-1.5' : ''} ${handle.includes('s') ? '-bottom-1.5' : ''} 
                                        ${handle.includes('w') ? '-left-1.5' : ''} ${handle.includes('e') ? '-right-1.5' : ''} 
                                        ${handle.length === 1 ? (handle === 'n' || handle === 's' ? 'left-1/2 -translate-x-1/2 cursor-ns-resize' : 'top-1/2 -translate-y-1/2 cursor-ew-resize') : ''} 
                                        ${handle === 'nw' && 'cursor-nwse-resize'} ${handle === 'ne' && 'cursor-nesw-resize'} 
                                        ${handle === 'sw' && 'cursor-nesw-resize'} ${handle === 'se' && 'cursor-nwse-resize'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="mt-6 flex justify-end space-x-4 flex-shrink-0">
                <button onClick={onClose} className="py-2 px-4 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={handleCropConfirmClick} disabled={!imageLayout} className="py-2 px-6 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition disabled:opacity-50">Confirm Crop</button>
            </div>
        </div>
    </div>
  );
};
