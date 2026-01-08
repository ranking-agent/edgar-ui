import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Activity,
  Timer,
  Zap
} from 'lucide-react';
import { enrichmentAPI, createJobWebSocket } from '../utils/api';

interface JobStatusProps {
  jobId: string;
  onComplete: (jobId: string) => void;
}

interface JobData {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  created_at?: string;
  completed_at?: string;
}

export const JobStatus: React.FC<JobStatusProps> = ({ jobId, onComplete }) => {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const data = await enrichmentAPI.getStatus(jobId);
        setJobData(data);
        setLoading(false);

        if (data.status === 'completed') {
          onComplete(jobId);
          if (ws) ws.close();
          clearInterval(pollInterval);
          clearInterval(timerInterval);
        } else if (data.status === 'failed') {
          if (ws) ws.close();
          clearInterval(pollInterval);
          clearInterval(timerInterval);
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Setup WebSocket for real-time updates
    try {
      ws = createJobWebSocket(jobId, (data) => {
        setJobData((prev) => ({ ...prev, ...data }));
        if (data.status === 'completed') {
          onComplete(jobId);
          if (ws) ws.close();
          clearInterval(timerInterval);
        }
      });
    } catch (error) {
      console.log('WebSocket not available, using polling');
    }

    // Fallback polling
    pollInterval = setInterval(fetchStatus, 3000);
    
    // Elapsed time counter
    timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (ws) ws.close();
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [jobId, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !jobData) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-teal-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <span className="text-slate-600 font-medium">Initializing job...</span>
        </div>
      </div>
    );
  }

  const statusConfig = {
    queued: {
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      label: 'Queued',
    },
    running: {
      icon: Loader2,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      label: 'Processing',
    },
    completed: {
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      label: 'Completed',
    },
    failed: {
      icon: XCircle,
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      label: 'Failed',
    },
  };

  const config = statusConfig[jobData.status as keyof typeof statusConfig] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Job Status</h3>
            <p className="text-sm text-slate-500 font-mono">
              {jobData.job_id.substring(0, 12)}...
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className={`m-6 p-6 bg-gradient-to-br ${config.bgGradient} rounded-xl border ${config.borderColor}`}>
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`w-14 h-14 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className={`w-7 h-7 text-white ${jobData.status === 'running' ? 'animate-spin' : ''}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Status Label */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-bold ${config.textColor}`}>
                {config.label}
              </span>
              {jobData.status === 'running' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-full">
                  <Timer className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-mono text-slate-600">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Message */}
            {jobData.message && (
              <p className={`text-sm ${config.textColor} opacity-80 mb-4`}>
                {jobData.message}
              </p>
            )}

            {/* Progress Bar */}
            {jobData.status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Progress</span>
                  <span className="font-mono font-bold text-slate-700">{jobData.progress}%</span>
                </div>
                <div className="relative h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${jobData.progress}%` }}
                  >
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="mt-4 pt-4 border-t border-current/10 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Started</span>
                <div className="text-sm font-medium text-slate-700 mt-1">
                  {jobData.created_at
                    ? new Date(jobData.created_at).toLocaleTimeString()
                    : '—'}
                </div>
              </div>
              {jobData.completed_at && (
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Completed</span>
                  <div className="text-sm font-medium text-slate-700 mt-1">
                    {new Date(jobData.completed_at).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance indicator for running jobs */}
      {jobData.status === 'running' && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-slate-600">
              Query is being processed by the enrichment engine...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Add shimmer animation to your CSS/Tailwind config:
// @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
// .animate-shimmer { animation: shimmer 2s infinite; }