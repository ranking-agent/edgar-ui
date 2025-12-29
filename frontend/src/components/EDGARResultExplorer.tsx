// import React, { useState, useMemo } from 'react';
// import { ChevronDown, ChevronUp, Network, TrendingUp, Users, AlertCircle } from 'lucide-react';

// interface EDGARResultExplorerProps {
//   result: any;
//   knowledgeGraph: any;
//   auxiliaryGraphs: any;
//   resultIndex: number;
// }

// interface SupportGraphEdges {
//   inf2enrichment: string;
//   enrich2group: string;
//   group2curie: string;
// }

// export const EDGARResultExplorer: React.FC<EDGARResultExplorerProps> = ({
//   result,
//   knowledgeGraph,
//   auxiliaryGraphs,
//   resultIndex,
// }) => {
//   const [expandedSupportGraphs, setExpandedSupportGraphs] = useState<Set<number>>(new Set());
//   const [expandedEnrichmentPaths, setExpandedEnrichmentPaths] = useState<Set<string>>(new Set());

//   // Extract the inferred edge and its support graphs
//   const { inferredEdge, supportGraphs, error } = useMemo(() => {
//     try {
//       console.log('EDGARResultExplorer - Processing result:', result);
//       console.log('EDGARResultExplorer - KG has edges:', !!knowledgeGraph?.edges);
//       console.log('EDGARResultExplorer - Aux graphs:', !!auxiliaryGraphs);

//       const edgeBindings = result?.analyses?.[0]?.edge_bindings;
      
//       if (!edgeBindings) {
//         console.warn('No edge_bindings found');
//         return { 
//           inferredEdge: null, 
//           supportGraphs: [], 
//           error: 'No edge bindings found in this result' 
//         };
//       }

//       console.log('Edge bindings:', Object.keys(edgeBindings));
      
//       const firstEdgeBinding = Object.values(edgeBindings)[0] as any;
//       const inferredEdgeId = firstEdgeBinding?.[0]?.id;
      
//       console.log('Inferred edge ID:', inferredEdgeId);
      
//       if (!inferredEdgeId) {
//         return { 
//           inferredEdge: null, 
//           supportGraphs: [], 
//           error: 'No inferred edge ID found' 
//         };
//       }

//       if (!knowledgeGraph?.edges?.[inferredEdgeId]) {
//         console.warn(`Edge ${inferredEdgeId} not found in KG`);
//         return { 
//           inferredEdge: null, 
//           supportGraphs: [], 
//           error: `Edge ${inferredEdgeId} not found in knowledge graph` 
//         };
//       }

//       const edge = knowledgeGraph.edges[inferredEdgeId];
//       console.log('Found edge:', edge);
      
//       const supportGraphAttr = edge.attributes?.find(
//         (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
//       );

//       const supportGraphIds = supportGraphAttr?.value || [];
//       console.log('Support graph IDs:', supportGraphIds);

//       return {
//         inferredEdge: { id: inferredEdgeId, ...edge },
//         supportGraphs: supportGraphIds,
//         error: null,
//       };
//     } catch (err: any) {
//       console.error('Error in useMemo:', err);
//       return { 
//         inferredEdge: null, 
//         supportGraphs: [], 
//         error: `Error: ${err.message}` 
//       };
//     }
//   }, [result, knowledgeGraph, auxiliaryGraphs]);

//   // Parse a support graph to identify the three edge types
//   const parseSupportGraph = (supportGraphId: string): SupportGraphEdges | null => {
//     const auxGraph = auxiliaryGraphs[supportGraphId];
//     if (!auxGraph?.edges) return null;

//     let inf2enrichment = '';
//     let enrich2group = '';
//     let group2curie = '';

//     auxGraph.edges.forEach((edgeId: string) => {
//       const edge = knowledgeGraph.edges[edgeId];
//       if (!edge) return;

//       const hasSupport = edge.attributes?.some((attr: any) => attr.value);
      
//       if (hasSupport) {
//         const supportValue = edge.attributes.find((attr: any) => attr.value)?.value;
//         if (Array.isArray(supportValue)) {
//           enrich2group = edgeId;
//         } else {
//           group2curie = edgeId;
//         }
//       } else {
//         inf2enrichment = edgeId;
//       }
//     });

//     return { inf2enrichment, enrich2group, group2curie };
//   };

