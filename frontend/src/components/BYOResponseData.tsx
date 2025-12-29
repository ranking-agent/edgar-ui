import React, { useState } from 'react';
import { Upload, FileJson, CheckCircle, AlertCircle, Eye, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ResultPathViewer } from './ResultPathViewer';
import { ResultsList } from './ResultsList';
import { ErrorBoundary } from './ErrorBoundary';

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

export const BYOResponseData: React.FC = () => {
  const [response, setResponse] = useState<TrapiResponse | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [visualizationMode, setVisualizationMode] = useState<'cytoscape' | 'text'>('cytoscape');
  const [queryGraphExpanded, setQueryGraphExpanded] = useState(false); // Collapsed by default when results loaded

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
        setExpandedResults(new Set());
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
    setExpandedResults(new Set());
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
  };

  const toggleResultExpansion = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const resultCount = response?.message?.results?.length || 0;
  const nodeCount = Object.keys(response?.message?.knowledge_graph?.nodes || {}).length;
  const edgeCount = Object.keys(response?.message?.knowledge_graph?.edges || {}).length;

  // Determine if this is enrichment or EDGAR data based on edge types
  const hasInferredEdges = response?.message?.query_graph
    ? Object.values(response.message.query_graph.edges || {}).some(
        (edge: any) => edge.knowledge_type === 'inferred'
      )
    : false;

  const hasMany = response?.message?.query_graph
    ? Object.values(response.message.query_graph.nodes || {}).some(
        (node: any) => Array.isArray(node.member_ids) && node.member_ids.length > 1
      )
    : false;

  // Get all query node IDs to filter out from results
  const allQueryNodeIds = response?.message?.query_graph
    ? Object.values(response.message.query_graph.nodes).flatMap((node: any) => node.ids || [])
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileJson className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Bring Your Own Response Data</h2>
        </div>
        <p className="text-gray-600">
          Upload and visualize existing TRAPI response JSON files. Analyze results from any
          TRAPI-compliant service.
        </p>
      </div>

      {/* Upload Area */}
      {!response && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
          >
            <Upload
              className={`w-16 h-16 mx-auto mb-4 ${
                dragActive ? 'text-indigo-600' : 'text-gray-400'
              }`}
            />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop existing TRAPI response JSON here
            </h3>
            <p className="text-gray-600 mb-4">or click to browse</p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors"
            >
              Choose File
            </label>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Upload Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Response Viewer */}
      {response && (
        <div className="space-y-6">
          {/* File Info & Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">File Loaded</h3>
                  <p className="text-sm text-gray-600">{fileName}</p>
                  {hasInferredEdges && (
                    <p className="text-xs text-red-600 mt-1">Contains inferred edges (EDGAR-style)</p>
                  )}
                  {hasMany && (
                    <p className="text-xs text-green-600 mt-1">
                      Contains support graphs (Enrichment-style)
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {/* Visualization Mode Toggle */}
                <div className="flex items-center gap-2 mr-2">
                  <label className="text-sm font-medium text-gray-700">View:</label>
                  <select
                    value={visualizationMode}
                    onChange={(e) => setVisualizationMode(e.target.value as 'cytoscape' | 'text')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="cytoscape">Graph </option>
                    <option value="text">Text </option>
                  </select>
                </div>
                <button
                  onClick={downloadResponse}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={clearResponse}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="text-sm text-indigo-600 font-medium mb-1">Results</div>
                <div className="text-3xl font-bold text-indigo-900">{resultCount}</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium mb-1">KG Nodes</div>
                <div className="text-3xl font-bold text-green-900">{nodeCount}</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium mb-1">KG Edges</div>
                <div className="text-3xl font-bold text-purple-900">{edgeCount}</div>
              </div>
            </div>
          </div>

          {/* Query Graph - Collapsible */}
          {response.message?.query_graph && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <button
                onClick={() => setQueryGraphExpanded(!queryGraphExpanded)}
                className="w-full flex items-center justify-between hover:bg-gray-50 transition-colors -m-6 p-6 rounded-xl"
              >
                <h3 className="text-xl font-semibold text-gray-900">Query Graph</h3>
                {queryGraphExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              {queryGraphExpanded && (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mt-4">
                  <pre className="text-sm text-green-400 font-mono">
                    {JSON.stringify(response.message.query_graph, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Ranked Results with Expandable Paths */}
          {response.message?.results && response.message.results.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Ranked Results ({resultCount})
              </h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Click on any result to view the supporting evidence
                </h4>
                
                <div className="space-y-3">
                  {response.message.results.map((result: any, idx: number) => {
                    const nodeBindings = result.node_bindings || {};
                    const analyses = result.analyses || [];
                    const score = analyses[0]?.score;
                    const isExpanded = expandedResults.has(idx);

                    // Find the result node (non-query node)
                    const boundNodeIds = Object.values(nodeBindings)
                      .flat()
                      .map((b: any) => b.id)
                      .filter((id: string) => !allQueryNodeIds.includes(id));
                    const resultNodeId = boundNodeIds[0] || 'Unknown';
                    const node = response.message?.knowledge_graph?.nodes?.[resultNodeId];
                    
                    // Get edge binding - handle both 'e0' and other edge binding keys
                    const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
                    const firstEdgeBindingKey = Object.keys(edgeBindings)[0];
                    const edgeId = firstEdgeBindingKey ? edgeBindings[firstEdgeBindingKey]?.[0]?.id : undefined;
                    
                    // Count node bindings
                    const nodeBindingCount = Object.keys(nodeBindings).length;

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleResultExpansion(idx)}
                          className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="bg-indigo-100 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full">
                                  #{idx + 1}
                                </span>
                                <h4 className="font-semibold text-gray-900">
                                  {node?.name || resultNodeId}
                                </h4>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                  <span className="font-medium">ID:</span> {resultNodeId}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {nodeBindingCount} node bindings
                                </div>
                                {/* Show node bindings inline */}
                                <div className="text-xs font-mono text-gray-500">
                                  {Object.entries(nodeBindings).map(([key, bindings]: [string, any], bindingIdx) => {
                                    const bindingIds = bindings.map((b: any) => b.id).join('; ');
                                    return (
                                      <div key={bindingIdx}>
                                        {key}: {bindingIds}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            {score !== undefined && (
                              <div className="text-right ml-4">
                                <div className="text-sm text-gray-500 mb-1">Score</div>
                                <div className="text-2xl font-bold text-indigo-600">
                                  {score.toFixed(4)}
                                </div>
                              </div>
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4 bg-white">
                            <ErrorBoundary>
                              {(() => {
                                // Debug logging
                                console.log('=== Rendering expanded result ===');
                                console.log('Visualization mode:', visualizationMode);
                                console.log('Result:', result);
                                console.log('KG exists:', !!response.message?.knowledge_graph);
                                console.log('QG exists:', !!response.message?.query_graph);
                                console.log('Aux graphs exist:', !!response.message?.auxiliary_graphs);

                                if (visualizationMode === 'cytoscape') {
                                  console.log('Rendering ResultPathViewer...');
                                  return (
                                    <ResultPathViewer
                                      result={result}
                                      knowledgeGraph={response.message?.knowledge_graph}
                                      queryGraph={response.message?.query_graph}
                                      auxiliaryGraphs={response.message?.auxiliary_graphs}
                                      resultIndex={idx}
                                      allResults={response.message?.results}
                                    />
                                  );
                                } else {
                                  console.log('Rendering ResultsList (text view)...');
                                  // For text view, show just this single result using ResultsList
                                  const singleResultResponse = {
                                    message: {
                                      query_graph: response.message?.query_graph,
                                      knowledge_graph: response.message?.knowledge_graph,
                                      auxiliary_graphs: response.message?.auxiliary_graphs,
                                      results: [result] // Only show this one result
                                    }
                                  };
                                  return (
                                    <ResultsList results={singleResultResponse} />
                                  );
                                }
                              })()}
                            </ErrorBoundary>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          {response.logs && response.logs.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Logs</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2 font-mono text-sm">
                  {response.logs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        log.level === 'ERROR'
                          ? 'bg-red-100 text-red-800'
                          : log.level === 'WARNING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      <span className="font-semibold">[{log.level}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full JSON View */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <details>
              <summary className="cursor-pointer font-semibold text-gray-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
                <Eye className="w-5 h-5" />
                View Full JSON Response
              </summary>
              <div className="mt-4 bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h4 className="font-semibold text-indigo-900 mb-2">Supported Features</h4>
        <ul className="space-y-1 text-sm text-indigo-800">
          <li>• Upload TRAPI-compliant JSON response files</li>
          <li>• Response must contain a "message" field</li>
          <li>• Supports results from any TRAPI service (AnswerCoalesce, ARAGORN, EDGAR, etc.)</li>
          <li>• <strong>Graph view</strong>: Cytoscape visualization (Enrichment-Analysis)</li>
          <li>• <strong>Text view</strong>: Hierarchical text breakdown (EDGAR-Inference)</li>
          <li>• Switch between views using the dropdown in the header</li>
        </ul>
      </div>
    </div>
  );
};