import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Activity,
  Timer,
  Zap,
  Send,
  Download,
  Database,
  AlertTriangle,
  Server,
  Wifi,
  WifiOff,
  Search,
  GitBranch,
  Sparkles,
  FileCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Package
} from 'lucide-react';
import { enrichmentAPI, createJobWebSocket } from '../utils/api';

interface JobStatusProps {
  jobId: string;
  onComplete: (jobId: string) => void;
}

interface PipelineLog {
  level: string;
  message: string;
  metadata?: {
    total_lookups?: number;
    total_enrichments?: number;
    graph_enrichments?: number;
    property_enrichments?: number;
    total_inferences?: number;
    unique_inferred_nodes?: number;
    timing_seconds?: number;
    pvalue_stats?: {
      min: number;
      max: number;
    };
    graph_inferences?: {
      total: number;
      unique: number;
      enrichments_used: number;
    };
    property_inferences?: {
      total: number;
      unique: number;
      enrichments_used: number;
    };
    timing?: {
      total_seconds: number;
      pruning_seconds?: number;
    };
    results?: {
      total_before_filtering: number;
      total_after_filtering: number;
    };
    scores?: {
      min: number;
      max: number;
    };
    enrichments?: {
      before_pruning: number;
      after_pruning: number;
    };
    knowledge_graph?: {
      [key: string]: {
        nodes: number;
        edges: number;
        aux_graphs: number;
      };
    };
  };
}

interface JobData {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  created_at?: string;
  completed_at?: string;
  logs?: PipelineLog[];
}

// Pipeline stage configuration
const PIPELINE_STAGES = [
  { 
    key: 'Lookup stage complete', 
    label: 'Lookup', 
    icon: Search,
    color: 'blue',
    description: 'Finding related entities in knowledge graph'
  },
  { 
    key: 'Enrichment stage complete', 
    label: 'Enrichment', 
    icon: GitBranch,
    color: 'purple',
    description: 'Analyzing graph patterns and properties'
  },
  { 
    key: 'Inference lookup complete', 
    label: 'Inference', 
    icon: Sparkles,
    color: 'amber',
    description: 'Generating inferred relationships'
  },
  { 
    key: 'EDGAR finalization complete', 
    label: 'Finalization', 
    icon: FileCheck,
    color: 'emerald',
    description: 'Pruning and scoring results'
  },
  { 
    key: 'Response build complete', 
    label: 'Response', 
    icon: Package,
    color: 'indigo',
    description: 'Building TRAPI response'
  },
];

// Get stage status from logs
const getStageStatus = (logs: PipelineLog[], stageKey: string) => {
  const log = logs.find(l => l.message === stageKey);
  if (!log) return { status: 'pending', log: null };
  if (log.level === 'ERROR') return { status: 'error', log };
  return { status: 'complete', log };
};

// Format number with appropriate precision
const formatNumber = (num: number) => {
  if (num < 0.0001) return num.toExponential(2);
  if (num < 1) return num.toFixed(6);
  return num.toLocaleString();
};

