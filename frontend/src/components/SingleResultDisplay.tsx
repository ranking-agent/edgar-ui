import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SingleResultDisplayProps {
  result: any;
  knowledgeGraph: any;
  queryGraph: any;
  auxiliaryGraphs: any;
}

export const SingleResultDisplay: React.FC<SingleResultDisplayProps> = ({
  result,
  knowledgeGraph,
  queryGraph,
  auxiliaryGraphs,
}) => {
  console.log('=== SingleResultDisplay rendering ===');
  console.log('Result:', result);
  console.log('KG:', knowledgeGraph ? 'present' : 'missing');
  console.log('QG:', queryGraph ? 'present' : 'missing');
  console.log('Aux:', auxiliaryGraphs ? 'present' : 'missing');

  try {
    // Get all query node IDs
    const allNodeIds = Object.entries(queryGraph?.nodes || {}).flatMap(
      ([nodeKey, nodeVal]: [string, any]) => nodeVal.ids ?? []
    );

    console.log('Query node IDs:', allNodeIds);

    const renderSupportGraph = (sgId: string) => {
      console.log('Rendering support graph:', sgId);
      const auxGraph = auxiliaryGraphs?.[sgId];
      if (!auxGraph) {
        console.warn('Auxiliary graph not found:', sgId);
        return null;
      }

      const edges = auxGraph.edges || [];
      const via = sgId.includes('via_')
        ? sgId.split('via_')[1].replace(/_/g, '-').replace('biolink:', '')
        : sgId;

      return (
        <div key={sgId} className="bg-white border border-gray-200 rounded p-3 text-sm">
          <div className="font-mono text-xs text-gray-500 mb-2">VIA: {via}</div>
          <div className="space-y-1 text-xs">
            {edges.slice(0, 3).map((edgeId: string, idx: number) => {
              const e = knowledgeGraph?.edges[edgeId];
              if (!e) return null;

              const subj = knowledgeGraph?.nodes[e.subject]?.name || e.subject;
              const obj = knowledgeGraph?.nodes[e.object]?.name || e.object;
              const pred = e.predicate?.replace('biolink:', '');

              return (
                <div key={idx} className="text-gray-700">
                  {subj} <span className="text-blue-600">→ {pred} →</span> {obj}
                </div>
              );
            })}
            {edges.length > 3 && (
              <div className="text-gray-500">... and {edges.length - 3} more edges</div>
            )}
          </div>
        </div>
      );
    };

    // Get edge ID
    const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
    const firstEdgeBindingKey = Object.keys(edgeBindings)[0];
    const edgeId = firstEdgeBindingKey ? edgeBindings[firstEdgeBindingKey]?.[0]?.id : undefined;

    console.log('Edge ID:', edgeId);
    console.log('Edge bindings:', edgeBindings);

    return (
      <div className="space-y-4">
        {!edgeId ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            No edge binding found for this result
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(result.analyses?.[0]?.edge_bindings || {}, null, 2)}
            </pre>
          </div>
        ) : (() => {
          try {
            const edge = knowledgeGraph?.edges?.[edgeId];
            console.log('Edge:', edge);
            
            if (!edge) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Edge not found: {edgeId}
                </div>
              );
            }

            const supportGraphAttrs = edge.attributes?.filter(
              (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
            ) || [];
            
            // Flatten all support graph IDs from all attributes
            const supportGraphs = supportGraphAttrs.flatMap((attr: any) =>
              Array.isArray(attr.value) ? attr.value : [attr.value]
            ).filter(Boolean);

            console.log('Support graphs:', supportGraphs);

            return (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="font-semibold text-blue-900 mb-2">Inferred Edge</div>
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Subject:</strong>{' '}
                      {knowledgeGraph?.nodes[edge.subject]?.name || edge.subject}
                    </div>
                    <div>
                      <strong>Predicate:</strong>{' '}
                      <span className="text-blue-700">
                        {edge.predicate?.replace('biolink:', '') || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <strong>Object:</strong>{' '}
                      {knowledgeGraph?.nodes[edge.object]?.name || edge.object}
                    </div>
                  </div>
                </div>

                {supportGraphs.length > 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="font-semibold text-green-900 mb-3">
                      Support Graphs ({supportGraphs.length})
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {supportGraphs.map((sgId: string, sgIdx: number) =>
                        renderSupportGraph(sgId) || (
                          <div key={sgIdx} className="text-xs text-gray-500">
                            Support graph {sgId} not found
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
                    No support graphs found for this edge
                  </div>
                )}
              </>
            );
          } catch (err) {
            console.error('Error rendering edge details:', err);
            return (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Error displaying edge details: {String(err)}
              </div>
            );
          }
        })()}
      </div>
    );
  } catch (err) {
    console.error('Error in SingleResultDisplay:', err);
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <AlertTriangle className="w-4 h-4 inline mr-2" />
        <strong>Fatal Error:</strong> {String(err)}
      </div>
    );
  }
};