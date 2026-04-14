import React, { useEffect, useState } from 'react';
import { CheckCircle, X, Clock, ArrowRight } from 'lucide-react';
import { enrichmentAPI } from '../utils/api';

interface Notification {
  job_id: string;
  num_results: number;
  completed_at: string;
  elapsed_seconds: number;
}

interface NotificationToastProps {
  onViewResults: (jobId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onViewResults }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Poll for notifications every 15 seconds
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const response = await enrichmentAPI.getNotifications();
        if (response.notifications?.length > 0) {
          setNotifications(response.notifications.filter(
            (n: Notification) => !dismissed.has(n.job_id)
          ));
        }
      } catch (e) {
        // Silent fail
      }
    };

    // Check immediately
    checkNotifications();

    // Then poll
    const interval = setInterval(checkNotifications, 15000);
    return () => clearInterval(interval);
  }, [dismissed]);

  const handleView = async (jobId: string) => {
    try {
      await enrichmentAPI.markNotificationSeen(jobId);
    } catch (e) {
      // Continue anyway
    }
    setDismissed(prev => new Set(prev).add(jobId));
    onViewResults(jobId);
  };

  const handleDismiss = async (jobId: string) => {
    try {
      await enrichmentAPI.markNotificationSeen(jobId);
    } catch (e) {
      // Continue anyway
    }
    setDismissed(prev => new Set(prev).add(jobId));
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.job_id}
          className="bg-white border-2 border-green-400 rounded-xl shadow-2xl p-4 max-w-sm animate-slide-up"
          style={{
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">Query Complete!</h4>
              <p className="text-sm text-gray-600 mt-1">
                Found <span className="font-semibold text-purple-600">{notification.num_results}</span> results
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <Clock className="w-3 h-3" />
                <span>Completed in {formatTime(notification.elapsed_seconds)}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleView(notification.job_id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                  View Results
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDismiss(notification.job_id)}
                  className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button 
              onClick={() => handleDismiss(notification.job_id)} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
