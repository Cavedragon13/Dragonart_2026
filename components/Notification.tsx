import React, { useState, useEffect } from 'react';

interface NotificationProps {
  message: string;
  onDismiss: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Trigger fade in
    const timer = setTimeout(() => {
      setVisible(false); // Trigger fade out
      setTimeout(onDismiss, 300); // Allow fade out animation to finish
    }, 3000); // Notification visible for 3 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div 
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600/90 backdrop-blur-sm border border-green-500 text-white px-6 py-3 rounded-lg shadow-2xl z-50 transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      role="alert"
    >
      {message}
    </div>
  );
};
