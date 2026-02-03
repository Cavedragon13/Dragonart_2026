
import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons';

interface SessionNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  suggestedNames: string[];
  isLoadingSuggestions: boolean;
  onSuggestMore: () => void;
}

export const SessionNameModal: React.FC<SessionNameModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suggestedNames,
  isLoadingSuggestions,
  onSuggestMore
}) => {
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    if (suggestedNames.length > 0 && !sessionName) {
      setSessionName(suggestedNames[0]);
    }
  }, [suggestedNames, sessionName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionName.trim()) {
      onSubmit(sessionName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl p-8 m-4 max-w-lg w-full border border-gray-700"
      >
        <h2 className="text-2xl font-bold text-white mb-4">Start New Session</h2>
        <p className="text-gray-400 mb-6">Give your editing session a name. We've suggested a few based on your image.</p>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Summer Vacation Photos"
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              aria-label="Session Name"
              disabled={isLoadingSuggestions && suggestedNames.length === 0}
            />
          </div>

          <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {suggestedNames.map((name, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => setSessionName(name)}
                        className="py-1 px-3 bg-gray-700 text-gray-300 text-sm rounded-full hover:bg-purple-600 hover:text-white transition"
                    >
                        {name}
                    </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={onSuggestMore}
                disabled={isLoadingSuggestions}
                className="w-full text-sm text-purple-400 hover:text-purple-300 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              >
                 {isLoadingSuggestions ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Getting suggestions...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        Suggest More
                    </>
                 )}
              </button>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sessionName.trim()}
              className="py-2 px-6 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
