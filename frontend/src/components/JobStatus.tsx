import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Loader, TrendingUp } from 'lucide-react';
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

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const data = await enrichmentAPI.getStatus(jobId);
        setJobData(data);
        setLoading(false);

        if (data.status === 'completed') {
          onComplete(jobId);
          if (ws) ws.close();
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          if (ws) ws.close();
          clearInterval(pollInterval);
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
        }
      });
    } catch (error) {
      console.log('WebSocket not available, using polling');
    }

    // Fallback polling
    pollInterval = setInterval(fetchStatus, 3000);

    return () => {
      if (ws) ws.close();
      clearInterval(pollInterval);
    };
  }, [jobId, onComplete]);

  if (loading || !jobData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-gray-600">Loading job status...</span>
        </div>
      </div>
    );
  }

  const statusConfig = {
    queued: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    running: {
      icon: Loader,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };

  const config = statusConfig[jobData.status as keyof typeof statusConfig] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Job Status</h2>
      </div>

      <div className={`border-2 ${config.borderColor} ${config.bgColor} rounded-lg p-6`}>
        <div className="flex items-start gap-4">
          <Icon
            className={`w-8 h-8 ${config.color} ${
              jobData.status === 'running' ? 'animate-spin' : ''
            }`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {jobData.status}
              </h3>
              <span className="text-sm text-gray-500">Job ID: {jobData.job_id.substring(0, 8)}...</span>
            </div>

            {jobData.message && (
              <p className="text-gray-700 mb-4">{jobData.message}</p>
            )}

            {jobData.status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{jobData.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${jobData.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <div className="font-medium text-gray-900">
                  {jobData.created_at
                    ? new Date(jobData.created_at).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
              {jobData.completed_at && (
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <div className="font-medium text-gray-900">
                    {new Date(jobData.completed_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
