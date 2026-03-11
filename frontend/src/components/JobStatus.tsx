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
  if (log.level?.toLowerCase() === 'error') return { status: 'error', log };
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'polling' | 'reconnecting'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000;

    const fetchStatus = async () => {
      try {
        const data = await enrichmentAPI.getStatus(jobId);
        setJobData(data);
        setLoading(false);
        setLastUpdate(new Date());

        // Check if all pipeline stages completed based on logs
        const pipelineLogs = data.logs || [];
        const completedStageKeys = PIPELINE_STAGES.map(s => s.key);
        const allStagesInLogs = completedStageKeys.every(key => 
          pipelineLogs.some((log: PipelineLog) => log.message === key && log.level?.toLowerCase() !== 'error')
        );
        const hasErrorInLogs = pipelineLogs.some((log: PipelineLog) => log.level?.toLowerCase() === 'error');

        // Treat as completed if: status is completed OR (all stages done in logs without errors)
        const isActuallyCompleted = data.status === 'completed' || (allStagesInLogs && !hasErrorInLogs);
        const isActuallyFailed = data.status === 'failed' && !allStagesInLogs;

        if (isActuallyCompleted) {
          onComplete(jobId);
          if (ws) ws.close();
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          clearTimeout(reconnectTimeout);
        } else if (isActuallyFailed || hasErrorInLogs) {
          if (ws) ws.close();
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          clearTimeout(reconnectTimeout);
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
        setLoading(false);
      }
    };

    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting');
        ws = createJobWebSocket(jobId, (data) => {
          setJobData((prev) => ({ ...prev, ...data }));
          setLastUpdate(new Date());
          setConnectionStatus('connected');
          reconnectAttempts = 0; // Reset on successful message
          
          if (data.status === 'completed') {
            onComplete(jobId);
            if (ws) ws.close();
            clearInterval(timerInterval);
          }
        });

        if (ws) {
          ws.onopen = () => {
            setConnectionStatus('connected');
            reconnectAttempts = 0;
          };

          ws.onclose = () => {
            if (jobData?.status !== 'completed' && jobData?.status !== 'failed') {
              // Attempt reconnection
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                setConnectionStatus('reconnecting');
                reconnectTimeout = setTimeout(() => {
                  reconnectAttempts++;
                  connectWebSocket();
                }, RECONNECT_DELAY);
              } else {
                setConnectionStatus('polling');
              }
            }
          };

          ws.onerror = () => {
            console.log('WebSocket error, will attempt reconnection');
          };
        }
      } catch (error) {
        console.log('WebSocket not available, using polling');
        setConnectionStatus('polling');
      }
    };

    // Initial fetch
    fetchStatus();

    // Setup WebSocket for real-time updates
    connectWebSocket();

    // Fallback polling - every 3 seconds (increased from 2 for stability)
    pollInterval = setInterval(fetchStatus, 3000);
    
    // Elapsed time counter
    timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (ws) ws.close();
      clearInterval(pollInterval);
      clearInterval(timerInterval);
      clearTimeout(reconnectTimeout);
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

  // Parse logs if available
  const logs = jobData.logs || [];
  const hasLogs = logs.length > 0;
  
  // Find ALL error logs (level === 'error' or 'ERROR', case-insensitive)
  const errorLogs = logs.filter(l => l.level?.toLowerCase() === 'error');
  const hasErrorLogs = errorLogs.length > 0;
  const errorLog = errorLogs[0]; // Primary error for backward compatibility
  
  // Check if ALL pipeline stages completed successfully (based on logs, not status)
  const completedStages = PIPELINE_STAGES.filter(stage => 
    logs.some(log => log.message === stage.key && log.level?.toLowerCase() !== 'error')
  );
  const allStagesCompleted = completedStages.length === PIPELINE_STAGES.length;
  
  // Determine the ACTUAL status based on logs (logs are truth, status might be stale/wrong)
  const actualStatus = (() => {
    if (hasErrorLogs) return 'failed';
    if (allStagesCompleted) return 'completed';
    return jobData.status;
  })();
  
  // Use actual status for display
  const config = statusConfig[actualStatus as keyof typeof statusConfig] || statusConfig.queued;
  const Icon = config.icon;
  
  // Show warning if status doesn't match logs
  const statusMismatch = jobData.status === 'failed' && allStagesCompleted && !hasErrorLogs;
  
  // Find the failed stage
  const getFailedStage = () => {
    if (!errorLog) return null;
    const stage = PIPELINE_STAGES.find(s => errorLog.message.toLowerCase().includes(s.label.toLowerCase()));
    return stage || { label: 'Unknown Stage', icon: AlertCircle, color: 'red' };
  };

  const failedStage = (actualStatus === 'failed' || hasErrorLogs) ? getFailedStage() : null;

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
        <div className="flex items-center justify-between">
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
          
          {/* Connection Status in Header */}
          {jobData.status === 'running' && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Last updated</div>
                <div className="text-xs font-mono text-slate-600">
                  {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 border border-green-200' 
                  : connectionStatus === 'reconnecting'
                    ? 'bg-amber-100 border border-amber-200'
                    : connectionStatus === 'polling'
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-slate-100 border border-slate-200'
              }`}>
                {connectionStatus === 'connected' ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-700 font-medium">Live</span>
                  </>
                ) : connectionStatus === 'reconnecting' ? (
                  <>
                    <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                    <span className="text-xs text-amber-700 font-medium">Reconnecting...</span>
                  </>
                ) : connectionStatus === 'polling' ? (
                  <>
                    <Server className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">Polling (3s)</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
                    <span className="text-xs text-slate-600 font-medium">Connecting...</span>
                  </>
                )}
              </div>
            </div>
          )}
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

      {/* Error Logs Display - Shows when ANY error-level log exists */}
      {hasErrorLogs && (
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {errorLogs.map((errLog, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-red-800">
                      {failedStage ? `Error in ${failedStage.label} Stage` : 'Pipeline Error'}
                    </span>
                    <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-medium rounded-full uppercase">
                      {errLog.level}
                    </span>
                  </div>
                  <div className="text-sm text-red-700 mb-2 font-medium">
                    {errLog.message}
                  </div>
                  {errLog.metadata && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800 font-medium">
                        View Error Details
                      </summary>
                      <pre className="mt-2 text-xs bg-red-100 text-red-800 p-3 rounded-lg overflow-x-auto max-h-48">
                        {JSON.stringify(errLog.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
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
                const isError = log.level?.toLowerCase() === 'error';
                
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
            {/* Connection Status Indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-green-100' 
                : connectionStatus === 'reconnecting'
                  ? 'bg-amber-100'
                  : 'bg-purple-100'
            }`}>
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Live</span>
                </>
              ) : connectionStatus === 'reconnecting' ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-xs text-amber-600 font-medium">Reconnecting</span>
                </>
              ) : connectionStatus === 'polling' ? (
                <>
                  <Server className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">Polling</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">Connecting</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Mismatch Warning - logs show success but status says failed */}
      {statusMismatch && (
        <div className="px-6 pb-4">
          <div className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-800 mb-1">
                Status Discrepancy Detected
              </div>
              <div className="text-xs text-amber-700 mb-2">
                The pipeline logs show all stages completed successfully, but the job status indicates failure. 
                This may be a transient error. The results should still be available.
              </div>
              {jobData.message && (
                <div className="text-xs bg-amber-100 text-amber-800 p-2 rounded-lg font-mono">
                  Reported error: {jobData.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AnswerCoalesce Error Context - only show when actualStatus is failed */}
      {actualStatus === 'failed' && jobData.message?.toLowerCase().includes('answercoalesce') && (
        <div className="px-6 pb-4">
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
                This is not an issue with EDGAR. See error details below.
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

      {/* Show the actual error message from jobData.message - only when actualStatus is failed */}
      {actualStatus === 'failed' && jobData.message && (
        <div className="px-6 pb-4">
          <div className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-800 mb-1">
                Error Message
              </div>
              <div className="text-sm text-red-700 font-mono bg-red-100 p-3 rounded-lg overflow-x-auto">
                {jobData.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic failure notice - only when no message at all and actualStatus is failed */}
      {actualStatus === 'failed' && !jobData.message && !hasErrorLogs && (
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
                An unknown error occurred. Please try again.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};