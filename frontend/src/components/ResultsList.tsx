import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { ResultPathViewer } from './ResultPathViewer';

interface ResultsListProps {
  results: any;
}

export const ResultsList: React.FC<ResultsListProps> = ({ results }) => {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [expandedSupportGraphs, setExpandedSupportGraphs] = useState<Map<string, boolean>>(new Map());
  const [visualizationMode, setVisualizationMode] = useState<'text' | 'cytoscape'>('text');

  if (!results?.message) return null;
  
  const allNodeIds = Object.entries(results.message.query_graph.nodes).flatMap(([nodeKey, nodeVal]: [string, any]) => nodeVal.ids ?? []);
  
  // Determine query graph direction - is the output subject or object?
  let queryOutputIsSubject = true; // default
  Object.entries(results.message.query_graph.edges || {}).forEach(([edgeKey, edge]: [string, any]) => {
    const subjectNode = results.message.query_graph.nodes[edge.subject];
    const objectNode = results.message.query_graph.nodes[edge.object];
    
    // If subject has IDs (set node), then output is object
    if (subjectNode?.ids && subjectNode.ids.length > 0) {
      queryOutputIsSubject = false;
    }
    // If object has IDs (set node), then output is subject  
    else if (objectNode?.ids && objectNode.ids.length > 0) {
      queryOutputIsSubject = true;
    }
  });
  
  const toggleResultExpansion = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const toggleSupportGraph = (sgId: string) => {
    console.log('toggleSupportGraph called with:', sgId);
    setExpandedSupportGraphs(prev => {
      const newMap = new Map(prev);
      const currentValue = newMap.get(sgId);
      console.log('Current value:', currentValue, 'Setting to:', !currentValue);
      newMap.set(sgId, !currentValue);
      return newMap;
    });
  };
  const renderSupportGraphText = (sgId: string, resultIndex: number, queryOutputIsSubject: boolean) => {
    const auxGraph = results.message?.auxiliary_graphs?.[sgId];
    if (!auxGraph) return null;

    const edges = auxGraph.edges || [];
    if (edges.length !== 3) return null;

    // Find the three edges: input→lookup, lookup→enrichment, result→enrichment
    let inputToLookupEdge: any = null;
    let lookupToEnrichmentEdge: any = null;
    let resultToEnrichmentEdge: any = null;
    let inputNodeids: any = null;
    let enrichmentNodeids: any = null;
    let resultNodeIds: any = null;

    edges.forEach((edgeId: string) => {
      const edge = results.message?.knowledge_graph?.edges[edgeId];
      if (!edge) return;

      // Input to Lookup Set (has uuid as object)
      if (
        (allNodeIds.includes(edge.subject) && edge.object?.startsWith("uuid:")) ||
        (allNodeIds.includes(edge.object) && edge.subject?.startsWith("uuid:"))
      ) {
        inputToLookupEdge = edge;
        if (allNodeIds.includes(edge.subject) && edge.object?.startsWith("uuid:")) {
          inputNodeids = edge.subject;
        }
        else {  
          inputNodeids = edge.object;
        }
      }
      
      // Lookup Set to Enrichment (has nested support graphs)
      else if ((edge.object?.startsWith('uuid:') && edge.attributes?.some((attr: any) => 
        attr.attribute_type_id === 'biolink:support_graphs' && Array.isArray(attr.value)
      )) || (edge.subject?.startsWith('uuid:') && edge.attributes?.some((attr: any) => 
        attr.attribute_type_id === 'biolink:support_graphs' && Array.isArray(attr.value)
      ))) {
        lookupToEnrichmentEdge = edge;
        if (edge.object?.startsWith('uuid:')) {
          enrichmentNodeids = edge.subject;
        }
        else { 
          enrichmentNodeids = edge.object;
        }
      }
      // Result to Enrichment
      else if (!allNodeIds.includes(edge.subject) && !edge.subject?.startsWith('uuid:') &&
               !allNodeIds.includes(edge.object) && !edge.object?.startsWith('uuid:')) {
        resultToEnrichmentEdge = edge;
        if (!allNodeIds.includes(edge.subject) && !edge.subject?.startsWith('uuid:')) {
          resultNodeIds = edge.subject;
        }
        else {  
          resultNodeIds = edge.object;
        }
      }
    });

    const missingEdges = [
      !inputToLookupEdge && "input-to-lookup",
      !lookupToEnrichmentEdge && "lookup-to-enrichment",
      !resultToEnrichmentEdge && "result-to-enrichment",
    ].filter(Boolean) as string[];
    
    if (missingEdges.length) {
      return (
        <div key={sgId} className="bg-white border-2 border-gray-200 rounded-lg p-3">
          <div className="text-sm text-red-600">
            Unable to parse support graph structure. Missing:{" "} 
            {missingEdges.join(", ")} edge(s)
          </div>
        </div>
      );
    }
    
    // Get node information
    const inputNode = results.message?.knowledge_graph?.nodes[inputNodeids];
    const enrichmentNode = results.message?.knowledge_graph?.nodes[enrichmentNodeids];
    const resultNode = results.message?.knowledge_graph?.nodes[resultNodeIds];

    // Get connected members from nested support graphs
    const nestedSupportGraphsAttr = lookupToEnrichmentEdge.attributes?.find(
      (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
    );
    const nestedSupportGraphIds = nestedSupportGraphsAttr?.value || [];
    
    const connectedMembers: Array<{id: string, name: string, pValue: number, category: string}> = [];
    nestedSupportGraphIds.forEach((nestedSgId: string) => {
      const nestedAuxGraph = results.message?.auxiliary_graphs?.[nestedSgId];
      if (!nestedAuxGraph?.edges) return;

      let memberId: string | null = null;
      let pValue: number | null = null;

      nestedAuxGraph.edges.forEach((nestedEdgeId: string) => {
        const nestedEdge = results.message?.knowledge_graph?.edges[nestedEdgeId];
        if (!nestedEdge) return;

        // Find p-value
        const pValueAttr = nestedEdge.attributes?.find(
          (attr: any) => attr.attribute_type_id === 'biolink:p_value'
        );
        if (pValueAttr?.value) {
          pValue = pValueAttr.value;
        }

        // Find member ID
        if (nestedEdge.predicate === 'biolink:member_of') {
          memberId = nestedEdge.subject;
        }
      });

      if (memberId && pValue !== null) {
        const memberNode = results.message?.knowledge_graph?.nodes[memberId];
        // Get primary category for this member
        const primaryCategory = memberNode?.categories?.[0]?.replace('biolink:', '') || 'Entity';
        connectedMembers.push({
          id: memberId,
          name: memberNode?.name || memberId,
          pValue: pValue,
          category: primaryCategory
        });
      }
    });

    // Determine the most common category type for display
    const categoryCount: Record<string, number> = {};
    connectedMembers.forEach(member => {
      categoryCount[member.category] = (categoryCount[member.category] || 0) + 1;
    });
    
    // Get the most common category (pluralize if needed)
    let memberTypeLabel = 'members';
    if (Object.keys(categoryCount).length > 0) {
      const mostCommonCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      // Simple pluralization - add 's' if count > 1, handle common cases
      const count = connectedMembers.length;
      if (count === 1) {
        memberTypeLabel = mostCommonCategory;
      } else {
        // Handle common plural forms
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

    const expandKey = `${resultIndex}-${sgId}`;
    const isExpanded = expandedSupportGraphs.get(expandKey) || false;

    // Format predicates for display
    const pred1 = inputToLookupEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'relates to';
    const pred2 = lookupToEnrichmentEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'relates to';
    const pred3 = resultToEnrichmentEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'relates to';

    // Determine arrow directions based on actual edge structure
    
    // Arrow 1: Input → Lookup (uuid)
    const arrow1Direction = allNodeIds.includes(inputToLookupEdge.subject) && inputToLookupEdge.object?.startsWith("uuid:") 
      ? '→'  // subject (input) → object (uuid)
      : '←'; // object (input) ← subject (uuid)
    
    // Arrow 2 & 3: These should be CONSISTENT because it's the same relationship type
    // Example: if members "affects →" enrichment, then enrichment "affects →" result
    
    // Arrow 2: Member → Enrichment (from lookup set)
    // If enrichment is the OBJECT in lookupToEnrichmentEdge, members point TO it (→)
    // If enrichment is the SUBJECT in lookupToEnrichmentEdge, members point FROM it (←)
    const enrichmentIsObjectInLookup = lookupToEnrichmentEdge.object === enrichmentNodeids;
    const arrow2Direction = enrichmentIsObjectInLookup ? '→' : '←';
    
    // Arrow 3: Enrichment → Result (should match arrow2 direction for same predicate)
    // If enrichment was OBJECT in lookup edge (members → enrichment), 
    // then enrichment should be SUBJECT in result edge (enrichment → result)
    const enrichmentIsSubjectInResult = resultToEnrichmentEdge.subject === enrichmentNodeids;
    
    // The arrows should match: if arrow2 is →, arrow3 should be →
    const arrow3Direction = enrichmentIsSubjectInResult ? '→' : '←';

    return (
      <div key={sgId} className="bg-white border-2 border-gray-200 rounded-lg p-3">
        {/* Single-line 3-hop path */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {/* Input Node */}
            <span className="inline-flex items-center bg-yellow-100 border border-yellow-400 px-2 py-1 rounded font-semibold">
              {inputNode?.name || inputNodeids}
            </span>
            
            {/* Arrow 1 with predicate underneath - arrow spans the text width */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{pred1}</span>
              <div className="flex items-center" style={{ width: '100%' }}>
                <div className="flex-1 border-t-2 border-purple-600"></div>
                <span className="text-purple-600 font-bold text-lg mx-1">{arrow1Direction}</span>
              </div>
            </div>
            
            {/* Member count button (no enrichment node name) */}
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
            
            {/* Arrow 2 with predicate underneath */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{pred2}</span>
              <div className="flex items-center" style={{ width: '100%' }}>
                <div className="flex-1 border-t-2 border-purple-600"></div>
                <span className="text-purple-600 font-bold text-lg mx-1">{arrow2Direction}</span>
              </div>
            </div>
            
            {/* Enrichment node */}
            <span className="inline-flex items-center bg-blue-100 border border-blue-400 px-2 py-1 rounded font-semibold">
              {enrichmentNode?.name || enrichmentNodeids}  
            </span>
            
            {/* Arrow 3 with predicate underneath */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{pred3}</span>
              <div className="flex items-center" style={{ width: '100%' }}>
                <div className="flex-1 border-t-2 border-purple-600"></div>
                <span className="text-purple-600 font-bold text-lg mx-1">{arrow3Direction}</span>
              </div>
            </div>
            
            {/* Result Node */}
            <span className="inline-flex items-center bg-indigo-100 border border-indigo-400 px-2 py-1 rounded font-semibold">
              {resultNode?.name || resultNodeIds}  {/* ✅ FIXED: Changed from resultNodeId */}
            </span>
          </div>
        </div>

        {/* Expanded member details */}
        {isExpanded && connectedMembers.length > 0 && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
            <div className="text-xs text-green-700 font-semibold mb-2">
              Connected {memberTypeLabel.charAt(0).toUpperCase() + memberTypeLabel.slice(1)} ({connectedMembers.length})
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
  return (
    <div className="space-y-4">
      {/* Visualization Mode Toggle */}
      {/* <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Results ({results.message.results?.length || 0})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <select
              value={visualizationMode}
              onChange={(e) => setVisualizationMode(e.target.value as 'text' | 'cytoscape')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="text">Text View</option>
              <option value="cytoscape">Graph View</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {visualizationMode === 'text' 
            ? 'Click to expand and view path details in text format'
            : 'Click to expand and view interactive graph visualization'}
        </p>
      </div> */}

      {/* Results List */}
      {results.message.results?.map((result: any, index: number) => {
        const nodeBindings = Object.values(result.node_bindings);
        const resultNodeId = Object.values(nodeBindings)
          .flat()
          .map((b: any) => b.id)
          .find((id: string) => !allNodeIds.includes(id)) || 'Unknown';
        
        const node = results.message?.knowledge_graph?.nodes[resultNodeId];
        const score = result.analyses[0]?.score || 0;
        const isExpanded = expandedResults.has(index);
        const edgeId = result.analyses[0]?.edge_bindings?.e0?.[0]?.id;

        return (
          <div 
            key={index} 
            className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleResultExpansion(index);
              }}
              className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded">
                      #{index + 1}
                    </span>
                    <h5 className="font-semibold text-base text-gray-900">
                      {node?.name || resultNodeId}
                    </h5>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {resultNodeId}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xs text-gray-500 font-medium mb-1">Score</div>
                  <div className="text-lg font-bold text-indigo-600">
                    {score.toFixed(4)}
                  </div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t-2 border-gray-200 bg-gray-50 p-4 space-y-4">
                {visualizationMode === 'text' ? (
                  // Text View
                  <>
                    {!edgeId ? (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-semibold text-yellow-900 mb-2">
                              No edge binding found for this result
                            </div>
                            <pre className="text-xs overflow-auto bg-white p-2 rounded border border-yellow-200">
                              {JSON.stringify(result.analyses[0]?.edge_bindings, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : (() => {
                      const edge = results.message?.knowledge_graph?.edges[edgeId];
                      if (!edge) {
                        return (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                              <div className="font-semibold text-yellow-900">
                                Edge not found: {edgeId}
                              </div>
                            </div>
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
                        <>
                          {/* Inferred Edge Card */}
                          {/* <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                            <div className="font-semibold text-blue-900 mb-3 text-base">
                              Inferred Edge
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
                                  Subject:
                                </span>
                                <span className="text-sm text-gray-900">
                                  {results.message?.knowledge_graph?.nodes[edge.subject]?.name || edge.subject}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
                                  Predicate:
                                </span>
                                <span className="text-sm font-semibold text-purple-700">
                                  {edge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
                                  Object:
                                </span>
                                <span className="text-sm text-gray-900">
                                  {results.message?.knowledge_graph?.nodes[edge.object]?.name || edge.object}
                                </span>
                              </div>
                            </div>
                          </div> */}

                          {/* Indirect Paths */}
                          {supportGraphs.length > 0 ? (
                            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                              <div className="font-semibold text-green-900 mb-3 text-base">
                                Inference Paths ({supportGraphs.length})
                              </div>
                              <div className="space-y-3">
                                {supportGraphs.map((sgId: string, sgIdx: number) => 
                                  renderSupportGraphText(sgId, index, queryOutputIsSubject) || (
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
                        </>
                      );
                    })()}
                  </>
                ) : (
                  // Graph View
                  <ResultPathViewer
                    result={result}
                    knowledgeGraph={results.message?.knowledge_graph}
                    queryGraph={results.message?.query_graph}
                    auxiliaryGraphs={results.message?.auxiliary_graphs}
                    resultIndex={index}
                    allResults={results.message?.results}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};