//   // Extract enrichment paths from the enrich2group edge
//   const getEnrichmentPaths = (enrichEdgeId: string) => {
//     const edge = knowledgeGraph.edges[enrichEdgeId];
//     if (!edge) return [];

//     const supportGraphAttr = edge.attributes?.find(
//       (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
//     );

//     const supportGraphIds = supportGraphAttr?.value || [];
    
//     return supportGraphIds.map((sgId: string, idx: number) => {
//       const auxGraph = auxiliaryGraphs[sgId];
//       if (!auxGraph?.edges || auxGraph.edges.length < 2) return null;

//       const edge0 = knowledgeGraph.edges[auxGraph.edges[0]];
//       const edge1 = knowledgeGraph.edges[auxGraph.edges[1]];

//       if (!edge0 || !edge1) return null;

//       // Get qualifiers
//       const getPredicateWithQualifiers = (e: any) => {
//         if (e.qualifiers && e.qualifiers.length > 0) {
//           const qualifierStr = e.qualifiers
//             .map((q: any) => q.qualifier_value)
//             .join('_');
//           return `${e.predicate}__${qualifierStr}`;
//         }
//         return e.predicate;
//       };

//       const predicate0 = getPredicateWithQualifiers(edge0);
//       const predicate1 = getPredicateWithQualifiers(edge1);

//       // Get p-value
//       const getPValue = (e: any) => {
//         const pvalAttr = e.attributes?.find(
//           (attr: any) => attr.attribute_type_id === 'biolink:p_value'
//         );
//         return pvalAttr?.value;
//       };

//       const pValue = getPValue(edge0) || getPValue(edge1);

//       return {
//         index: idx,
//         supportGraphId: sgId,
//         edge0: {
//           subject: knowledgeGraph.nodes[edge0.subject]?.name || edge0.subject,
//           predicate: predicate0,
//           object: knowledgeGraph.nodes[edge0.object]?.name || edge0.object,
//         },
//         edge1: {
//           subject: knowledgeGraph.nodes[edge1.subject]?.name || edge1.subject,
//           predicate: predicate1,
//           object: knowledgeGraph.nodes[edge1.object]?.name || edge1.object,
//         },
//         pValue,
//       };
//     }).filter(Boolean);
//   };

//   // Get group member paths from group2curie edge
//   const getGroupMemberPaths = (groupEdgeId: string) => {
//     const edge = knowledgeGraph.edges[groupEdgeId];
//     if (!edge) return [];

//     const supportGraphAttr = edge.attributes?.find(
//       (attr: any) => attr.value
//     );

//     if (!supportGraphAttr) return [];

//     const supportGraphId = supportGraphAttr.value;
//     const auxGraph = auxiliaryGraphs[supportGraphId];
    
//     if (!auxGraph?.edges) return [];

//     const sortedEdges = [...auxGraph.edges].sort();
//     const paths = [];
    
//     for (let j = 0; j < sortedEdges.length - 1; j += 2) {
//       const edge1 = knowledgeGraph.edges[sortedEdges[j]];
//       const edge2 = knowledgeGraph.edges[sortedEdges[j + 1]];

//       if (edge1 && edge2) {
//         paths.push({
//           index: Math.floor(j / 2) + 1,
//           edge1: {
//             subject: knowledgeGraph.nodes[edge1.subject]?.name || edge1.subject,
//             predicate: edge1.predicate,
//             object: knowledgeGraph.nodes[edge1.object]?.name || edge1.object,
//           },
//           edge2: {
//             subject: knowledgeGraph.nodes[edge2.subject]?.name || edge2.subject,
//             predicate: edge2.predicate,
//             object: knowledgeGraph.nodes[edge2.object]?.name || edge2.object,
//           },
//         });
//       }
//     }

//     return paths;
//   };

//   const toggleSupportGraph = (index: number) => {
//     const newExpanded = new Set(expandedSupportGraphs);
//     if (newExpanded.has(index)) {
//       newExpanded.delete(index);
//     } else {
//       newExpanded.add(index);
//     }
//     setExpandedSupportGraphs(newExpanded);
//   };

//   const toggleEnrichmentPath = (key: string) => {
//     const newExpanded = new Set(expandedEnrichmentPaths);
//     if (newExpanded.has(key)) {
//       newExpanded.delete(key);
//     } else {
//       newExpanded.add(key);
//     }
//     setExpandedEnrichmentPaths(newExpanded);
//   };

