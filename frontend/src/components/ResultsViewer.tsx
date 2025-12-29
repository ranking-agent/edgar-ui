import React, { useEffect, useState } from 'react';
import { enrichmentAPI } from '../utils/api';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { SingleResultDisplay } from './SingleResultDisplay';
import { ResultPathViewer } from './ResultPathViewer';
import { ErrorBoundary } from './ErrorBoundary';

// Node Chip Component - Expandable for multiple members
const NodeChip: React.FC<{ 
  name: string; 
  members?: string[];
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ name, members, isExpandable = false, isExpanded = false, onToggle }) => {
  if (!isExpandable || !members || members.length === 0) {
    // Regular chip - matches stats card style
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg">
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
    );
  }

  // Expandable chip
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Don't trigger parent button
        onToggle?.();
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
    >
      {isExpanded ? (
        <div className="flex flex-col gap-0.5 text-left">
          {members.map((member, idx) => (
            <span key={idx} className="text-sm font-medium text-gray-900">
              {member}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-sm font-medium text-gray-900">
          {name} ({members.length})
        </span>
      )}
    </button>
  );
};

// Edge Chip Component - matches stats card style
const EdgeChip: React.FC<{ label: string }> = ({ label }) => (
  <div className="inline-flex items-center px-3 py-1.5 bg-purple-50 border-2 border-purple-300 rounded-lg">
    <span className="text-sm font-medium text-purple-700">{label}</span>
  </div>
);

interface ResultsViewerProps {
  jobId: string;
  onResultsLoad?: (results: any) => void;
  onTabChange?: (tab: string) => void;
  onRuleSelect?: (ruleKey: string | null, resultIndices: number[]) => void;
}

interface EnrichmentRule {
  ruleKey: string;
  enrichmentNodeId: string;
  enrichmentNodeName: string;
  predicate: string;
  minPValue: number;
  count: number;
  resultIndices: number[];
  connectedMembers: Set<string>;
  memberConnections: Map<string, number>;
  isEnrichmentSubject: boolean;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ jobId, onResultsLoad, onTabChange, onRuleSelect }) => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'direct' | 'inferred'>('inferred');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [resultViewModes, setResultViewModes] = useState<Map<number, 'paths' | 'graph'>>(new Map());
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedRuleMembers, setExpandedRuleMembers] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await enrichmentAPI.getResults(jobId);
        console.log('Fetched results:', data);
        setResults(data);
        onResultsLoad?.(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edgar-results-${jobId}.json`;
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

  const setResultViewMode = (index: number, mode: 'paths' | 'graph') => {
    const newModes = new Map(resultViewModes);
    newModes.set(index, mode);
    setResultViewModes(newModes);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-600">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!results?.message) return null;

  const knowledgeGraph = results.message.knowledge_graph;
  const auxiliaryGraphs = results.message.auxiliary_graphs;
  const queryGraph = results.message.query_graph;

  // Extract query input curie and query graph predicate
  const queryInputIds = new Set<string>();
  let queryGraphPredicate = '';
  let querySubjectIsInput = true;
  
  Object.values(queryGraph.nodes).forEach((node: any) => {
    if (node.ids) {
      node.ids.forEach((id: string) => queryInputIds.add(id));
    }
  });

  Object.values(queryGraph.edges || {}).forEach((edge: any) => {
    if (edge.predicates && edge.predicates.length > 0) {
      queryGraphPredicate = edge.predicates[0].replace('biolink:', '');
    }
    const subjectNode = queryGraph.nodes[edge.subject];
    const objectNode = queryGraph.nodes[edge.object];
    if (subjectNode?.ids?.some((id: string) => queryInputIds.has(id))) {
      querySubjectIsInput = true;
    } else if (objectNode?.ids?.some((id: string) => queryInputIds.has(id))) {
      querySubjectIsInput = false;
    }
  });

  // Extract lookup set members (Direct results)
  const lookupSetMembers = new Map<string, any>();

  Object.entries(knowledgeGraph.edges || {}).forEach(([edgeId, edge]: [string, any]) => {
    const isQueryToUuid = queryInputIds.has(edge.subject) && edge.object?.startsWith('uuid:');
    const isUuidToQuery = edge.subject?.startsWith('uuid:') && queryInputIds.has(edge.object);
    
    if (isQueryToUuid || isUuidToQuery) {
      const supportGraphsAttr = edge.attributes?.find(
        (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
      );

      if (supportGraphsAttr?.value) {
        const sgId = Array.isArray(supportGraphsAttr.value)
          ? supportGraphsAttr.value[0]
          : supportGraphsAttr.value;

        const auxGraph = auxiliaryGraphs?.[sgId];
        if (auxGraph?.edges) {
          auxGraph.edges.forEach((auxEdgeId: string) => {
            const auxEdge = knowledgeGraph.edges?.[auxEdgeId];
            
            if (auxEdge?.predicate === 'biolink:member_of') {
              const memberId = auxEdge.subject;
              const memberNode = knowledgeGraph.nodes?.[memberId];
              
              if (!lookupSetMembers.has(memberId)) {
                lookupSetMembers.set(memberId, {
                  nodeId: memberId,
                  nodeName: memberNode?.name || memberId,
                  category: memberNode?.categories?.[0]?.replace('biolink:', '') || 'Unknown',
                });
              }
            }
            else if (auxEdge && 
                     ((queryInputIds.has(auxEdge.subject) && !auxEdge.object?.startsWith('uuid:')) ||
                      (queryInputIds.has(auxEdge.object) && !auxEdge.subject?.startsWith('uuid:')))) {
              const memberId = queryInputIds.has(auxEdge.subject) ? auxEdge.object : auxEdge.subject;
              const memberNode = knowledgeGraph.nodes?.[memberId];
              
              if (memberNode && !memberId.startsWith('uuid:')) {
                lookupSetMembers.set(memberId, {
                  nodeId: memberId,
                  nodeName: memberNode?.name || memberId,
                  category: memberNode?.categories?.[0]?.replace('biolink:', '') || 'Unknown',
                  predicate: auxEdge.predicate?.replace('biolink:', '') || queryGraphPredicate,
                });
              }
            }
          });
        }
      }
    }
  });

  const lookupNodes = Array.from(lookupSetMembers.values());

  // Process results to extract enrichment rules
  // Only process enrichment edges that appear in result support graphs
  // (not all KG edges, as some may be pre-computed but unused)
  const enrichmentRulesMap = new Map<string, EnrichmentRule>();

  results.message.results?.forEach((result: any, resultIdx: number) => {
    const edgeBindings = result.analyses?.[0]?.edge_bindings;
    if (!edgeBindings) return;

    const firstEdgeKey = Object.keys(edgeBindings)[0];
    const inferredEdgeId = edgeBindings[firstEdgeKey]?.[0]?.id;
    if (!inferredEdgeId) return;

    const inferredEdge = knowledgeGraph.edges?.[inferredEdgeId];
    if (!inferredEdge) return;

    const supportGraphsAttrs = inferredEdge.attributes?.filter(
      (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
    ) || [];

    if (supportGraphsAttrs.length === 0) return;

    supportGraphsAttrs.forEach((supportGraphsAttr: any) => {
      const supportGraphIds = Array.isArray(supportGraphsAttr.value)
        ? supportGraphsAttr.value
        : [supportGraphsAttr.value];

      supportGraphIds.forEach((sgId: string) => {
        const auxGraph = auxiliaryGraphs?.[sgId];
        if (!auxGraph?.edges) return;

        auxGraph.edges.forEach((auxEdgeId: string) => {
          const edge = knowledgeGraph.edges?.[auxEdgeId];
          if (!edge) return;

          // ENRICHMENT EDGE DETECTION (non-hardcoded, direction-agnostic):
          // An enrichment edge has ALL of these properties:
          // 1. Edge ID starts with 'e_' (enrichment edge marker)
          // 2. Edge ID does NOT contain 'member_of' (not a membership edge)
          // 3. Either subject OR object is 'uuid:*' (points to lookup set)
          // 4. Has support_graphs attribute with ARRAY value (has member evidence)
          
          const hasUuid = edge.subject?.startsWith('uuid:') || edge.object?.startsWith('uuid:');
          const isEnrichmentEdge = 
            auxEdgeId.startsWith('e_') || auxEdgeId.startsWith('n_') &&
            !auxEdgeId.includes('member_of') &&
            hasUuid;
          
          if (!isEnrichmentEdge) return;

          const supportGraphsAttr = edge.attributes?.find(
            (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
          );

          if (!supportGraphsAttr?.value || !Array.isArray(supportGraphsAttr.value)) return;

          // Determine enrichment node (the one that's NOT uuid)
          const enrichmentNodeId = edge.subject?.startsWith('uuid:') 
            ? edge.object 
            : edge.subject;
          const predicate = edge.predicate?.replace('biolink:', '') || '';
          const enrichmentNode = knowledgeGraph.nodes?.[enrichmentNodeId];

          let minPValue = Infinity;
          const memberConnections = new Map<string, number>();

          // Process nested support graphs (member evidence)
          supportGraphsAttr.value.forEach((nestedSgId: string) => {
            const nestedAuxGraph = auxiliaryGraphs?.[nestedSgId];
            if (!nestedAuxGraph?.edges) return;

            let currentMemberId: string | null = null;
            let currentPValue: number | null = null;

            nestedAuxGraph.edges.forEach((nestedEdgeId: string) => {
              const nestedEdge = knowledgeGraph.edges?.[nestedEdgeId];
              if (!nestedEdge) return;

              const pValueAttr = nestedEdge.attributes?.find(
                (attr: any) => attr.attribute_type_id === 'biolink:p_value'
              );

              if (pValueAttr?.value && typeof pValueAttr.value === 'number') {
                currentPValue = pValueAttr.value;
                currentMemberId = nestedEdge.object;
              }

              if (nestedEdge.predicate === 'biolink:member_of') {
                if (!currentMemberId) {
                  currentMemberId = nestedEdge.subject;
                }
              }
            });

            if (currentMemberId && currentPValue !== null) {
              memberConnections.set(currentMemberId, currentPValue);
              if (currentPValue < minPValue) {
                minPValue = currentPValue;
              }
            }
          });

          if (minPValue === Infinity) return;

          // Determine if enrichment node is subject or object
          const isEnrichmentSubject = !edge.subject?.startsWith('uuid:');
          const ruleKey = isEnrichmentSubject 
            ? `${enrichmentNodeId}→${predicate}`
            : `${predicate}→${enrichmentNodeId}`;

          if (!enrichmentRulesMap.has(ruleKey)) {
            enrichmentRulesMap.set(ruleKey, {
              ruleKey,
              enrichmentNodeId,
              enrichmentNodeName: enrichmentNode?.name || enrichmentNodeId,
              predicate,
              minPValue,
              count: 0,
              resultIndices: [],
              connectedMembers: new Set(),
              memberConnections: new Map(),
              isEnrichmentSubject,
            });
          }

          const rule = enrichmentRulesMap.get(ruleKey)!;
          if (!rule.resultIndices.includes(resultIdx)) {
            rule.count++;
            rule.resultIndices.push(resultIdx);
          }
          if (minPValue < rule.minPValue) {
            rule.minPValue = minPValue;
          }
          
          memberConnections.forEach((pValue, memberId) => {
            rule.connectedMembers.add(memberId);
            if (!rule.memberConnections.has(memberId) || pValue < rule.memberConnections.get(memberId)!) {
              rule.memberConnections.set(memberId, pValue);
            }
          });
        });
      });
    });
  });

  const sortedRules = Array.from(enrichmentRulesMap.values()).sort(
    (a, b) => a.minPValue - b.minPValue
  );

  const totalResults = results.message.results?.length || 0;

  const renderExpandableResult = (resultIdx: number) => {
    const result = results.message.results[resultIdx];
    if (!result) return null;

    const nodeBindings = result.node_bindings || {};
    const outputNodes: any[] = [];
    Object.entries(nodeBindings).forEach(([key, bindings]: [string, any]) => {
      bindings.forEach((binding: any) => {
        const nodeId = binding.id;
        if (!queryInputIds.has(nodeId) && !nodeId.startsWith('uuid:')) {
          const node = knowledgeGraph.nodes?.[nodeId];
          outputNodes.push({
            nodeId,
            nodeName: node?.name || nodeId,
          });
        }
      });
    });

    if (outputNodes.length === 0) return null;

    const outputNode = outputNodes[0];
    const score = result.analyses?.[0]?.score;

    const isExpanded = expandedResults.has(resultIdx);
    const viewMode = resultViewModes.get(resultIdx) || 'paths';

    return (
      <div key={resultIdx} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
        <button
          onClick={() => toggleResultExpansion(resultIdx)}
          className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded">
                  #{resultIdx + 1}
                </span>
                <h5 className="font-semibold text-base text-gray-900">{outputNode.nodeName}</h5>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-500 font-mono">{outputNode.nodeId}</div>
            </div>
            {score !== undefined && (
              <div className="text-right ml-4">
                <div className="text-xs text-gray-500 font-medium mb-1">Score</div>
                <div className="text-lg font-bold text-indigo-600">
                  {score.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t-2 border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 bg-white">
              <div className="flex gap-2 px-4 pt-2">
                <button
                  onClick={() => setResultViewMode(resultIdx, 'paths')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    viewMode === 'paths'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Paths
                </button>
                <button
                  onClick={() => setResultViewMode(resultIdx, 'graph')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    viewMode === 'graph'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Graph
                </button>
              </div>
            </div>

            <div className="p-4">
              <ErrorBoundary>
                {viewMode === 'paths' ? (
                  <SingleResultDisplay
                    result={result}
                    knowledgeGraph={knowledgeGraph}
                    queryGraph={queryGraph}
                    auxiliaryGraphs={auxiliaryGraphs}
                  />
                ) : (
                  <ResultPathViewer
                    result={result}
                    knowledgeGraph={knowledgeGraph}
                    queryGraph={queryGraph}
                    auxiliaryGraphs={auxiliaryGraphs}
                    resultIndex={resultIdx}
                    lookupSetMembers={lookupNodes}
                  />
                )}
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 space-y-6">
        {/* Stats - Consistent styling with chips */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Lookup Results - White with border (like NodeChip) */}
          <div className="bg-white border-2 border-green-300 rounded-lg p-4 hover:bg-green-50 transition-colors">
            <div className="text-sm text-green-700 font-semibold mb-1">Lookup Results</div>
            <div className="text-3xl font-bold text-green-900">{lookupNodes.length}</div>
          </div>
          
          {/* Inferred Results - Blue */}
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 hover:bg-purple-100 transition-colors">
            <div className="text-sm text-purple-700 font-semibold mb-1">Inferred Results</div>
            <div className="text-3xl font-bold text-purple-900">{totalResults}</div>
          </div>
          
          
          {/* Enrichment Rules - Purple (like EdgeChip) */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 hover:bg-blue-100 transition-colors">
            <div className="text-sm text-blue-700 font-semibold mb-1">Enrichment Rules</div>
            <div className="text-3xl font-bold text-blue-900">{sortedRules.length}</div>
          </div>
          
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

        {/* Main Tabs */}
        <div className="border-b-2 border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('direct');
                setSelectedRule(null);
              }}
              className={`px-6 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'direct'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Direct ({lookupNodes.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('inferred');
                setSelectedRule(null);
              }}
              className={`px-6 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'inferred'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inferrence Rules ({sortedRules.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {activeTab === 'direct' ? (
            <div className="h-[400px] flex flex-col">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Lookup Set Members</h3>
                <p className="text-sm text-gray-600">
                  Members of the query set (uuid) used for enrichment analysis
                </p>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 border-2 border-gray-200 rounded-lg p-3 space-y-2">
                {lookupNodes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No lookup set members found
                  </div>
                ) : (
                  lookupNodes.map((node, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded font-semibold">
                              {node.predicate || queryGraphPredicate}
                            </span>
                          </div>
                          <div className="font-semibold text-sm text-gray-900 mb-1">
                            {node.nodeName}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mb-1">{node.nodeId}</div>
                          <div className="text-xs text-indigo-600 font-medium">{node.category}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex flex-col">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Enrichment Rules
                </h3>
                <p className="text-sm text-gray-600">
                  Sorted by p-value • Click a rule to see results containing it below
                </p>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 border-2 border-gray-200 rounded-lg p-3 space-y-2">
                {sortedRules.map((rule, idx) => {
                  const isSelected = selectedRule === rule.ruleKey;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const newSelection = isSelected ? null : rule.ruleKey;
                        setSelectedRule(newSelection);
                        if (newSelection) {
                          onRuleSelect?.(newSelection, rule.resultIndices);
                        } else {
                          onRuleSelect?.(null, []);
                        }
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Visual Path Display */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {rule.isEnrichmentSubject ? (
                          <>
                            <NodeChip name={rule.enrichmentNodeName} />
                            <EdgeChip label={rule.predicate} />
                            <NodeChip 
                              name="Lookup Set"
                              members={Array.from(rule.connectedMembers).map(
                                memberId => lookupNodes.find(n => n.nodeId === memberId)?.nodeName || memberId
                              )}
                              isExpandable={true}
                              isExpanded={expandedRuleMembers === rule.ruleKey}
                              onToggle={() => setExpandedRuleMembers(
                                expandedRuleMembers === rule.ruleKey ? null : rule.ruleKey
                              )}
                            />
                          </>
                        ) : (
                          <>
                            <NodeChip 
                              name="Lookup Set"
                              members={Array.from(rule.connectedMembers).map(
                                memberId => lookupNodes.find(n => n.nodeId === memberId)?.nodeName || memberId
                              )}
                              isExpandable={true}
                              isExpanded={expandedRuleMembers === rule.ruleKey}
                              onToggle={() => setExpandedRuleMembers(
                                expandedRuleMembers === rule.ruleKey ? null : rule.ruleKey
                              )}
                            />
                            <EdgeChip label={rule.predicate} />
                            <NodeChip name={rule.enrichmentNodeName} />
                          </>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="font-medium">{rule.count} result{rule.count !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">
                            {rule.connectedMembers.size}/{lookupNodes.length} members
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-red-600 font-semibold">p-value: </span>
                          <span className="text-xs font-mono text-red-700 font-bold">
                            {rule.minPValue.toExponential(2)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};