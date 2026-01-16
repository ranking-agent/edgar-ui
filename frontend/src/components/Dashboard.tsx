import React, { useState } from 'react';
import { 
  Info,  
  ChevronUp, 
  Code2, 
  ArrowLeft
} from 'lucide-react';
import { QueryBuilder } from './QueryBuilder';
import { JobStatus } from './JobStatus';
import { ResultsViewer } from './ResultsViewer';

export const Dashboard: React.FC = () => {
  const [previewQuery, setPreviewQuery] = useState<any>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [filteredResultIndices, setFilteredResultIndices] = useState<number[]>([]);
  const [queryBuilderExpanded, setQueryBuilderExpanded] = useState(true);

  const handleJobCreated = (jobId: string) => {
    setCurrentJobId(jobId);
    setCompletedJobId(null);
    setResultsData(null);
    setSelectedRuleKey(null);
    setFilteredResultIndices([]);
    setQueryBuilderExpanded(true);
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

  return (
    <div className="space-y-4">
      {/* Collapsed Query Builder Toggle */}
      {!queryBuilderExpanded && resultsData && (
        <button
          onClick={() => setQueryBuilderExpanded(true)}
          className="fixed left-6 top-36 z-40 flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 rounded-xl shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-200 text-purple-700 hover:text-purple-900 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Show Query Builder
        </button>
      )}

      {/* Main Content Grid */}
      <div className={`grid gap-6 transition-all duration-300 ${
        queryBuilderExpanded ? 'lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {/* Left Column - Query Builder & Job Status */}
        {queryBuilderExpanded && (
          <div className="space-y-4">
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
              <JobStatus jobId={currentJobId} onComplete={handleJobComplete} />
            )}
          </div>

          
        )}

        {/* Right Column - Results or Preview */}
        <div className={`flex justify-between space-y-6 ${!queryBuilderExpanded ? 'lg:col-span-1' : queryBuilderExpanded && resultsData ? 'lg:col-span-1' : ''}`}>
          {completedJobId ? (
            <ResultsViewer 
              jobId={completedJobId} 
              onResultsLoad={handleResultsLoad}
              onTabChange={() => {}}
              onRuleSelect={handleRuleSelect}
            />
          ) : (
            /* Query Preview */
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden">
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
                <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">TRAPI v1.4</span>
              </div>
              
              <div className="bg-slate-900">
                <div className="p-4 overflow-x-auto max-h-96 custom-scrollbar">
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
                    Target: <span className="font-mono text-purple-600 text-xs">https://answercoalesce.renci.org/query</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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