//   if (error) {
//     return (
//       <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
//         <div className="flex items-center gap-2 text-yellow-700 mb-2">
//           <AlertCircle className="w-5 h-5" />
//           <span className="font-semibold">Unable to load support graph</span>
//         </div>
//         <p className="text-sm text-yellow-600">{error}</p>
//         <details className="mt-2 text-xs text-gray-600">
//           <summary className="cursor-pointer hover:text-gray-900">Debug Info</summary>
//           <pre className="mt-2 p-2 bg-white rounded border border-gray-200 overflow-auto max-h-40">
//             {JSON.stringify({ 
//               hasResult: !!result,
//               hasAnalyses: !!result?.analyses,
//               hasEdgeBindings: !!result?.analyses?.[0]?.edge_bindings,
//               edgeBindingKeys: Object.keys(result?.analyses?.[0]?.edge_bindings || {}),
//               hasKnowledgeGraph: !!knowledgeGraph,
//               hasAuxGraphs: !!auxiliaryGraphs,
//               kgEdgeCount: Object.keys(knowledgeGraph?.edges || {}).length,
//               auxGraphCount: Object.keys(auxiliaryGraphs || {}).length,
//             }, null, 2)}
//           </pre>
//         </details>
//       </div>
//     );
//   }

//   if (!inferredEdge) {
//     return (
//       <div className="text-center text-gray-500 py-4">
//         <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
//         <p>No inferred edge found for this result</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       {/* Inferred Edge Summary */}
//       <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
//         <div className="flex items-center gap-2 mb-2">
//           <Network className="w-5 h-5 text-purple-600" />
//           <h4 className="font-semibold text-gray-900">Inferred Edge</h4>
//         </div>
//         <div className="text-sm">
//           <span className="font-medium text-gray-900">
//             {knowledgeGraph.nodes[inferredEdge.subject]?.name || inferredEdge.subject}
//           </span>
//           <span className="mx-2 text-purple-600">
//             {inferredEdge.predicate?.replace('biolink:', '')}
//           </span>
//           <span className="font-medium text-gray-900">
//             {knowledgeGraph.nodes[inferredEdge.object]?.name || inferredEdge.object}
//           </span>
//         </div>
//         <div className="mt-2 text-xs text-gray-600">
//           {supportGraphs.length} evidential path{supportGraphs.length !== 1 ? 's' : ''}
//         </div>
//       </div>

//       {/* Support Graphs */}
//       <div className="space-y-3">
//         <h5 className="font-semibold text-gray-900 flex items-center gap-2">
//           <TrendingUp className="w-4 h-4 text-blue-600" />
//           Support Graphs ({supportGraphs.length})
//         </h5>

//         {supportGraphs.map((sgId: string, sgIndex: number) => {
//           const edges = parseSupportGraph(sgId);
//           if (!edges) return null;

//           const isExpanded = expandedSupportGraphs.has(sgIndex);
//           const inf2enrichEdge = knowledgeGraph.edges[edges.inf2enrichment];
//           const enrich2groupEdge = knowledgeGraph.edges[edges.enrich2group];
//           const group2curieEdge = knowledgeGraph.edges[edges.group2curie];

//           return (
//             <div key={sgId} className="border border-gray-200 rounded-lg overflow-hidden">
//               {/* Support Graph Header */}
//               <button
//                 onClick={() => toggleSupportGraph(sgIndex)}
//                 className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
//               >
//                 <div className="flex items-center gap-2">
//                   <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
//                     Path {sgIndex + 1}
//                   </span>
//                   <span className="text-sm font-mono text-gray-600">{sgId}</span>
//                 </div>
//                 {isExpanded ? (
//                   <ChevronUp className="w-4 h-4 text-gray-500" />
//                 ) : (
//                   <ChevronDown className="w-4 h-4 text-gray-500" />
//                 )}
//               </button>