export const JobStatus: React.FC<JobStatusProps> = ({ jobId, onComplete }) => {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

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

    // Fallback polling - every 2 seconds for more responsive updates
    pollInterval = setInterval(fetchStatus, 2000);
    
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
            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
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

  // Parse logs if available
  const logs = jobData.logs || [];
  const hasLogs = logs.length > 0;
  
  // Find error log if any
  const errorLog = logs.find(l => l.level === 'ERROR');
  
  // Find the failed stage
  const getFailedStage = () => {
    if (!errorLog) return null;
    const stage = PIPELINE_STAGES.find(s => errorLog.message.toLowerCase().includes(s.label.toLowerCase()));
    return stage || { label: 'Unknown Stage', icon: AlertCircle, color: 'red' };
  };

  const failedStage = jobData.status === 'failed' ? getFailedStage() : null;

  // Calculate total timing from logs
  const getTotalTiming = () => {
    return logs.reduce((total, log) => {
      if (log.metadata?.timing_seconds) return total + log.metadata.timing_seconds;
      if (log.metadata?.timing?.total_seconds) return total + log.metadata.timing.total_seconds;
      return total;
    }, 0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
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

      {/* Pipeline Stages Visualization */}
      {hasLogs && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700">EDGAR Pipeline</h4>
            {jobData.status === 'completed' && (
              <span className="text-xs text-slate-500">
                Total: {getTotalTiming().toFixed(2)}s
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {PIPELINE_STAGES.map((stage, idx) => {
              const { status, log } = getStageStatus(logs, stage.key);
              const StageIcon = stage.icon;
              
              const bgColor = status === 'complete' 
                ? `bg-${stage.color}-500` 
                : status === 'error' 
                  ? 'bg-red-500' 
                  : 'bg-slate-200';
              
              const iconColor = status === 'pending' ? 'text-slate-400' : 'text-white';
              
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center flex-1 group relative">
                    <div 
                      className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center transition-all ${
                        status === 'error' ? 'ring-2 ring-red-300 ring-offset-2' : ''
                      }`}
                      title={stage.description}
                    >
                      {status === 'error' ? (
                        <XCircle className="w-5 h-5 text-white" />
                      ) : (
                        <StageIcon className={`w-5 h-5 ${iconColor}`} />
                      )}
                    </div>
                    <span className={`text-xs mt-1.5 font-medium ${
                      status === 'error' ? 'text-red-600' : 
                      status === 'complete' ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {stage.label}
                    </span>
                    {log?.metadata?.timing_seconds && (
                      <span className="text-xs text-slate-400">
                        {log.metadata.timing_seconds.toFixed(2)}s
                      </span>
                    )}
                    {log?.metadata?.timing?.total_seconds && (
                      <span className="text-xs text-slate-400">
                        {log.metadata.timing.total_seconds.toFixed(2)}s
                      </span>
                    )}
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 ${
                      getStageStatus(logs, PIPELINE_STAGES[idx + 1].key).status !== 'pending'
                        ? `bg-${stage.color}-300`
                        : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Stage Error Details */}
      {jobData.status === 'failed' && errorLog && (
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-800 mb-1">
                {failedStage ? `Error in ${failedStage.label} Stage` : 'Pipeline Error'}
              </div>
              <div className="text-xs text-red-700 mb-2">
                {errorLog.message}
              </div>
              {errorLog.metadata && (
                <pre className="text-xs bg-red-100 text-red-800 p-2 rounded-lg overflow-x-auto">
                  {JSON.stringify(errorLog.metadata, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Logs Toggle */}
      {hasLogs && jobData.status === 'completed' && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
          >
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showLogs ? 'Hide' : 'Show'} Detailed Logs
          </button>

          {showLogs && (
            <div className="mt-4 space-y-3">
              {logs.map((log, idx) => {
                const stage = PIPELINE_STAGES.find(s => s.key === log.message);
                const StageIcon = stage?.icon || Activity;
                const isError = log.level === 'ERROR';
                
                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      isError 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isError ? 'bg-red-500' : 'bg-purple-500'
                      }`}>
                        <StageIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${isError ? 'text-red-800' : 'text-slate-800'}`}>
                          {log.message}
                        </div>
                        <div className={`text-xs ${isError ? 'text-red-600' : 'text-slate-500'}`}>
                          {log.level}
                        </div>
                      </div>
                    </div>
                    
                    {log.metadata && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {/* Lookup Stage */}
                        {log.metadata.total_lookups !== undefined && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Total Lookups</div>
                            <div className="text-sm font-semibold text-slate-800">
                              {log.metadata.total_lookups}
                            </div>
                          </div>
                        )}
                        
                        {/* Enrichment Stage */}
                        {log.metadata.total_enrichments !== undefined && (
                          <>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500">Total Enrichments</div>
                              <div className="text-sm font-semibold text-slate-800">
                                {log.metadata.total_enrichments}
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500">Graph / Property</div>
                              <div className="text-sm font-semibold text-slate-800">
                                {log.metadata.graph_enrichments} / {log.metadata.property_enrichments}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {log.metadata.pvalue_stats && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">P-value Range</div>
                            <div className="text-xs font-mono text-slate-800">
                              {formatNumber(log.metadata.pvalue_stats.min)} - {formatNumber(log.metadata.pvalue_stats.max)}
                            </div>
                          </div>
                        )}
                        
                        {/* Inference Stage */}
                        {log.metadata.total_inferences !== undefined && (
                          <>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500">Total Inferences</div>
                              <div className="text-sm font-semibold text-slate-800">
                                {log.metadata.total_inferences.toLocaleString()}
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500">Unique Inferred</div>
                              <div className="text-sm font-semibold text-slate-800">
                                {log.metadata.unique_inferred_nodes?.toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {log.metadata.graph_inferences && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Graph Inferences</div>
                            <div className="text-xs text-slate-800">
                              {log.metadata.graph_inferences.unique} unique / {log.metadata.graph_inferences.total} total
                            </div>
                          </div>
                        )}
                        
                        {log.metadata.property_inferences && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Property Inferences</div>
                            <div className="text-xs text-slate-800">
                              {log.metadata.property_inferences.unique} unique / {log.metadata.property_inferences.total} total
                            </div>
                          </div>
                        )}
                        
                        {/* Finalization Stage */}
                        {log.metadata.results && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Results</div>
                            <div className="text-sm font-semibold text-slate-800">
                              {log.metadata.results.total_after_filtering.toLocaleString()}
                            </div>
                          </div>
                        )}
                        
                        {log.metadata.scores && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Score Range</div>
                            <div className="text-xs font-mono text-slate-800">
                              {log.metadata.scores.min.toFixed(4)} - {log.metadata.scores.max.toFixed(4)}
                            </div>
                          </div>
                        )}
                        
                        {log.metadata.enrichments && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Enrichments (after pruning)</div>
                            <div className="text-sm font-semibold text-slate-800">
                              {log.metadata.enrichments.after_pruning}
                            </div>
                          </div>
                        )}
                        
                        {/* Timing */}
                        {(log.metadata.timing_seconds || log.metadata.timing?.total_seconds) && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500">Timing</div>
                            <div className="text-sm font-semibold text-slate-800">
                              {(log.metadata.timing_seconds || log.metadata.timing?.total_seconds)?.toFixed(3)}s
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Running status - show current stage */}
      {jobData.status === 'running' && !hasLogs && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-purple-800">
                Processing Query
              </div>
              <div className="text-xs text-purple-600">
                {jobData.message || 'Running EDGAR pipeline...'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 rounded-full">
              <Wifi className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-600 font-medium">Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* AnswerCoalesce Error Details - when no logs available */}
      {jobData.status === 'failed' && !hasLogs && jobData.message?.toLowerCase().includes('answercoalesce') && (
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-800 mb-1">
                External Service Issue
              </div>
              <div className="text-xs text-amber-700 mb-3">
                The AnswerCoalesce service encountered an error while processing your query. 
                This is not an issue with EDGAR.
              </div>
              <div className="text-xs text-amber-600">
                <div className="font-semibold mb-1.5">Suggestions:</div>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Try a more specific query with fewer expected results</li>
                  <li>Add constraints to narrow down the search</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Error Details - when no logs and not AnswerCoalesce error */}
      {jobData.status === 'failed' && !hasLogs && !jobData.message?.toLowerCase().includes('answercoalesce') && (
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-800 mb-1">
                Analysis Failed
              </div>
              <div className="text-xs text-red-700">
                {jobData.message || 'An unknown error occurred'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};