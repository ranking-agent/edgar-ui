import React, { useState } from 'react';
import { 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Users,
  Target
} from 'lucide-react';
import { ResultPathViewer } from './ResultPathViewer';

interface EnrichmentResultsViewerProps {
  results: any;
  onResultsLoad?: (data: any) => void;
}

export const EnrichmentResultsViewer: React.FC<EnrichmentResultsViewerProps> = ({ 
  results,
  onResultsLoad 
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'members'>('results');
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [visualizationMode, setVisualizationMode] = useState<'text' | 'cytoscape'>('text');
  const [expandedEnrichmentPaths, setExpandedEnrichmentPaths] = useState<Set<string>>(new Set());
  const [showCombinedGraph, setShowCombinedGraph] = useState(false);
  const [topN, setTopN] = useState(10);
  const [showTopOrBottom, setShowTopOrBottom] = useState<'top' | 'bottom'>('top');
  const [expandedMemberSets, setExpandedMemberSets] = useState<Set<string>>(new Set());
  const [expandedOutputNodes, setExpandedOutputNodes] = useState<Set<string>>(new Set());

  const toggleResultExpansion = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const toggleEnrichmentPath = (pathId: string) => {
    const newExpanded = new Set(expandedEnrichmentPaths);
    if (newExpanded.has(pathId)) {
      newExpanded.delete(pathId);
    } else {
      newExpanded.add(pathId);
    }
    setExpandedEnrichmentPaths(newExpanded);
  };

  const toggleMemberSet = (memberSetKey: string) => {
    const newExpanded = new Set(expandedMemberSets);
    if (newExpanded.has(memberSetKey)) {
      newExpanded.delete(memberSetKey);
    } else {
      newExpanded.add(memberSetKey);
    }
    setExpandedMemberSets(newExpanded);
  };

  const toggleOutputNode = (nodeId: string) => {
    const newExpanded = new Set(expandedOutputNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedOutputNodes(newExpanded);
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enrichment-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!results?.message) return null;

  const resultCount = results.message?.results?.length || 0;
  
  // Extract member_ids from query graph
  const memberIds: string[] = [];
  Object.values(results.message.query_graph?.nodes || {}).forEach((node: any) => {
    if (node.member_ids && Array.isArray(node.member_ids)) {
      memberIds.push(...node.member_ids);
    }
  });

  // Get output category for labeling
  let outputCategory = 'Entity';
  let inputCategory = 'Entity';
  Object.values(results.message.query_graph?.nodes || {}).forEach((node: any) => {
    if (!node.member_ids && node.categories?.[0]) {
      outputCategory = node.categories[0].replace('biolink:', '');
    }
    if (node.member_ids && node.categories?.[0]) {
      inputCategory = node.categories[0].replace('biolink:', '');
    }
  });

  // Helper to pluralize category names
  const pluralize = (word: string, count: number): string => {
    if (count === 1) return word;
    if (word.endsWith('y')) return word.slice(0, -1) + 'ies';
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    }
    return word + 's';
  };

  const outputCategoryPlural = pluralize(outputCategory, 2);
  const inputCategoryPlural = pluralize(inputCategory, 2);

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 space-y-6">
        {/* Header with type indicator */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
          <span className="font-semibold">Enrichment Analysis Results</span> — with {memberIds.length} input {pluralize(inputCategory.toLowerCase(), memberIds.length)}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Results - Clickable */}
          <button
            onClick={() => {
              setActiveTab('results');
            }}
            className={`text-left border-2 rounded-lg p-4 transition-all ${
              activeTab === 'results'
                ? 'bg-purple-100 border-purple-500 shadow-md ring-2 ring-purple-300'
                : 'bg-purple-50 border-purple-300 hover:bg-purple-100 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-semibold">{outputCategoryPlural} Found</span>
            </div>
            <div className="text-3xl font-bold text-purple-900">{resultCount}</div>
          </button>
          
          {/* Input Members - Clickable */}
          <button
            onClick={() => {
              setActiveTab('members');
            }}
            className={`text-left border-2 rounded-lg p-4 transition-all ${
              activeTab === 'members'
                ? 'bg-green-100 border-green-500 shadow-md ring-2 ring-green-300'
                : 'bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-semibold">Input {inputCategoryPlural}</span>
            </div>
            <div className="text-3xl font-bold text-green-900">{memberIds.length}</div>
          </button>
          
          {/* Download Button */}
          <div className="flex items-center">
            <button
              onClick={downloadResults}
              className="flex items-center gap-2 px-4 py-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors justify-center w-full font-semibold shadow-sm"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>
        </div>

        {/* View Mode Toggle - Only show when on Results tab */}
        {activeTab === 'results' && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">View Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCombinedGraph(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !showCombinedGraph
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setShowCombinedGraph(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showCombinedGraph
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                Combined
              </button>
            </div>
            
            {/* Top/Bottom N Controls - only show in combined mode */}
            {showCombinedGraph && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={showTopOrBottom}
                  onChange={(e) => setShowTopOrBottom(e.target.value as 'top' | 'bottom')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max={resultCount}
                  value={topN}
                  onChange={(e) => setTopN(Math.min(Math.max(1, parseInt(e.target.value) || 1), resultCount))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600">results</span>
              </>
            )}
            
            {/* Text/Graph toggle - only show in individual mode */}
            {!showCombinedGraph && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600">Display:</span>
                <select
                  value={visualizationMode}
                  onChange={(e) => setVisualizationMode(e.target.value as 'text' | 'cytoscape')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="text">Text</option>
                  <option value="cytoscape">Graph</option>
                </select>
              </>
            )}
          </div>
        )}

        {/* Content Area - Tab Based */}
        {activeTab === 'members' ? (
          /* Input Members View */
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              Input {inputCategoryPlural} ({memberIds.length})
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {memberIds.map((memberId, idx) => {
                const memberNode = results.message?.knowledge_graph?.nodes?.[memberId];
                return (
                  <div
                    key={idx}
                    className="bg-white border border-green-300 rounded-lg p-3 hover:border-green-400 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">
                          {memberNode?.name || memberId}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{memberId}</div>
                        {memberNode?.categories?.[0] && (
                          <div className="mt-1">
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                              {memberNode.categories[0].replace('biolink:', '')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : showCombinedGraph ? (
          /* Combined Graph View - Grouped by number of connected members */
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {(() => {
              // Filter top N or bottom N results
              const allRes = results.message?.results || [];
              const filteredResults = showTopOrBottom === 'top' 
                ? allRes.slice(0, topN)
                : allRes.slice(-topN);
              
              if (filteredResults.length === 0) {
                return <p className="text-sm text-gray-500">No results to display</p>;
              }
              
              // Group results by their connected members (as a unique key)
              const resultsByMemberSet = new Map<string, {
                memberIds: string[];
                members: Array<{id: string, name: string}>;
                results: Array<{id: string, name: string, score: number}>;
              }>();
              
              filteredResults.forEach((result: any) => {
                const outputNodeId = result.node_bindings?.output?.[0]?.id;
                const node = results.message?.knowledge_graph?.nodes?.[outputNodeId];
                const score = result.analyses?.[0]?.score || 0;
                
                if (!outputNodeId) return;
                
                // Get connected members for this result
                const connectedMembers: Array<{id: string, name: string}> = [];
                
                const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
                const firstEdgeKey = Object.keys(edgeBindings)[0];
                if (!firstEdgeKey) return;
                
                const edgeId = edgeBindings[firstEdgeKey]?.[0]?.id;
                if (!edgeId) return;
                
                const mainEdge = results.message?.knowledge_graph?.edges?.[edgeId];
                if (!mainEdge) return;
                
                const supportGraphsAttr = mainEdge.attributes?.find(
                  (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
                );
                
                const supportGraphIds = Array.isArray(supportGraphsAttr?.value)
                  ? supportGraphsAttr.value
                  : supportGraphsAttr?.value ? [supportGraphsAttr.value] : [];
                
                // Collect members for this result
                const memberIdsForResult: string[] = [];
                supportGraphIds.forEach((sgId: string) => {
                  const auxGraph = results.message?.auxiliary_graphs?.[sgId];
                  if (!auxGraph?.edges) return;
                  
                  auxGraph.edges.forEach((auxEdgeId: string) => {
                    const auxEdge = results.message?.knowledge_graph?.edges?.[auxEdgeId];
                    if (auxEdge?.predicate === 'biolink:member_of') {
                      const memberId = auxEdge.subject;
                      if (!memberIdsForResult.includes(memberId)) {
                        const memberNode = results.message?.knowledge_graph?.nodes?.[memberId];
                        memberIdsForResult.push(memberId);
                        connectedMembers.push({
                          id: memberId,
                          name: memberNode?.name || memberId
                        });
                      }
                    }
                  });
                });
                
                // Create unique key for this member set
                const memberSetKey = memberIdsForResult.sort().join('|');
                
                if (!resultsByMemberSet.has(memberSetKey)) {
                  resultsByMemberSet.set(memberSetKey, {
                    memberIds: memberIdsForResult,
                    members: connectedMembers,
                    results: []
                  });
                }
                
                resultsByMemberSet.get(memberSetKey)!.results.push({
                  id: outputNodeId,
                  name: node?.name || outputNodeId,
                  score
                });
              });
              
              // Sort groups by member count (descending), then by number of results
              const sortedGroups = Array.from(resultsByMemberSet.values())
                .sort((a, b) => {
                  if (b.members.length !== a.members.length) {
                    return b.members.length - a.members.length;
                  }
                  return b.results.length - a.results.length;
                });
              
              return (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Showing {showTopOrBottom === 'top' ? 'top' : 'bottom'} {filteredResults.length} results, grouped by input member subsets
                  </div>
                  
                  {sortedGroups.map((group, groupIdx) => {
                    const memberSetKey = group.memberIds.sort().join('|');
                    const isExpanded = expandedMemberSets.has(memberSetKey);
                    
                    return (
                      <div key={memberSetKey} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                        {/* Header - Clickable */}
                        <button
                          onClick={() => toggleMemberSet(memberSetKey)}
                          className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Member badges */}
                              <div className="flex flex-wrap gap-1">
                                {group.members.map(member => (
                                  <span key={member.id} className="bg-yellow-100 border border-yellow-400 px-2 py-1 rounded text-xs font-semibold">
                                    {member.name}
                                  </span>
                                ))}
                              </div>
                              
                              {/* Arrow */}
                              <span className="text-purple-600 font-bold text-xl flex-shrink-0">→</span>
                              
                              {/* Result count */}
                              <span className="text-sm font-semibold text-gray-900">
                                {group.results.length} {pluralize(outputCategory, group.results.length)}
                              </span>
                            </div>
                            
                            {/* Expand/Collapse icon */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                                {group.members.length} {pluralize(inputCategory.toLowerCase(), group.members.length)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                          </div>
                        </button>
                        
                        {/* Expanded Results List */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-white p-4">
                            <div className="space-y-2">
                              {group.results
                                .sort((a, b) => b.score - a.score)
                                .map((resultData, idx) => {
                                  const isNodeExpanded = expandedOutputNodes.has(resultData.id);
                                  
                                  return (
                                    <div key={resultData.id} className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
                                      {/* Result Card - Clickable */}
                                      <button
                                        onClick={() => toggleOutputNode(resultData.id)}
                                        className="w-full p-3 hover:bg-purple-100 transition-colors text-left"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-900">
                                              {resultData.name}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono truncate">
                                              {resultData.id}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="flex-shrink-0 text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                              {resultData.score.toFixed(4)}
                                            </div>
                                            {isNodeExpanded ? (
                                              <ChevronUp className="w-4 h-4 text-gray-600" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4 text-gray-600" />
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                      
                                      {/* Expanded Member Details */}
                                      {isNodeExpanded && (
                                        <div className="border-t border-purple-200 bg-white p-3">
                                          <div className="text-xs text-gray-600 mb-2 font-semibold">
                                            Connected {inputCategoryPlural} ({group.members.length}):
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {group.members.map(member => (
                                              <div key={member.id} className="bg-yellow-50 border border-yellow-300 rounded px-2 py-1">
                                                <div className="text-xs font-semibold text-gray-900">
                                                  {member.name}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">
                                                  {member.id}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="text-xs text-gray-500 italic">
                    Note: Click on any {inputCategory.toLowerCase()} subset to expand/collapse the list of connected {outputCategoryPlural.toLowerCase()}. {outputCategoryPlural} are sorted by score within each group.
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Individual Results List */
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <h4 className="font-semibold text-gray-900 mb-3">
              Click on any result to view evidence that supports it
            </h4>
            <div className="space-y-3">
              {results.message?.results?.map((result: any, idx: number) => {
                const outputNodeId = result.node_bindings?.output?.[0]?.id;
                const node = results.message?.knowledge_graph?.nodes?.[outputNodeId];
                const score = result.analyses?.[0]?.score;
                const isExpanded = expandedResults.has(idx);

                return (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleResultExpansion(idx)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {node?.name || outputNodeId}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="text-xs text-gray-600">ID: {outputNodeId}</div>
                        </div>
                        {score !== undefined && (
                          <div className="text-right ml-3">
                            <div className="text-xs text-gray-500">Score</div>
                            <div className="font-bold text-purple-600">{score.toFixed(4)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-white">
                        {visualizationMode === 'cytoscape' ? (
                          <ResultPathViewer
                            result={result}
                            knowledgeGraph={results.message?.knowledge_graph}
                            queryGraph={results.message?.query_graph}
                            auxiliaryGraphs={results.message?.auxiliary_graphs}
                            resultIndex={idx}
                            allResults={results.message?.results}
                          />
                        ) : (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 mb-3">Support Paths</h4>
                            {(() => {
                              const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
                              const firstEdgeKey = Object.keys(edgeBindings)[0];
                              if (!firstEdgeKey) return <p className="text-sm text-gray-500">No edge bindings found</p>;
                              
                              const edgeId = edgeBindings[firstEdgeKey]?.[0]?.id;
                              if (!edgeId) return <p className="text-sm text-gray-500">No edge ID found</p>;
                              
                              const mainEdge = results.message?.knowledge_graph?.edges?.[edgeId];
                              if (!mainEdge) return <p className="text-sm text-gray-500">Edge not found in knowledge graph</p>;
                              
                              const supportGraphsAttr = mainEdge.attributes?.find(
                                (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
                              );
                              
                              const supportGraphIds = Array.isArray(supportGraphsAttr?.value)
                                ? supportGraphsAttr.value
                                : supportGraphsAttr?.value ? [supportGraphsAttr.value] : [];
                              
                              if (supportGraphIds.length === 0) {
                                return <p className="text-sm text-gray-500">No support graphs found</p>;
                              }
                              
                              const connectedMembers: Array<{
                                id: string;
                                name: string;
                                category: string;
                                pValue?: number;
                              }> = [];
                              
                              let predicate = '';
                              
                              supportGraphIds.forEach((sgId: string) => {
                                const auxGraph = results.message?.auxiliary_graphs?.[sgId];
                                if (!auxGraph?.edges) return;
                                
                                let memberId: string = '';
                                let memberName = '';
                                let memberCategory = '';
                                let pValue: number | undefined;
                                
                                auxGraph.edges.forEach((auxEdgeId: string) => {
                                  const auxEdge = results.message?.knowledge_graph?.edges?.[auxEdgeId];
                                  if (!auxEdge) return;
                                  
                                  if (auxEdge.predicate === 'biolink:member_of') {
                                    if (auxEdge.subject) {
                                      memberId = auxEdge.subject;
                                    }
                                    const memberNode = memberId ? results.message?.knowledge_graph?.nodes?.[memberId] : undefined;
                                    memberName = memberNode?.name || memberId;
                                    memberCategory = memberNode?.categories?.[0]?.replace('biolink:', '') || 'Entity';
                                  } else {
                                    predicate = auxEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'related to';
                                    const pValueAttr = auxEdge.attributes?.find(
                                      (attr: any) => attr.attribute_type_id === 'biolink:p_value'
                                    );
                                    if (pValueAttr) pValue = pValueAttr.value;
                                  }
                                });
                                
                                if (memberId) {
                                  connectedMembers.push({ id: memberId, name: memberName, category: memberCategory, pValue });
                                }
                              });
                              
                              connectedMembers.sort((a, b) => {
                                if (a.pValue !== undefined && b.pValue !== undefined) return a.pValue - b.pValue;
                                return 0;
                              });
                              
                              const categoryCount: Record<string, number> = {};
                              connectedMembers.forEach(m => {
                                categoryCount[m.category] = (categoryCount[m.category] || 0) + 1;
                              });
                              const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
                              const mostCommonCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : 'Entity';
                              
                              let memberTypeLabel = mostCommonCategory + 's';
                              if (connectedMembers.length === 1) {
                                memberTypeLabel = mostCommonCategory;
                              } else if (mostCommonCategory.endsWith('y')) {
                                memberTypeLabel = mostCommonCategory.slice(0, -1) + 'ies';
                              }
                              
                              const outputName = node?.name || outputNodeId;
                              const pathId = `${idx}-direct`;
                              const isPathExpanded = expandedEnrichmentPaths.has(pathId);
                              
                              return (
                                <div className="space-y-3">
                                  <div className="text-sm text-gray-600 mb-3">
                                    {connectedMembers.length} of input members connect to this result
                                  </div>
                                  
                                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                                      <div className="flex items-center gap-3 text-sm flex-wrap">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleEnrichmentPath(pathId);
                                          }}
                                          className="inline-flex items-center bg-green-100 border border-green-400 px-2 py-1 rounded font-semibold hover:bg-green-200 transition-colors"
                                        >
                                          {connectedMembers.length} {memberTypeLabel}
                                        </button>
                                        
                                        <div className="flex flex-col items-center justify-center">
                                          <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{predicate}</span>
                                          <div className="flex items-center">
                                            <div className="flex-1 border-t-2 border-purple-600"></div>
                                            <span className="text-purple-600 font-bold text-lg mx-1">→</span>
                                          </div>
                                        </div>
                                        
                                        <span className="inline-flex items-center bg-purple-100 border border-purple-400 px-2 py-1 rounded font-semibold">
                                          {outputName}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {isPathExpanded && (
                                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 mt-3">
                                        <div className="text-xs text-green-700 font-semibold mb-2">
                                          Connected {memberTypeLabel} ({connectedMembers.length})
                                        </div>
                                        <div className="space-y-1 max-h-64 overflow-y-auto">
                                          {connectedMembers.map((member, mIdx) => (
                                            <div key={mIdx} className="flex items-center justify-between bg-white border border-green-200 rounded p-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <div className="text-xs font-semibold text-gray-900 truncate">
                                                    {member.name}
                                                  </div>
                                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0">
                                                    {member.category}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono truncate">
                                                  {member.id}
                                                </div>
                                              </div>
                                              {member.pValue !== undefined && (
                                                <div className="text-xs text-gray-600 ml-2 flex-shrink-0">
                                                  p = {member.pValue.toExponential(2)}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