//               {isExpanded && (
//                 <div className="p-4 space-y-4">
//                   {/* Edge 1: Inferred Node → Enrichment */}
//                   {inf2enrichEdge && (
//                     <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
//                       <div className="flex items-center gap-2 mb-2">
//                         <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
//                         <span className="text-xs font-semibold text-yellow-800">
//                           Inferred Node → Enrichment
//                         </span>
//                       </div>
//                       <div className="text-sm text-gray-700">
//                         <span className="font-medium">
//                           {knowledgeGraph.nodes[inf2enrichEdge.subject]?.name || inf2enrichEdge.subject}
//                         </span>
//                         <span className="mx-2 text-yellow-600">
//                           ({inf2enrichEdge.predicate?.replace('biolink:', '')})
//                         </span>
//                         <span className="font-medium">
//                           {knowledgeGraph.nodes[inf2enrichEdge.object]?.name || inf2enrichEdge.object}
//                         </span>
//                       </div>
//                       <p className="text-xs text-gray-500 mt-2">
//                         <AlertCircle className="inline w-3 h-3 mr-1" />
//                         No further support graphs (endpoint)
//                       </p>
//                     </div>
//                   )}

//                   {/* Edge 2: Enrichment → Lookup List (Major AnswerCoalesce Module) */}
//                   {enrich2groupEdge && (
//                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
//                       <div className="flex items-center gap-2 mb-2">
//                         <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
//                         <span className="text-xs font-semibold text-blue-800">
//                           Enrichment → Lookup List (AnswerCoalesce)
//                         </span>
//                       </div>
//                       <div className="text-sm text-gray-700 mb-3">
//                         <span className="font-medium">
//                           {knowledgeGraph.nodes[enrich2groupEdge.subject]?.name || enrich2groupEdge.subject}
//                         </span>
//                         <span className="mx-2 text-blue-600">
//                           ({enrich2groupEdge.predicate?.replace('biolink:', '')})
//                         </span>
//                         <span className="font-medium">
//                           {knowledgeGraph.nodes[enrich2groupEdge.object]?.name || enrich2groupEdge.object}
//                         </span>
//                       </div>

//                       {/* Enrichment Paths */}
//                       <div className="space-y-2">
//                         {getEnrichmentPaths(edges.enrich2group).map((path: any) => {
//                           const pathKey = `${sgIndex}-${path.index}`;
//                           const isPathExpanded = expandedEnrichmentPaths.has(pathKey);

//                           return (
//                             <div key={path.index} className="bg-white border border-blue-200 rounded">
//                               <button
//                                 onClick={() => toggleEnrichmentPath(pathKey)}
//                                 className="w-full flex items-center justify-between p-2 hover:bg-blue-50 transition-colors"
//                               >
//                                 <div className="flex items-center gap-2">
//                                   <span className="text-xs font-mono text-blue-700">
//                                     Enrichment Path {path.index + 1}
//                                   </span>
//                                   {path.pValue && (
//                                     <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
//                                       p={path.pValue.toExponential(2)}
//                                     </span>
//                                   )}
//                                 </div>
//                                 {isPathExpanded ? (
//                                   <ChevronUp className="w-3 h-3 text-gray-500" />
//                                 ) : (
//                                   <ChevronDown className="w-3 h-3 text-gray-500" />
//                                 )}
//                               </button>

//                               {isPathExpanded && (
//                                 <div className="p-3 border-t border-blue-100 bg-blue-25 text-xs space-y-2">
//                                   <div className="flex items-center gap-2">
//                                     <span className="font-medium text-gray-700">{path.edge0.subject}</span>
//                                     <span className="text-blue-600">
//                                       ({path.edge0.predicate.replace('biolink:', '')})
//                                     </span>
//                                     <span className="font-medium text-gray-700">{path.edge0.object}</span>
//                                   </div>
//                                   <div className="text-center text-gray-400">∧</div>
//                                   <div className="flex items-center gap-2">
//                                     <span className="font-medium text-gray-700">{path.edge1.subject}</span>
//                                     <span className="text-blue-600">
//                                       ({path.edge1.predicate.replace('biolink:', '')})
//                                     </span>
//                                     <span className="font-medium text-gray-700">{path.edge1.object}</span>
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                     </div>
//                   )}

//                   {/* Edge 3: Group Set → Query CURIE */}
//                   {group2curieEdge && (
//                     <div className="bg-green-50 border border-green-200 rounded-lg p-3">
//                       <div className="flex items-center gap-2 mb-2">
//                         <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                         <span className="text-xs font-semibold text-green-800">
//                           Group Set → Query CURIE
//                         </span>
//                       </div>
//                       <div className="text-sm text-gray-700 mb-3">
//                         <span className="font-medium">
//                           {knowledgeGraph.nodes[group2curieEdge.subject]?.name || group2curieEdge.subject}
//                         </span>
//                         <span className="mx-2 text-green-600">
//                           ({group2curieEdge.predicate?.replace('biolink:', '')})
//                         </span>
//                         <span className="font-medium">
//                           {knowledgeGraph.nodes[group2curieEdge.object]?.name || group2curieEdge.object}
//                         </span>
//                       </div>

