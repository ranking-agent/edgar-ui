import React, { useEffect, useState } from 'react';
import { enrichmentAPI } from '../utils/api';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
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

// Edge Chip Component - shows predicate with directional arrow
const EdgeChip: React.FC<{ label: string; direction?: 'left' | 'right' }> = ({ label, direction = 'right' }) => (
  <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 border-2 border-purple-300 rounded-lg">
    {direction === 'left' ? (
      <>
        <span className="text-purple-400">←</span>
        <span className="text-sm font-medium text-purple-700">{label}</span>
        <span className="text-purple-400">←</span>
      </>
    ) : (
      <>
        <span className="text-purple-400">→</span>
        <span className="text-sm font-medium text-purple-700">{label}</span>
        <span className="text-purple-400">→</span>
      </>
    )}
  </div>
);

interface ResultsViewerProps {
  jobId?: string;           // Used when fetching from API (Dashboard)
  directData?: any;         // Used when data is already loaded (BYOResponseData)
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

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ jobId, directData, onResultsLoad, onTabChange, onRuleSelect }) => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'direct' | 'inferred'>('inferred');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [resultViewModes, setResultViewModes] = useState<Map<number, 'paths' | 'graph'>>(new Map());
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedRuleMembers, setExpandedRuleMembers] = useState<string | null>(null);
  const [expandedSupportGraphs, setExpandedSupportGraphs] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    // If directData is provided, use it directly (BYOResponseData case)
    if (directData) {
      setResults(directData);
      setLoading(false);
      onResultsLoad?.(directData);
      return;
    }

    // Otherwise, fetch from API using jobId (Dashboard case)
    if (!jobId) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        const data = await enrichmentAPI.getResults(jobId);
        // console.log('Fetched results:', data);
        setResults(data);
        onResultsLoad?.(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId, directData]);

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = jobId ? `edgar-results-${jobId}.json` : 'edgar-results.json';
    link.click();
    URL.revokeObjectURL(url);
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

  const toggleSupportGraph = (sgId: string) => {
    setExpandedSupportGraphs(prev => {
      const newMap = new Map(prev);
      newMap.set(sgId, !newMap.get(sgId));
      return newMap;
    });
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
  let outputCategory: string[] = [];
  
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
    
    // Determine which node is input (has ids) and which is output (no ids)
    if (subjectNode?.ids?.some((id: string) => queryInputIds.has(id))) {
      querySubjectIsInput = true;
      // Output is the OBJECT node (the one we're searching for)
      outputCategory = objectNode?.categories || [];
    } else if (objectNode?.ids?.some((id: string) => queryInputIds.has(id))) {
      querySubjectIsInput = false;
      // Output is the SUBJECT node (the one we're searching for)
      outputCategory = subjectNode?.categories || [];
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
            // console.log(auxEdge)
            if (auxEdge?.predicate === 'biolink:member_of') {
              const memberId = auxEdge.subject;
              const memberNode = knowledgeGraph.nodes?.[memberId];
              if (!lookupSetMembers.has(memberId)) {
                // Try outputCategory first, then fall back to node's categories from KG
                const category = outputCategory?.[0]?.replace('biolink:', '') 
                  || memberNode?.categories?.[0]?.replace('biolink:', '') 
                  || '';
                lookupSetMembers.set(memberId, {
                  nodeId: memberId,
                  nodeName: memberNode?.name || memberId,
                  category,
                });
              }
            }
            else if (auxEdge && 
                     ((queryInputIds.has(auxEdge.subject) && !auxEdge.object?.startsWith('uuid:')) ||
                      (queryInputIds.has(auxEdge.object) && !auxEdge.subject?.startsWith('uuid:')))) {
              const memberId = queryInputIds.has(auxEdge.subject) ? auxEdge.object : auxEdge.subject;
              const memberNode = knowledgeGraph.nodes?.[memberId];
              
              if (memberNode && !memberId.startsWith('uuid:')) {
                // Try outputCategory first, then fall back to node's categories from KG
                const category = outputCategory?.[0]?.replace('biolink:', '') 
                  || memberNode?.categories?.[0]?.replace('biolink:', '') 
                  || '';
                lookupSetMembers.set(memberId, {
                  nodeId: memberId,
                  nodeName: memberNode?.name || memberId,
                  category,
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
          // isEnrichmentSubject = true means: enrichmentNode --predicate--> uuid (lookup set)
          // isEnrichmentSubject = false means: uuid (lookup set) --predicate--> enrichmentNode
          const isEnrichmentSubject = !edge.subject?.startsWith('uuid:');
          
          // ruleKey format: subject→predicate→object direction
          // When enrichment is subject: enrichmentNode→predicate (points to lookup set)
          // When enrichment is object: predicate→enrichmentNode (lookup set points to it)
          const ruleKey = isEnrichmentSubject 
            ? `${enrichmentNodeId}→${predicate}→lookup`
            : `lookup→${predicate}→${enrichmentNodeId}`;

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

  // Helper to get all query node IDs for path rendering
  const allQueryNodeIds = Array.from(queryInputIds);

  const renderSupportGraphText = (sgId: string, resultIdx: number) => {
    const auxGraph = auxiliaryGraphs?.[sgId];
    if (!auxGraph) return null;

    const edges = auxGraph.edges || [];
    if (edges.length !== 3) return null;

    // Determine if this is property enrichment (n_Inferred) or graph enrichment
    const isPropertyEnrichment = sgId.startsWith('n_Inferred') || sgId.includes('n_Inferred');

    // Find the three edges and track their actual directions
    let inputToLookupEdge: any = null;
    let lookupToEnrichmentEdge: any = null;
    let resultToEnrichmentEdge: any = null;
    let inputNodeids: any = null;
    let enrichmentNodeids: any = null;
    let resultNodeIds: any = null;
    
    // Direction tracking: true means left node is subject, false means left node is object
    let inputIsSubject = true;           // Input → Lookup direction
    let lookupIsSubject = true;          // Lookup → Enrichment direction

    edges.forEach((edgeId: string) => {
      const edge = knowledgeGraph?.edges[edgeId];
      if (!edge) return;

      // Input to Lookup Set
      if (
        (queryInputIds.has(edge.subject) && edge.object?.startsWith("uuid:")) ||
        (queryInputIds.has(edge.object) && edge.subject?.startsWith("uuid:"))
      ) {
        inputToLookupEdge = edge;
        inputNodeids = queryInputIds.has(edge.subject) ? edge.subject : edge.object;
        // Input is subject if query input is in subject position
        inputIsSubject = queryInputIds.has(edge.subject);
      }
      // Lookup Set to Enrichment
      else if ((edge.object?.startsWith('uuid:') && edge.attributes?.some((attr: any) => 
        attr.attribute_type_id === 'biolink:support_graphs' && Array.isArray(attr.value)
      )) || (edge.subject?.startsWith('uuid:') && edge.attributes?.some((attr: any) => 
        attr.attribute_type_id === 'biolink:support_graphs' && Array.isArray(attr.value)
      ))) {
        lookupToEnrichmentEdge = edge;
        enrichmentNodeids = edge.object?.startsWith('uuid:') ? edge.subject : edge.object;
        // Lookup (uuid) is subject if uuid is in subject position
        lookupIsSubject = edge.subject?.startsWith('uuid:');
      }
      // Result to Enrichment
      else if (!queryInputIds.has(edge.subject) && !edge.subject?.startsWith('uuid:') &&
               !queryInputIds.has(edge.object) && !edge.object?.startsWith('uuid:')) {
        resultToEnrichmentEdge = edge;
        // We need to figure out which node is result vs enrichment
        // Will be resolved after all edges are processed
        resultNodeIds = edge.subject; // Temporary, will refine below
      }
    });
    
    // Determine enrichment→result direction based on enrichment type:
    // - Property enrichment (n_Inferred): Inferred result is ALWAYS subject → enrichment is ALWAYS object
    //   So from enrichment's perspective: Enrichment ← Result (enrichmentIsSubjectToResult = false)
    // - Graph enrichment: Enrichment maintains its role from lookup→enrichment
    //   If lookupIsSubject (Lookup→Enrichment), enrichment is object, so Result→Enrichment (enrichmentIsSubjectToResult = false)
    //   If !lookupIsSubject (Enrichment→Lookup), enrichment is subject, so Enrichment→Result (enrichmentIsSubjectToResult = true)
    let enrichmentIsSubjectToResult: boolean;
    
    if (isPropertyEnrichment) {
      // Property enrichment: Result is ALWAYS subject, Enrichment is ALWAYS object
      enrichmentIsSubjectToResult = false;  // Enrichment ← Result
    } else {
      // Graph enrichment: Enrichment maintains its role
      enrichmentIsSubjectToResult = !lookupIsSubject;
    }
    
    if (resultToEnrichmentEdge && enrichmentNodeids) {
      if (resultToEnrichmentEdge.subject === enrichmentNodeids) {
        resultNodeIds = resultToEnrichmentEdge.object;
      } else {
        resultNodeIds = resultToEnrichmentEdge.subject;
      }
    }

    const missingEdges = [
      !inputToLookupEdge && "input-to-lookup",
      !lookupToEnrichmentEdge && "lookup-to-enrichment",
      !resultToEnrichmentEdge && "result-to-enrichment",
    ].filter(Boolean) as string[];
    
    if (missingEdges.length) {
      return (
        <div key={sgId} className="bg-white border-2 border-gray-200 rounded-lg p-3">
          <div className="text-sm text-red-600">
            Unable to parse support graph structure. Missing: {missingEdges.join(", ")} edge(s)
          </div>
        </div>
      );
    }
    
    // Get node information
    const inputNode = knowledgeGraph?.nodes[inputNodeids];
    const enrichmentNode = knowledgeGraph?.nodes[enrichmentNodeids];
    const resultNode = knowledgeGraph?.nodes[resultNodeIds];

    // Get connected members
    const nestedSupportGraphsAttr = lookupToEnrichmentEdge.attributes?.find(
      (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
    );
    const nestedSupportGraphIds = nestedSupportGraphsAttr?.value || [];
    
    const connectedMembers: Array<{id: string, name: string, pValue: number, category: string}> = [];
    nestedSupportGraphIds.forEach((nestedSgId: string) => {
      const nestedAuxGraph = auxiliaryGraphs?.[nestedSgId];
      if (!nestedAuxGraph?.edges) return;

      let memberId: string | null = null;
      let pValue: number | null = null;

      nestedAuxGraph.edges.forEach((nestedEdgeId: string) => {
        const nestedEdge = knowledgeGraph?.edges[nestedEdgeId];
        if (!nestedEdge) return;

        const pValueAttr = nestedEdge.attributes?.find(
          (attr: any) => attr.attribute_type_id === 'biolink:p_value'
        );
        if (pValueAttr?.value) {
          pValue = pValueAttr.value;
        }

        if (nestedEdge.predicate === 'biolink:member_of') {
          memberId = nestedEdge.subject;
        }
      });

      if (memberId && pValue !== null) {
        const memberNode = knowledgeGraph?.nodes[memberId];
        // Try outputCategory first, then fall back to node's categories from KG
        const primaryCategory = outputCategory?.[0]?.replace('biolink:', '') 
          || memberNode?.categories?.[0]?.replace('biolink:', '') 
          || '';
        connectedMembers.push({
          id: memberId,
          name: memberNode?.name || memberId,
          pValue: pValue,
          category: primaryCategory
        });
      }
    });

    // Determine member type label
    const categoryCount: Record<string, number> = {};
    connectedMembers.forEach(member => {
      categoryCount[member.category] = (categoryCount[member.category] || 0) + 1;
    });
    
    let memberTypeLabel = 'members';
    if (Object.keys(categoryCount).length > 0) {
      const mostCommonCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      const count = connectedMembers.length;
      if (count === 1) {
        memberTypeLabel = mostCommonCategory;
      } else {
        if (mostCommonCategory.endsWith('y')) {
          memberTypeLabel = mostCommonCategory.slice(0, -1) + 'ies';
        } else if (mostCommonCategory.endsWith('s') || mostCommonCategory.endsWith('x') || 
                   mostCommonCategory.endsWith('ch') || mostCommonCategory.endsWith('sh')) {
          memberTypeLabel = mostCommonCategory + 'es';
        } else {
          memberTypeLabel = mostCommonCategory + 's';
        }
      }
    }

    const expandKey = `${resultIdx}-${sgId}`;
    const isExpanded = expandedSupportGraphs.get(expandKey) || false;

    const pred1 = inputToLookupEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'relates to';
    const pred2 = lookupToEnrichmentEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'relates to';
    const pred3 = resultToEnrichmentEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'relates to';

    // Arrow directions based on subject/object relationships
    // inputIsSubject: true = Input→Lookup, false = Input←Lookup
    // lookupIsSubject: true = Lookup→Enrichment, false = Lookup←Enrichment
    // enrichmentIsSubjectToResult: true = Enrichment→Result, false = Enrichment←Result

    return (
      <div key={sgId} className="bg-white border-2 border-gray-200 rounded-lg p-3">
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="inline-flex items-center bg-yellow-100 border border-yellow-400 px-2 py-1 rounded font-semibold">
              {inputNode?.name || inputNodeids}
            </span>
            
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{pred1}</span>
              <div className="flex items-center" style={{ width: '100%' }}>
                <div className="flex-1 border-t-2 border-purple-600"></div>
                <span className="text-purple-600 font-bold text-lg mx-1">{inputIsSubject ? '→' : '←'}</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSupportGraph(expandKey);
              }}
              className="inline-flex items-center bg-green-100 border border-green-400 px-2 py-1 rounded font-semibold hover:bg-green-200 transition-colors"
            >
              {connectedMembers.length} {memberTypeLabel}
            </button>
            
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{pred2}</span>
              <div className="flex items-center" style={{ width: '100%' }}>
                <div className="flex-1 border-t-2 border-purple-600"></div>
                <span className="text-purple-600 font-bold text-lg mx-1">{lookupIsSubject ? '→' : '←'}</span>
              </div>
            </div>
            
            <span className="inline-flex items-center bg-blue-100 border border-blue-400 px-2 py-1 rounded font-semibold">
              {enrichmentNode?.name || enrichmentNodeids}
            </span>
            
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{pred3}</span>
              <div className="flex items-center" style={{ width: '100%' }}>
                <div className="flex-1 border-t-2 border-purple-600"></div>
                <span className="text-purple-600 font-bold text-lg mx-1">{enrichmentIsSubjectToResult ? '→' : '←'}</span>
              </div>
            </div>
            
            <span className="inline-flex items-center bg-indigo-100 border border-indigo-400 px-2 py-1 rounded font-semibold">
              {resultNode?.name || resultNodeIds}
            </span>
          </div>
        </div>

        {isExpanded && connectedMembers.length > 0 && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
            <div className="flex items-center text-xs text-green-700 font-semibold mb-2">
              Connected {memberTypeLabel} ({connectedMembers.length})
              {connectedMembers?.[0]?.pValue !== undefined && (
                <span className="inline-flex ml-auto"> : p = {connectedMembers[0].pValue.toExponential(2)}</span>
              )}
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {connectedMembers
                .sort((a, b) => a.pValue - b.pValue)
                .map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-green-200 rounded p-2">
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
                    <div className="ml-2 text-xs font-mono text-green-700 font-semibold">
                      p={member.pValue.toExponential(2)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
                  /* Show Paths using renderSupportGraphText */
                  (() => {
                    const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
                    const firstEdgeBindingKey = Object.keys(edgeBindings)[0];
                    const edgeId = firstEdgeBindingKey ? edgeBindings[firstEdgeBindingKey]?.[0]?.id : undefined;

                    if (!edgeId) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          No edge binding found for this result
                        </div>
                      );
                    }

                    const edge = knowledgeGraph?.edges?.[edgeId];
                    if (!edge) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          Edge not found: {edgeId}
                        </div>
                      );
                    }

                    const supportGraphAttrs = edge.attributes?.filter(
                      (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
                    ) || [];
                    
                    const supportGraphs = supportGraphAttrs.flatMap((attr: any) =>
                      Array.isArray(attr.value) ? attr.value : [attr.value]
                    ).filter(Boolean);

                    return (
                      <div className="space-y-4">
                        {/* Indirect Paths */}
                        {supportGraphs.length > 0 ? (
                          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                            <div className="font-semibold text-green-900 mb-3 text-base">
                              Inference Paths ({supportGraphs.length})
                            </div>
                            <div className="space-y-3">
                              {supportGraphs.map((sgId: string, sgIdx: number) => 
                                renderSupportGraphText(sgId, resultIdx) || (
                                  <div key={sgIdx} className="text-sm text-gray-500">
                                    Indirect path {sgId} not found
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 text-center">
                              No indirect paths found for this edge
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <ResultPathViewer
                    result={result}
                    knowledgeGraph={knowledgeGraph}
                    queryGraph={queryGraph}
                    auxiliaryGraphs={auxiliaryGraphs}
                    resultIndex={resultIdx}
                    allResults={results.message.results}
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
        {/* Stats - Clickable cards replace tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Inferred Results - Clickable to show all results */}
          <button
            onClick={() => {
              setActiveTab('inferred');
              setSelectedRule(null);
              setShowAllResults(true);
              onTabChange?.('inferred');
            }}
            className={`text-left border-2 rounded-lg p-4 transition-all ${
              activeTab === 'inferred' && showAllResults
                ? 'bg-purple-100 border-purple-500 shadow-md'
                : 'bg-purple-50 border-purple-300 hover:bg-purple-100'
            }`}
          >
            <div className="text-sm text-purple-700 font-semibold mb-1">Inferred Results</div>
            <div className="text-3xl font-bold text-purple-900">{totalResults}</div>
          </button>
          
          {/* Enrichment--Inference Rules - Clickable */}
          <button
            onClick={() => {
              setActiveTab('inferred');
              setSelectedRule(null);
              setShowAllResults(false);
              onTabChange?.('inferred');
            }}
            className={`text-left border-2 rounded-lg p-4 transition-all ${
              activeTab === 'inferred' && !showAllResults
                ? 'bg-blue-100 border-blue-500 shadow-md'
                : 'bg-blue-50 border-blue-300 hover:bg-blue-100'
            }`}
          >
            <div className="text-sm text-blue-700 font-semibold mb-1">Enrichment--Inference Rules</div>
            <div className="text-3xl font-bold text-blue-900">{sortedRules.length}</div>
          </button>

           {/* Lookup Results - Clickable */}
          <button
            onClick={() => {
              setActiveTab('direct');
              setSelectedRule(null);
              onTabChange?.('direct');
            }}
            className={`text-left border-2 rounded-lg p-4 transition-all ${
              activeTab === 'direct'
                ? 'bg-green-50 border-green-500 shadow-md'
                : 'bg-white border-green-300 hover:bg-green-50'
            }`}
          >
            <div className="text-sm text-green-700 font-semibold mb-1">Lookup Results</div>
            <div className="text-3xl font-bold text-green-900">{lookupNodes.length}</div>
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
          ) : showAllResults ? (
            /* Show All Inferred Results */
            <div className="space-y-3">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">All Inferred Results</h3>
                <p className="text-sm text-gray-600">
                  {totalResults} results • Click to expand and view paths or graph
                </p>
              </div>
              {Array.from({ length: totalResults }, (_, idx) => renderExpandableResult(idx))}
            </div>
          ) : (
            /* Show Enrichment Rules */
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
                          /* EnrichmentNode is subject: LookupSet ← predicate ← EnrichmentNode */
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
                            <EdgeChip label={rule.predicate} direction="left" />
                            <NodeChip name={rule.enrichmentNodeName} />
                          </>
                        ) : (
                          /* LookupSet is subject: LookupSet → predicate → EnrichmentNode */
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
                            <EdgeChip label={rule.predicate} direction="right" />
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

        {/* Results Display - Shows when a rule is selected */}
        {activeTab === 'inferred' && !showAllResults && selectedRule && (
          <div className="space-y-3 pt-4 border-t-2 border-gray-200">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Results for Selected Rule
              </h3>
              <p className="text-sm text-gray-600">
                {enrichmentRulesMap.get(selectedRule)?.count || 0} result{enrichmentRulesMap.get(selectedRule)?.count !== 1 ? 's' : ''} • Click to expand and view paths or graph
              </p>
            </div>
            <div className="space-y-3">
              {enrichmentRulesMap.get(selectedRule)?.resultIndices.map((resultIdx) => 
                renderExpandableResult(resultIdx)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};