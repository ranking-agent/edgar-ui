import React, { useEffect, useRef, useState } from 'react';
import {
  Info,
  ChevronUp,
  ChevronRight,
  Code2,
  Copy,
  Check,
  X
} from 'lucide-react';
import { QueryBuilder } from './QueryBuilder';
import { JobStatus } from './JobStatus';
import { ResultsViewer } from './ResultsViewer';

interface DashboardProps {
  initialJobId?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ initialJobId }) => {
  const [previewQuery, setPreviewQuery] = useState<any>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(initialJobId ?? null);
  const jobStatusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialJobId) {
      setCompletedJobId(initialJobId);
      setCurrentJobId(null);
      setResultsData(null);
      setSelectedRuleKey(null);
      setFilteredResultIndices([]);
      setQueryBuilderExpanded(false);
    }
  }, [initialJobId]);
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [filteredResultIndices, setFilteredResultIndices] = useState<number[]>([]);
  const [queryBuilderExpanded, setQueryBuilderExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleJobCreated = (jobId: string) => {
    setCurrentJobId(jobId);
    setCompletedJobId(null);
    setResultsData(null);
    setSelectedRuleKey(null);
    setFilteredResultIndices([]);
    setQueryBuilderExpanded(true);
    setTimeout(() => {
      jobStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleJobComplete = (jobId: string) => {
    setCompletedJobId(jobId);
    setCurrentJobId(null);
  };

  const handleResultsLoad = (data: any) => {
    setResultsData(data);
    if (data) {
      setQueryBuilderExpanded(false);
    }
  };

  const handleRuleSelect = (ruleKey: string | null, resultIndices: number[]) => {
    setSelectedRuleKey(ruleKey);
    setFilteredResultIndices(resultIndices);
  };

  const handleCopyQuery = async () => {
    if (previewQuery) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(previewQuery, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Collapsed Query Builder Toggle — vertical edge tab pinned to the left */}
      {!queryBuilderExpanded && completedJobId && (
        <button
          onClick={() => setQueryBuilderExpanded(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 py-4 px-2 bg-white border border-l-0 border-purple-200 rounded-r-xl shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-200 text-purple-700 hover:text-purple-900 font-medium text-sm"
          aria-label="Show Query Builder"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">
            Show Query Builder
          </span>
        </button>
      )}

      {/* Backdrop when the Query Builder is opened as a side panel over results */}
      {queryBuilderExpanded && resultsData && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setQueryBuilderExpanded(false)}
        />
      )}

      {/* Main Content - inline when no results; slide-in side panel when results are showing */}
      {queryBuilderExpanded && (
        <div
          className={
            resultsData
              ? 'fixed top-0 left-0 z-50 h-full w-[95vw] max-w-6xl bg-slate-50 shadow-2xl overflow-y-auto p-6 animate-slide-in-left'
              : ''
          }
          onClick={resultsData ? (e) => e.stopPropagation() : undefined}
        >
          {resultsData && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Query Builder</h2>
              <button
                onClick={() => setQueryBuilderExpanded(false)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                aria-label="Close query builder"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left Column - Query Builder (wider: 3/5) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Query Builder Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50/50 border-b border-purple-100/60">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Query Builder</h3>
                    <p className="text-sm text-slate-500">Define your biomedical query</p>
                  </div>
                </div>
                {resultsData && (
                  <button
                    onClick={() => setQueryBuilderExpanded(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                    Collapse
                  </button>
                )}
              </div>
              
              <div className="p-6">
                <QueryBuilder 
                  onJobCreated={handleJobCreated} 
                  onQueryPreview={setPreviewQuery}
                />
              </div>
            </div>
            
            {/* Job Status */}
            {currentJobId && (
              <div ref={jobStatusRef}>
                <JobStatus jobId={currentJobId} onComplete={handleJobComplete} />
              </div>
            )}
          </div>

          {/* Right Column - TRAPI Preview (narrower: 2/5) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden sticky top-32">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">TRAPI Query Preview</h3>
                    <p className="text-sm text-slate-400">Live preview of your query</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyQuery}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Copy TRAPI query to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-900">
                <div className="p-4 overflow-x-auto max-h-[600px] custom-scrollbar">
                  <pre 
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
                  >
                    <code>
                      {formatJsonWithSyntaxHighlighting(previewQuery || {})}
                    </code>
                  </pre>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-purple-50 border-t border-purple-100">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-700">
                    Target: <span className="font-mono text-purple-600 text-xs">http://answercoalesce-test.apps.renci.org</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Results View - Full width when showing results */}
      {completedJobId && (
        <ResultsViewer 
          jobId={completedJobId} 
          onResultsLoad={handleResultsLoad}
          onTabChange={() => {}}
          onRuleSelect={handleRuleSelect}
        />
      )}
    </div>
  );
};

// Helper function for JSON syntax highlighting - Purple themed
function formatJsonWithSyntaxHighlighting(obj: any, indent = 0): React.ReactNode {
  const spaces = '  '.repeat(indent);
  
  if (obj === null) {
    return <span className="text-fuchsia-400">null</span>;
  }
  
  if (typeof obj === 'boolean') {
    return <span className="text-fuchsia-400">{obj.toString()}</span>;
  }
  
  if (typeof obj === 'number') {
    return <span className="text-amber-400">{obj}</span>;
  }
  
  if (typeof obj === 'string') {
    return <span className="text-emerald-400">"{obj}"</span>;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    
    const items = obj.map((item, idx) => (
      <React.Fragment key={idx}>
        {'\n'}{spaces}  {formatJsonWithSyntaxHighlighting(item, indent + 1)}
        {idx < obj.length - 1 ? ',' : ''}
      </React.Fragment>
    ));
    
    return <>{'['}{items}{'\n'}{spaces}{']'}</>;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    const items = keys.map((key, idx) => (
      <React.Fragment key={key}>
        {'\n'}{spaces}  <span className="text-violet-400">"{key}"</span>: {formatJsonWithSyntaxHighlighting(obj[key], indent + 1)}
        {idx < keys.length - 1 ? ',' : ''}
      </React.Fragment>
    ));
    
    return <>{'{'}{items}{'\n'}{spaces}{'}'}</>;
  }
  
  return String(obj);
}