//                       {/* Group Member Paths */}
//                       <div className="space-y-1">
//                         <div className="flex items-center gap-2 mb-2">
//                           <Users className="w-3 h-3 text-green-600" />
//                           <span className="text-xs font-medium text-green-700">Group Members:</span>
//                         </div>
//                         {getGroupMemberPaths(edges.group2curie).map((path: any) => (
//                           <div key={path.index} className="bg-white border border-green-200 rounded p-2 text-xs">
//                             <div className="font-mono text-green-700 mb-1">Member Path {path.index}</div>
//                             <div className="flex items-center gap-2 text-gray-700">
//                               <span className="font-medium">{path.edge2.subject}</span>
//                               <span className="text-green-600">
//                                 ({path.edge2.predicate.replace('biolink:', '')})
//                               </span>
//                               <span className="font-medium">{path.edge2.object}</span>
//                             </div>
//                             <div className="text-center text-gray-400 my-1">∧</div>
//                             <div className="flex items-center gap-2 text-gray-700">
//                               <span className="font-medium">{path.edge1.subject}</span>
//                               <span className="text-green-600">
//                                 ({path.edge1.predicate.replace('biolink:', '')})
//                               </span>
//                               <span className="font-medium">{path.edge1.object}</span>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Network, TrendingUp, Users, AlertCircle } from 'lucide-react';

interface EDGARResultExplorerProps {
  result: any;
  knowledgeGraph: any;
  auxiliaryGraphs: any;
  resultIndex: number;
  lookupSetMembers?: Array<{ nodeId: string; nodeName: string }>; // Add lookup members
}

interface SupportGraphEdges {
  inf2enrichment: string;
  enrich2group: string;
  group2curie: string;
}

