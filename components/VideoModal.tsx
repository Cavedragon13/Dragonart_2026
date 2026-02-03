
import React from 'react';
import { XCircleIcon, DownloadIcon } from './icons';

interface VideoModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, videoUrl, onClose }) => {
  if (!isOpen || !videoUrl) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6 max-w-4xl w-full mx-4 flex flex-col relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
            <XCircleIcon className="w-8 h-8" />
        </button>

        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-purple-500">Veo</span> Video Studio
        </h3>

        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-600 shadow-inner">
            <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain" 
            />
        </div>

        <div className="mt-6 flex justify-between items-center">
            <p className="text-gray-400 text-sm">
                Generated with Veo 3.1. This video is not saved to your session history.
            </p>
            <a 
                href={videoUrl} 
                download="dragonart-veo-video.mp4"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20"
            >
                <DownloadIcon className="w-5 h-5" />
                Download Video
            </a>
        </div>
      </div>
    </div>
  );
};
