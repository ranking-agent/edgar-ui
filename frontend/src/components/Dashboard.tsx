import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { QueryBuilder } from './QueryBuilder';
import { JobStatus } from './JobStatus';
import { ResultsViewer } from './ResultsViewer';
import { ResultsList } from './ResultsList';

export const Dashboard: React.FC = () => {
  const [previewQuery, setPreviewQuery] = useState<any>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [filteredResultIndices, setFilteredResultIndices] = useState<number[]>([]);
  const [queryBuilderExpanded, setQueryBuilderExpanded] = useState(true); // Collapsed when results available

  const handleJobCreated = (jobId: string) => {
    setCurrentJobId(jobId);
    setCompletedJobId(null);
    setResultsData(null);
    setSelectedRuleKey(null);
    setFilteredResultIndices([]);
    setQueryBuilderExpanded(true); // Keep expanded when job starts
  };

  const handleJobComplete = (jobId: string) => {
    setCompletedJobId(jobId);
    setCurrentJobId(null);
  };

  const handleResultsLoad = (data: any) => {
    setResultsData(data);
    if (data) {
      setQueryBuilderExpanded(false); // Auto-collapse when results load
    }
  };

  const handleRuleSelect = (ruleKey: string | null, resultIndices: number[]) => {
    setSelectedRuleKey(ruleKey);
    setFilteredResultIndices(resultIndices);
  };

  return (
    <div className="space-y-6">
      {/* Query Builder Collapse Toggle - Fixed position */}
      {!queryBuilderExpanded && resultsData && (
        <button
          onClick={() => setQueryBuilderExpanded(true)}
          className="fixed left-4 top-24 z-50 bg-purple-600 text-white px-4 py-2 rounded-r-lg shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
          <span>Show Query Builder</span>
        </button>
      )}

      {/* Query Builder & Results Grid */}
      <div className={`grid gap-6 transition-all duration-300 ${
        queryBuilderExpanded ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {/* Left Column - Query Builder & Job Status (can be hidden) */}
        {queryBuilderExpanded && (
          <div className="space-y-6">
            {/* Collapsible Query Builder */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-6 bg-gray-50 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Build Query</h3>
                {resultsData && (
                  <button
                    onClick={() => setQueryBuilderExpanded(false)}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                    <span>Hide</span>
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
            
            {currentJobId && (
              <JobStatus jobId={currentJobId} onComplete={handleJobComplete} />
            )}
          </div>
        )}

        {/* Right Column - Results Tabs (expands to full width when left is hidden) */}
        <div className="space-y-6">
          {completedJobId ? (
            <ResultsViewer 
              jobId={completedJobId} 
              onResultsLoad={handleResultsLoad}
              onTabChange={() => {}}
              onRuleSelect={handleRuleSelect}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">TRAPI Query Preview</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">
              {JSON.stringify(previewQuery || {}, null, 2)}
              </pre>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-4 h-4" />
              <span>
                Endpoint: <span className="font-mono">https://answercoalesce.renci.org/query</span>
              </span>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Full-width results list - Shows filtered results when rule selected, all results otherwise */}
      {resultsData && (
        selectedRuleKey ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Results Containing This Rule ({filteredResultIndices.length})
                </h3>
                <p className="text-sm text-gray-600">
                  Click to expand and view path details
                </p>
              </div>
              <button
                onClick={() => setSelectedRuleKey(null)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
              >
                Show All Results
              </button>
            </div>
            <ResultsList 
              results={{
                ...resultsData,
                message: {
                  ...resultsData.message,
                  results: filteredResultIndices.map(idx => resultsData.message.results[idx])
                }
              }} 
            />
          </div>
        ) : (
          <ResultsList results={resultsData} />
        )
      )}
    </div>
  );
};