export const EDGARResultExplorer: React.FC<EDGARResultExplorerProps> = ({
  result,
  knowledgeGraph,
  auxiliaryGraphs,
  resultIndex,
  lookupSetMembers = [],
}) => {
  const [expandedSupportGraphs, setExpandedSupportGraphs] = useState<Set<number>>(new Set());
  const [expandedEnrichmentPaths, setExpandedEnrichmentPaths] = useState<Set<string>>(new Set());

  // Helper to get member names from a UUID node
  const getMemberNamesFromUUID = (uuidNodeId: string): string[] => {
    if (!uuidNodeId.startsWith('uuid:')) return [];
    
    // If we have lookupSetMembers passed in, use those
    if (lookupSetMembers.length > 0) {
      return lookupSetMembers.map(m => m.nodeName);
    }
    
    // Otherwise, try to find them from edges
    const memberNames: string[] = [];
    Object.entries(knowledgeGraph.edges || {}).forEach(([edgeId, edge]: [string, any]) => {
      // Look for member_of edges pointing to this UUID
      if (edge.predicate === 'biolink:member_of' && edge.object === uuidNodeId) {
        const memberNode = knowledgeGraph.nodes[edge.subject];
        if (memberNode?.name) {
          memberNames.push(memberNode.name);
        }
      }
    });
    
    return memberNames;
  };

  // Helper to display node name with member expansion for UUID nodes
  const NodeDisplay: React.FC<{ nodeId: string; className?: string }> = ({ nodeId, className = "" }) => {
    const node = knowledgeGraph.nodes[nodeId];
    const nodeName = node?.name || nodeId;
    
    if (nodeId.startsWith('uuid:')) {
      const members = getMemberNamesFromUUID(nodeId);
      if (members.length > 0) {
        return (
          <div className="inline-flex flex-col gap-1 bg-gray-50 border border-gray-300 rounded p-2">
            <span className="font-semibold text-gray-700 text-xs">Lookup Set ({members.length}):</span>
            <div className="flex flex-col gap-0.5 pl-2">
              {members.map((memberName, idx) => (
                <span key={idx} className="text-gray-900 text-sm">• {memberName}</span>
              ))}
            </div>
          </div>
        );
      }
    }
    
    return <span className={className}>{nodeName}</span>;
  };

  // Extract the inferred edge and its support graphs
  const { inferredEdge, supportGraphs, error } = useMemo(() => {
    try {
      const edgeBindings = result?.analyses?.[0]?.edge_bindings;
      
      if (!edgeBindings) {
        return { 
          inferredEdge: null, 
          supportGraphs: [], 
          error: 'No edge bindings found in this result' 
        };
      }
      
      const firstEdgeBinding = Object.values(edgeBindings)[0] as any;
      const inferredEdgeId = firstEdgeBinding?.[0]?.id;
      
      if (!inferredEdgeId) {
        return { 
          inferredEdge: null, 
          supportGraphs: [], 
          error: 'No inferred edge ID found' 
        };
      }

      if (!knowledgeGraph?.edges?.[inferredEdgeId]) {
        return { 
          inferredEdge: null, 
          supportGraphs: [], 
          error: `Edge ${inferredEdgeId} not found in knowledge graph` 
        };
      }

      const edge = knowledgeGraph.edges[inferredEdgeId];
      
      const supportGraphAttr = edge.attributes?.find(
        (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
      );

      const supportGraphIds = supportGraphAttr?.value || [];

      return {
        inferredEdge: { id: inferredEdgeId, ...edge },
        supportGraphs: supportGraphIds,
        error: null,
      };
    } catch (err: any) {
      return { 
        inferredEdge: null, 
        supportGraphs: [], 
        error: `Error: ${err.message}` 
      };
    }
  }, [result, knowledgeGraph, auxiliaryGraphs]);

  // Parse a support graph to identify the three edge types
  const parseSupportGraph = (supportGraphId: string): SupportGraphEdges | null => {
    const auxGraph = auxiliaryGraphs[supportGraphId];
    if (!auxGraph?.edges) return null;

    let inf2enrichment = '';
    let enrich2group = '';
    let group2curie = '';

    auxGraph.edges.forEach((edgeId: string) => {
      const edge = knowledgeGraph.edges[edgeId];
      if (!edge) return;

      const hasSupport = edge.attributes?.some((attr: any) => attr.value);
      
      if (hasSupport) {
        const supportValue = edge.attributes.find((attr: any) => attr.value)?.value;
        if (Array.isArray(supportValue)) {
          enrich2group = edgeId;
        } else {
          group2curie = edgeId;
        }
      } else {
        inf2enrichment = edgeId;
      }
    });

    return { inf2enrichment, enrich2group, group2curie };
  };

  // Extract enrichment paths from the enrich2group edge
  const getEnrichmentPaths = (enrichEdgeId: string) => {
    const edge = knowledgeGraph.edges[enrichEdgeId];
    if (!edge) return [];

    const supportGraphAttr = edge.attributes?.find(
      (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
    );

    const supportGraphIds = supportGraphAttr?.value || [];
    
    return supportGraphIds.map((sgId: string, idx: number) => {
      const auxGraph = auxiliaryGraphs[sgId];
      if (!auxGraph?.edges || auxGraph.edges.length < 2) return null;

      const edge0 = knowledgeGraph.edges[auxGraph.edges[0]];
      const edge1 = knowledgeGraph.edges[auxGraph.edges[1]];

      if (!edge0 || !edge1) return null;

      const getPredicateWithQualifiers = (e: any) => {
        if (e.qualifiers && e.qualifiers.length > 0) {
          const qualifierStr = e.qualifiers
            .map((q: any) => q.qualifier_value)
            .join('_');
          return `${e.predicate}__${qualifierStr}`;
        }
        return e.predicate;
      };

      const predicate0 = getPredicateWithQualifiers(edge0);
      const predicate1 = getPredicateWithQualifiers(edge1);

      const getPValue = (e: any) => {
        const pvalAttr = e.attributes?.find(
          (attr: any) => attr.attribute_type_id === 'biolink:p_value'
        );
        return pvalAttr?.value;
      };

      const pValue = getPValue(edge0) || getPValue(edge1);

      return {
        index: idx,
        supportGraphId: sgId,
        edge0: {
          subject: knowledgeGraph.nodes[edge0.subject]?.name || edge0.subject,
          predicate: predicate0,
          object: knowledgeGraph.nodes[edge0.object]?.name || edge0.object,
        },
        edge1: {
          subject: knowledgeGraph.nodes[edge1.subject]?.name || edge1.subject,
          predicate: predicate1,
          object: knowledgeGraph.nodes[edge1.object]?.name || edge1.object,
        },
        pValue,
      };
    }).filter(Boolean);
  };

  // Get group member paths from group2curie edge
  const getGroupMemberPaths = (groupEdgeId: string) => {
    const edge = knowledgeGraph.edges[groupEdgeId];
    if (!edge) return [];

    const supportGraphAttr = edge.attributes?.find(
      (attr: any) => attr.value
    );

    if (!supportGraphAttr) return [];

    const supportGraphId = supportGraphAttr.value;
    const auxGraph = auxiliaryGraphs[supportGraphId];
    
    if (!auxGraph?.edges) return [];

    const sortedEdges = [...auxGraph.edges].sort();
    const paths = [];
    
    for (let j = 0; j < sortedEdges.length - 1; j += 2) {
      const edge1 = knowledgeGraph.edges[sortedEdges[j]];
      const edge2 = knowledgeGraph.edges[sortedEdges[j + 1]];

      if (edge1 && edge2) {
        paths.push({
          index: Math.floor(j / 2) + 1,
          edge1: {
            subject: knowledgeGraph.nodes[edge1.subject]?.name || edge1.subject,
            predicate: edge1.predicate,
            object: knowledgeGraph.nodes[edge1.object]?.name || edge1.object,
          },
          edge2: {
            subject: knowledgeGraph.nodes[edge2.subject]?.name || edge2.subject,
            predicate: edge2.predicate,
            object: knowledgeGraph.nodes[edge2.object]?.name || edge2.object,
          },
        });
      }
    }

    return paths;
  };

  const toggleSupportGraph = (index: number) => {
    const newExpanded = new Set(expandedSupportGraphs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSupportGraphs(newExpanded);
  };

  const toggleEnrichmentPath = (key: string) => {
    const newExpanded = new Set(expandedEnrichmentPaths);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEnrichmentPaths(newExpanded);
  };

  if (error) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Unable to load support graph</span>
        </div>
        <p className="text-sm text-yellow-700">{error}</p>
      </div>
    );
  }

  if (!inferredEdge) {
    return (
      <div className="text-center text-gray-500 py-8">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>No inferred edge found for this result</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inferred Edge Summary - Using chip style */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Inferred Edge</h4>
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg">
            <span className="text-sm font-medium text-gray-900">
              {knowledgeGraph.nodes[inferredEdge.subject]?.name || inferredEdge.subject}
            </span>
          </span>
          <span className="inline-flex items-center px-3 py-1.5 bg-purple-50 border-2 border-purple-300 rounded-lg">
            <span className="text-sm font-medium text-purple-700">
              {inferredEdge.predicate?.replace('biolink:', '')}
            </span>
          </span>
          <span className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg">
            <span className="text-sm font-medium text-gray-900">
              {knowledgeGraph.nodes[inferredEdge.object]?.name || inferredEdge.object}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
          <TrendingUp className="w-4 h-4" />
          <span>{supportGraphs.length} evidential path{supportGraphs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Support Graphs */}
      <div className="space-y-3">
        <h5 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
          <span className="w-1 h-5 bg-blue-600 rounded"></span>
          Support Graphs ({supportGraphs.length})
        </h5>

        {supportGraphs.map((sgId: string, sgIndex: number) => {
          const edges = parseSupportGraph(sgId);
          if (!edges) return null;

          const isExpanded = expandedSupportGraphs.has(sgIndex);
          const inf2enrichEdge = knowledgeGraph.edges[edges.inf2enrichment];
          const enrich2groupEdge = knowledgeGraph.edges[edges.enrich2group];
          const group2curieEdge = knowledgeGraph.edges[edges.group2curie];

          return (
            <div key={sgId} className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
              {/* Support Graph Header */}
              <button
                onClick={() => toggleSupportGraph(sgIndex)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">
                    Path {sgIndex + 1}
                  </span>
                  <span className="text-sm font-mono text-gray-500">{sgId.substring(0, 20)}...</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4 bg-white">
                  {/* Edge 1: Inferred Node → Enrichment */}
                  {inf2enrichEdge && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-yellow-900">
                          Inferred Node → Enrichment
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 bg-white border border-yellow-300 rounded text-sm font-medium text-gray-900">
                          <NodeDisplay nodeId={inf2enrichEdge.subject} />
                        </span>
                        <span className="text-yellow-600 text-sm font-medium">
                          {inf2enrichEdge.predicate?.replace('biolink:', '')}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-white border border-yellow-300 rounded text-sm font-medium text-gray-900">
                          <NodeDisplay nodeId={inf2enrichEdge.object} />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-yellow-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Direct edge (no further support)</span>
                      </div>
                    </div>
                  )}

                  {/* Edge 2: Enrichment → Lookup List */}
                  {enrich2groupEdge && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-blue-900">
                          Enrichment → Lookup List
                        </span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-medium">
                          AnswerCoalesce
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="inline-flex items-center px-2.5 py-1 bg-white border border-blue-300 rounded text-sm font-medium text-gray-900">
                          <NodeDisplay nodeId={enrich2groupEdge.subject} />
                        </span>
                        <span className="text-blue-600 text-sm font-medium">
                          {enrich2groupEdge.predicate?.replace('biolink:', '')}
                        </span>
                        <NodeDisplay nodeId={enrich2groupEdge.object} />
                      </div>

                      {/* Enrichment Paths */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-blue-700 mb-2">
                          Enrichment Paths ({getEnrichmentPaths(edges.enrich2group).length})
                        </div>
                        {getEnrichmentPaths(edges.enrich2group).map((path: any) => {
                          const pathKey = `${sgIndex}-${path.index}`;
                          const isPathExpanded = expandedEnrichmentPaths.has(pathKey);

                          return (
                            <div key={path.index} className="bg-white border-2 border-blue-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleEnrichmentPath(pathKey)}
                                className="w-full flex items-center justify-between p-3 hover:bg-blue-50 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono text-blue-700 font-semibold">
                                    Path {path.index + 1}
                                  </span>
                                  {path.pValue && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                      p-value: {path.pValue.toExponential(2)}
                                    </span>
                                  )}
                                </div>
                                {isPathExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>

                              {isPathExpanded && (
                                <div className="p-3 border-t-2 border-blue-100 bg-blue-50 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className="font-medium text-gray-900">{path.edge0.subject}</span>
                                    <span className="text-blue-600 font-medium text-xs">
                                      {path.edge0.predicate.replace('biolink:', '')}
                                    </span>
                                    <span className="font-medium text-gray-900">{path.edge0.object}</span>
                                  </div>
                                  <div className="text-center text-gray-400 text-sm">∧</div>
                                  <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className="font-medium text-gray-900">{path.edge1.subject}</span>
                                    <span className="text-blue-600 font-medium text-xs">
                                      {path.edge1.predicate.replace('biolink:', '')}
                                    </span>
                                    <span className="font-medium text-gray-900">{path.edge1.object}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Edge 3: Lookup Set → Query Input */}
                  {group2curieEdge && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-green-900">
                          Lookup Set → Query Input
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <NodeDisplay nodeId={group2curieEdge.subject} />
                        <span className="text-green-600 text-sm font-medium">
                          {group2curieEdge.predicate?.replace('biolink:', '')}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-white border border-green-300 rounded text-sm font-medium text-gray-900">
                          <NodeDisplay nodeId={group2curieEdge.object} />
                        </span>
                      </div>

                      {/* Group Member Paths */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">
                            Member Paths ({getGroupMemberPaths(edges.group2curie).length})
                          </span>
                        </div>
                        {getGroupMemberPaths(edges.group2curie).map((path: any) => (
                          <div key={path.index} className="bg-white border-2 border-green-200 rounded-lg p-3">
                            <div className="font-mono text-green-700 text-xs mb-2 font-semibold">
                              Member {path.index}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap text-sm">
                                <span className="font-medium text-gray-900">{path.edge2.subject}</span>
                                <span className="text-green-600 font-medium text-xs">
                                  {path.edge2.predicate.replace('biolink:', '')}
                                </span>
                                <span className="font-medium text-gray-900">{path.edge2.object}</span>
                              </div>
                              <div className="text-center text-gray-400 text-sm">∧</div>
                              <div className="flex items-center gap-2 flex-wrap text-sm">
                                <span className="font-medium text-gray-900">{path.edge1.subject}</span>
                                <span className="text-green-600 font-medium text-xs">
                                  {path.edge1.predicate.replace('biolink:', '')}
                                </span>
                                <span className="font-medium text-gray-900">{path.edge1.object}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};