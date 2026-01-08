import React, { useEffect, useState } from 'react';
import { 
  History, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Loader2,
  Calendar,
  RefreshCw,
  FileJson,
  ArrowRight
} from 'lucide-react';
import { enrichmentAPI } from '../utils/api';

interface Job {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  created_at: string;
  completed_at?: string;
}

interface JobHistoryProps {
  onSelectJob: (jobId: string) => void;
}

export const JobHistory: React.FC<JobHistoryProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await enrichmentAPI.getHistory(20, 0);
      setJobs(data);
    } catch (error) {
      console.error('Error fetching job history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      completed: {
        icon: CheckCircle2,
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-700',
        iconColor: 'text-emerald-500',
        label: 'Completed',
      },
      failed: {
        icon: XCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700',
        iconColor: 'text-red-500',
        label: 'Failed',
      },
      running: {
        icon: Loader2,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-500',
        label: 'Running',
      },
      queued: {
        icon: Clock,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-700',
        iconColor: 'text-amber-500',
        label: 'Queued',
      },
    };
    return configs[status as keyof typeof configs] || configs.queued;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-teal-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <span className="text-slate-600 font-medium">Loading job history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Job History</h2>
              <p className="text-sm text-slate-500">{jobs.length} jobs recorded</p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileJson className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs yet</h3>
            <p className="text-slate-500">Submit a query to start your first analysis job.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const config = getStatusConfig(job.status);
              const StatusIcon = config.icon;

              return (
                <div
                  key={job.job_id}
                  className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 border ${config.borderColor}`}>
                      <StatusIcon className={`w-5 h-5 ${config.iconColor} ${job.status === 'running' ? 'animate-spin' : ''}`} />
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {job.job_id.substring(0, 12)}...
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                          {config.label}
                        </span>
                      </div>

                      {job.message && (
                        <p className="text-sm text-slate-600 mb-2 line-clamp-1">
                          {job.message}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span title={formatFullDate(job.created_at)}>
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                        
                        {job.status === 'running' && (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="font-mono">{job.progress}%</span>
                          </div>
                        )}

                        {job.completed_at && (
                          <span className="text-slate-400">
                            Completed {formatDate(job.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {job.status === 'completed' && (
                      <button
                        onClick={() => onSelectJob(job.job_id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <Eye className="w-4 h-4" />
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};