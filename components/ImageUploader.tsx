import React, { useRef, useState, useCallback, useEffect } from 'react';
import { UploadIcon, XCircleIcon, CameraIcon, ClipboardIcon } from './icons';

interface CameraModalProps {
  onClose: () => void;
  onCapture: (image: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeStream: MediaStream;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera not supported on this browser.");
        }
        activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please check permissions and try again.");
      }
    };
    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      onCapture(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" aria-modal="true">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 m-4 max-w-2xl w-full border border-gray-700 flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-4">Camera Capture</h2>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {error && <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-red-400 p-4">{error}</div>}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="mt-6 flex justify-end space-x-4">
                <button onClick={onClose} className="py-2 px-4 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={handleCapture} disabled={!!error} className="py-2 px-6 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition disabled:opacity-50">Capture</button>
            </div>
        </div>
    </div>
  );
};


interface ImageUploaderProps {
  image: string | null;
  onImagesSelected: (images: string[]) => void;
  onRemove: () => void;
  multiple?: boolean;
  onPaste?: (event: React.ClipboardEvent | React.MouseEvent) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ image, onImagesSelected, onRemove, multiple = false, onPaste }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    // FIX: Explicitly type `file` to resolve TypeScript error.
    const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const promises = imageFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    resolve(reader.result as string);
                } else {
                    reject(new Error('Failed to read file.'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(promises).then(base64Images => {
        onImagesSelected(base64Images);
    }).catch(err => {
        console.error("Error processing files:", err);
        alert("There was an error processing one or more images.");
    });
  }, [onImagesSelected]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    // Reset input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
    if (inputRef.current) {
        inputRef.current.value = "";
    }
  };
  
  const handleClick = () => {
    inputRef.current?.click();
  }

  const handleKeyboardPaste = useCallback((event: React.ClipboardEvent) => {
    if (onPaste) {
      onPaste(event);
    } else if (event.clipboardData.files.length > 0) {
      // Fallback if onPaste is not provided
      event.preventDefault();
      processFiles(event.clipboardData.files);
    }
  }, [processFiles, onPaste]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  return (
    <>
      {isCameraOpen && (
        <CameraModal
          onClose={() => setIsCameraOpen(false)}
          onCapture={(img) => {
            onImagesSelected([img]);
            setIsCameraOpen(false);
          }}
        />
      )}
      <div 
        className={`relative w-full aspect-video bg-gray-900/50 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-500 cursor-pointer hover:border-purple-500 hover:text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDraggingOver ? 'border-purple-500' : 'border-gray-700'}`}
        onClick={handleClick}
        onPaste={handleKeyboardPaste}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        tabIndex={0}
        aria-label="Image uploader, click, paste, or drag and drop an image"
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          multiple={multiple}
        />
        {image ? (
          <>
            <img src={image} alt="Upload preview" className="object-contain w-full h-full rounded-md" />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1 transition-transform hover:scale-110"
              aria-label="Remove image"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </>
        ) : (
          <div className="text-center flex flex-col items-center gap-3 pointer-events-none">
              <UploadIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold">{ multiple ? 'Upload file(s)' : 'Click to upload' } or drag & drop</p>
              <p className="text-xs">You can also paste an image directly (Ctrl+V)</p>
          </div>
        )}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-purple-900/50 border-2 border-purple-400 rounded-lg flex flex-col items-center justify-center pointer-events-none">
              <UploadIcon className="w-12 h-12 text-purple-300 mb-4" />
              <p className="text-lg font-semibold text-purple-200">Drop image(s) to upload</p>
          </div>
        )}
      </div>
       {!multiple && !image && (
        <div className="flex w-full gap-2 mt-2">
            {onPaste && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPaste(e);
                }}
                className="w-full text-sm bg-gray-700/60 text-gray-300 hover:bg-gray-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200"
                title="Paste image from clipboard"
              >
                <ClipboardIcon className="w-5 h-5 mr-2" />
                Paste Image
              </button>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsCameraOpen(true);
                }}
                className="w-full text-sm bg-gray-700/60 text-gray-300 hover:bg-gray-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200"
            >
                <CameraIcon className="w-5 h-5 mr-2" />
                Use Camera
            </button>
        </div>
       )}
    </>
  );
};
