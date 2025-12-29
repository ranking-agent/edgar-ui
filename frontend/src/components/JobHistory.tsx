import React, { useEffect, useState } from 'react';
import { History, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
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

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await enrichmentAPI.getHistory(20, 0);
        setJobs(data);
        console.log(data)
      } catch (error) {
        console.error('Error fetching job history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'running':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-600">Loading job history...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Job History</h2>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No jobs found. Submit a job to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.job_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="font-semibold text-gray-900">
                      Job {job.job_id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                    job.status
                  )}`}
                >
                  {job.status.toUpperCase()}
                </span>
              </div>

              {job.message && (
                <p className="text-sm text-gray-600 mb-3">{job.message}</p>
              )}

              {job.status === 'running' && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {job.completed_at && (
                <div className="text-xs text-gray-500 mb-3">
                  Completed: {new Date(job.completed_at).toLocaleString()}
                </div>
              )}

              {job.status === 'completed' && (
                <button
                  onClick={() => onSelectJob(job.job_id)}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Results
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
