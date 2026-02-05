import React, { useState } from 'react';
import {Upload, FileJson, CheckCircle, AlertCircle, Download, Trash2, ChevronUp,ArrowLeft,Code2,Info} from 'lucide-react';
import { ResultsViewer } from './ResultsViewer';
import { EnrichmentResultsViewer } from './EnrichmentResultsViewer';

interface TrapiResponse {
  message?: {
    query_graph?: any;
    knowledge_graph?: {
      nodes: Record<string, any>;
      edges: Record<string, any>;
    };
    results?: any[];
    auxiliary_graphs?: any;
  };
  logs?: any[];
  [key: string]: any;
}

// Helper to detect result type: EDGAR (inferred) vs Enrichment (member_ids)
const detectResultType = (response: TrapiResponse | null): 'edgar' | 'enrichment' | 'unknown' => {
  if (!response?.message?.query_graph) return 'unknown';
  
  const queryGraph = response.message.query_graph;
  
  // Check for EDGAR (has knowledge_type: "inferred" on edges)
  const hasInferredEdges = Object.values(queryGraph.edges || {}).some(
    (edge: any) => edge.knowledge_type === 'inferred'
  );
  
  // Check for Enrichment (has member_ids array on nodes)
  const hasMemberIds = Object.values(queryGraph.nodes || {}).some(
    (node: any) => Array.isArray(node.member_ids) && node.member_ids.length > 0
  );
  
  if (hasInferredEdges) return 'edgar';
  if (hasMemberIds) return 'enrichment';
  return 'unknown';
};

export const BYOResponseData: React.FC = () => {
  const [response, setResponse] = useState<TrapiResponse | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadPanelExpanded, setUploadPanelExpanded] = useState(true);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [filteredResultIndices, setFilteredResultIndices] = useState<number[]>([]);

  const handleFileUpload = (file: File) => {
    setError('');

    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic validation
        if (!parsed.message) {
          setError('Invalid TRAPI response: missing "message" field');
          return;
        }

        setResponse(parsed);
        setFileName(file.name);
        setUploadPanelExpanded(false); // Collapse upload panel when data loads
      } catch (err: any) {
        setError(`Failed to parse JSON: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const clearResponse = () => {
    setResponse(null);
    setFileName('');
    setError('');
    setUploadPanelExpanded(true);
    setSelectedRuleKey(null);
    setFilteredResultIndices([]);
  };

  const downloadResponse = () => {
    if (!response) return;

    const dataStr = JSON.stringify(response, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'trapi-response.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRuleSelect = (ruleKey: string | null, resultIndices: number[]) => {
    setSelectedRuleKey(ruleKey);
    setFilteredResultIndices(resultIndices);
  };

  const resultCount = response?.message?.results?.length || 0;
  const nodeCount = Object.keys(response?.message?.knowledge_graph?.nodes || {}).length;
  const edgeCount = Object.keys(response?.message?.knowledge_graph?.edges || {}).length;
  
  // Detect result type for conditional rendering
  const resultType = detectResultType(response);

  return (
    <div className="space-y-4">
      {/* Collapsed Upload Panel Toggle */}
      {!uploadPanelExpanded && response && (
        <button
          onClick={() => setUploadPanelExpanded(true)}
          className="fixed left-6 top-36 z-40 flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 rounded-xl shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-200 text-purple-700 hover:text-purple-900 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Show Upload Panel
        </button>
      )}

      {/* Main Content Grid */}
      <div className={`grid gap-8 transition-all duration-300 ${
        uploadPanelExpanded ? 'lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {/* Left Column - Upload Panel */}
        {uploadPanelExpanded && (
          <div className="space-y-4">
            {/* Upload Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50/50 border-b border-purple-100/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <FileJson className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Import Response Data</h3>
                    <p className="text-sm text-slate-500">Upload TRAPI JSON files</p>
                  </div>
                </div>
                {response && (
                  <button
                    onClick={() => setUploadPanelExpanded(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                    Collapse
                  </button>
                )}
              </div>

              <div className="p-6">
                {!response ? (
                  /* Upload Area */
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      dragActive
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50/50'
                    }`}
                  >
                    <Upload
                      className={`w-12 h-12 mx-auto mb-3 ${
                        dragActive ? 'text-purple-600' : 'text-purple-400'
                      }`}
                    />
                    <h3 className="text-base font-semibold text-slate-900 mb-1">
                      Drop TRAPI response JSON here
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-upload-byo"
                    />
                    <label
                      htmlFor="file-upload-byo"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium cursor-pointer hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Select File
                    </label>
                  </div>
                ) : (
                  /* File Loaded State */
                  <div className="space-y-4">
                    {/* File Info */}
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-900 truncate">{fileName}</p>
                        <p className="text-sm text-green-700">File loaded successfully</p>
                      </div>
                    </div>

                    {/* Detected Result Type */}
                    <div className={`p-3 rounded-lg text-sm font-medium ${
                      resultType === 'edgar' 
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : resultType === 'enrichment'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-gray-50 text-gray-800 border border-gray-200'
                    }`}>
                      Detected: {resultType === 'edgar' ? 'EDGAR (Inference) Results' : 
                                 resultType === 'enrichment' ? 'Enrichment Analysis Results' : 
                                 'Unknown Result Type'}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-700">{resultCount}</div>
                        <div className="text-xs text-purple-600">Results</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-indigo-700">{nodeCount}</div>
                        <div className="text-xs text-indigo-600">Nodes</div>
                      </div>
                      <div className="bg-fuchsia-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-fuchsia-700">{edgeCount}</div>
                        <div className="text-xs text-fuchsia-600">Edges</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={downloadResponse}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={clearResponse}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h4 className="font-semibold text-purple-900 mb-2">Supported Features</h4>
              <ul className="space-y-1 text-sm text-purple-800">
                <li>• Upload TRAPI-compliant JSON response files</li>
                <li>• Response must contain a "message" field</li>
                <li>• Supports EDGAR (inference) and Enrichment results</li>
                <li>• Auto-detects result type for appropriate visualization</li>
              </ul>
            </div>
          </div>
        )}

        {/* Right Column - Results Viewer (conditionally rendered based on type) */}
        <div className={`space-y-6 ${!uploadPanelExpanded ? 'lg:col-span-1' : ''}`}>
          {response ? (
            // Conditionally render based on detected result type
            resultType === 'enrichment' ? (
              <EnrichmentResultsViewer
                results={response}
                onResultsLoad={() => {}}
              />
            ) : (
              <ResultsViewer
                directData={response}
                onResultsLoad={() => {}}
                onTabChange={() => {}}
                onRuleSelect={handleRuleSelect}
              />
            )
          ) : (
            /* Empty State / Preview */
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Results Preview</h3>
                    <p className="text-sm text-slate-400">Upload a file to see results</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-8">
                <div className="text-center">
                  <FileJson className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400 mb-2">No data loaded</p>
                  <p className="text-sm text-slate-500">
                    Upload a TRAPI response JSON file to visualize results
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-purple-50 border-t border-purple-100">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-700">
                    Supports TRAPI v1.4 response format
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
