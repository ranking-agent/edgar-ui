import React, { useEffect, useRef, useState, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
// @ts-ignore
import klay from 'cytoscape-klay';
// @ts-ignore
import dagre from 'cytoscape-dagre';
// @ts-ignore
import avsdf from 'cytoscape-avsdf';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

Cytoscape.use(klay);
Cytoscape.use(dagre);
Cytoscape.use(avsdf);

interface ResultPathViewerProps {
  result: any;
  knowledgeGraph: any;
  queryGraph: any;
  auxiliaryGraphs?: any;
  resultIndex?: number;
  allResults?: any[];
}

// Layout configurations - INCREASED SPACING
const padding = 90;
const spacingFactor = 2.5;
const animationDuration = 500;

const layoutList = {
  preset: {
    name: 'elk',
    label: 'columnar',
    fit: false,
    padding: padding,
    animate: false,
    nodePlacement: 'LINEAR_SEGMENTS',
    edgeSpacingFactor: spacingFactor,
    nodeLayering: 'NETWORK_SIMPLEX',
    spacing: 100,
  },
  dagre: {
    name: 'dagre',
    label: 'dagre horizontal',
    rankDir: 'LR',
    nodeSep: 150,
    rankSep: 300,
    edgeSep: 100,
    ranker: 'network-simplex',
    minLen: function(edge: any) { return 1; },
    animate: true,
    animationDuration: animationDuration,
    fit: true,
    padding: padding,
  },
  klay: {
    name: 'klay',
    label: 'vertical',
    klay: {
      direction: 'LEFT',
      nodePlacement: 'LINEAR_SEGMENTS',
      edgeSpacingFactor: spacingFactor,
      nodeLayering: 'NETWORK_SIMPLEX',
      spacing: 100,
    },
    fit: true,
    padding: padding,
    animate: true,
    animationDuration: animationDuration,
  },
  breadthfirst: {
    name: 'breadthfirst',
    label: 'horizontal',
    directed: true,
    padding: padding,
    spacingFactor: 3.0,
    animate: true,
    animationDuration: animationDuration,
    fit: true,
    avoidOverlap: true,
  },
  concentric: {
    name: 'concentric',
    label: 'concentric',
    fit: true,
    padding: padding,
    minNodeSpacing: 120,
    avoidOverlap: true,
    spacingFactor: 3.0,
    levelWidth: () => 2,
    animate: true,
    animationDuration: animationDuration,
    nodeRepulsion: 15000,
    idealEdgeLength: 280,
  },
};

type LayoutKey = keyof typeof layoutList;

const DEFAULT_COLOR = '#7f8c8d';

const getNodeColor = (nodeType: string): string => {
  const typeColors: Record<string, string> = {
    'set': '#fef08a',
    'intermediate': '#86efac',
    'query': '#93c5fd',
    'result': '#d8b4fe',
  };
  return typeColors[nodeType] || DEFAULT_COLOR;
};

export const ResultPathViewer: React.FC<ResultPathViewerProps> = ({
  result,
  knowledgeGraph,
  queryGraph,
  auxiliaryGraphs,
  resultIndex = 0,
  allResults = [],
}) => {
  const cyRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutKey>('preset');
  const [layoutTrigger, setLayoutTrigger] = useState(0);

  // AUTO-SCROLL TO TOP when result changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resultIndex, result]);

  const querySetInfo = useMemo(() => {
    const setIds = new Set<string>();
    const memberIds = new Set<string>();
    
    Object.values(queryGraph.nodes || {}).forEach((node: any) => {
      if (node.ids && Array.isArray(node.ids)) {
        node.ids.forEach((id: string) => setIds.add(id));
      }
      if (node.member_ids && Array.isArray(node.member_ids)) {
        node.member_ids.forEach((id: string) => memberIds.add(id));
      }
    });
    
    return { setIds, memberIds };
  }, [queryGraph]);

  const resultSubgraph = useMemo(() => {
    let resultsToProcess = [result];
    
    if (allResults && allResults.length > 0) {
      try {
        const allQueryNodeIds = new Set<string>([...querySetInfo.setIds, ...querySetInfo.memberIds]);
        const nodeBindings = result.node_bindings || {};
        
        let currentOutputNodeId = '';
        for (const bindings of Object.values(nodeBindings)) {
          for (const binding of bindings as any[]) {
            if (!allQueryNodeIds.has(binding.id)) {
              currentOutputNodeId = binding.id;
              break;
            }
          }
          if (currentOutputNodeId) break;
        }
        
        resultsToProcess = allResults.filter((r, idx) => {
          const rNodeBindings = r.node_bindings || {};
          let rOutputNodeId = '';
          
          for (const bindings of Object.values(rNodeBindings)) {
            for (const binding of bindings as any[]) {
              if (!allQueryNodeIds.has(binding.id)) {
                rOutputNodeId = binding.id;
                break;
              }
            }
            if (rOutputNodeId) break;
          }
          
          return rOutputNodeId === currentOutputNodeId;
        });
      } catch (error) {
        console.error('Error finding matching results:', error);
        resultsToProcess = [result];
      }
    }
    
    return extractResultSubgraph(resultsToProcess, knowledgeGraph, querySetInfo, auxiliaryGraphs);
  }, [result, allResults, knowledgeGraph, querySetInfo, auxiliaryGraphs, resultIndex]);

  useEffect(() => {
    const cyElements = convertToCytoscapeFormat(resultSubgraph);
    setElements(cyElements);
    hasInitialized.current = false;
  }, [resultSubgraph]);

  useEffect(() => {
    if (!cyRef.current || elements.length === 0) return;
    
    const cy = cyRef.current;
    
    const timeoutId = setTimeout(() => {
      cy.stop();
      
      if (currentLayout === 'preset') {
        elements.forEach(el => {
          if (el.data.type === 'node' && el.position) {
            const node = cy.getElementById(el.data.id);
            if (node.length > 0) {
              node.position(el.position);
            }
          }
        });
        
        cy.resize();
        cy.fit(undefined, 50);
        cy.center();
      } else {
        const layout = cy.layout(layoutList[currentLayout]);
        layout.run();
        
        layout.one('layoutstop', () => {
          cy.fit(undefined, 50);
          cy.center();
        });
      }
      
      hasInitialized.current = true;
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [currentLayout, layoutTrigger]);

  const handleElementClick = (event: any) => {
    const element = event.target;
    if (element.isNode() || element.isEdge()) {
      setSelectedElement(element.data());
    } else {
      setSelectedElement(null);
    }
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.3);
      cyRef.current.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.7);
      cyRef.current.center();
    }
  };

  const handleResetView = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
      cyRef.current.center();
    }
  };

  const handleDeselectAll = () => {
    if (cyRef.current) {
      cyRef.current.elements().unselect();
      setSelectedElement(null);
    }
  };

  const handleDownloadPNG = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ full: true, scale: 3 });
      const link = document.createElement('a');
      link.href = png;
      link.download = `result-${resultIndex + 1}-path.png`;
      link.click();
    }
  };

  // MUCH LARGER NODES AND EDGES - using numeric values
  const cytoscapeStylesheet: any[] = [
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': 280,
        'height': 100,
        'text-valign': 'center',
        'text-halign': 'center',
        'padding': 20,
        'font-size': 34,
        'font-weight': 'bold',
        'color': '#1e293b',
        'text-wrap': 'wrap',
        'text-max-width': 20,
        'border-width': 9,
        'border-color': '#475569',
        'text-outline-width': 0,
      },
    },
    {
      selector: 'node[nodeType="set"]',
      style: {
        'background-color': '#fef9c3',
        'border-width': 4,
        'border-color': '#ca8a04',
      },
    },
    {
      selector: 'node[nodeType="query"]',
      style: {
        'background-color': '#dbeafe',
        'border-width': 4,
        'border-color': '#2563eb',
      },
    },
    {
      selector: 'node[nodeType="intermediate"]',
      style: {
        'background-color': '#dcfce7',
        'border-width': 4,
        'border-color': '#16a34a',
      },
    },
    {
      selector: 'node[nodeType="result"]',
      style: {
        'background-color': '#f3e8ff',
        'border-width': 4,
        'border-color': '#9333ea',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 6,
        'border-color': '#0ea5e9',
        'overlay-opacity': 0.2,
        'overlay-color': '#0ea5e9',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 15,
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 2.5,
        'curve-style': 'unbundled-bezier',  // Auto-bundles parallel edges   or bezier
        'control-point-step-size': 100,  // Spacing for parallel edges
        'label': 'data(label)',
        'font-size': 30,
        'font-weight': 600,
        'text-rotation': 'autorotate',
        'text-margin-y': -15,
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.95,
        'text-background-padding': 6,
        'text-background-shape': 'roundrectangle',
        'color': '#1e293b',
      },
    },
    {
      selector: 'edge[edgeType="main"]',
      style: {
        'width': 7,
        'line-color': '#1e293b',
        'target-arrow-color': '#1e293b',
        'line-style': 'dashed',
        'line-dash-pattern': [15, 8],
      },
    },
    {
      selector: 'edge[edgeType="support"]',
      style: {
        'width': 4,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 7,
        'line-color': '#0ea5e9',
        'target-arrow-color': '#0ea5e9',
      },
    },
    {
      selector: '.hide',
      style: {
        'opacity': 0.2,
      },
    },
  ];

  const score = result.analyses?.[0]?.score;
  const pValue = resultSubgraph.mainEdge?.attributes?.find(
    (attr: any) => attr.attribute_type_id === 'biolink:p_value'
  )?.value;
  
  const capitalizeAllWords = (str: string) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {score !== undefined && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-medium mb-1">Score</div>
            <div className="text-xl font-bold text-purple-900">{score.toFixed(4)}</div>
          </div>
        )}
        {pValue !== undefined && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs text-red-600 font-medium mb-1">P-value</div>
            <div className="text-xl font-bold text-red-900">{pValue.toExponential(2)}</div>
          </div>
        )}
      </div>
      
      {/* Layout Buttons */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Layout:</span>
            {(Object.keys(layoutList) as LayoutKey[]).map((key) => {
              const name = layoutList[key].label;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentLayout(key);
                    setLayoutTrigger(prev => prev + 1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    currentLayout === key
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {capitalizeAllWords(name)}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> PNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
            {/* Zoom controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                className="p-3 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-3 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={handleResetView}
                className="p-3 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={handleDeselectAll}
                className="p-3 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Deselect All"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Graph Container - LARGER */}
            <div
              className="bg-slate-50 border-2 border-purple-200 rounded-xl overflow-hidden"
              style={{ height: '750px' }}
            >
              {elements.length > 0 ? (
                <CytoscapeComponent
                  elements={elements}
                  stylesheet={cytoscapeStylesheet}
                  layout={{ name: 'preset' }}
                  cy={(cy) => {
                    cyRef.current = cy;
                    cy.userZoomingEnabled(false);
                    cy.minZoom(0.1);
                    cy.maxZoom(3);
                    
                    cy.on('tap', 'node, edge', handleElementClick);
                    cy.on('tap', (event: any) => {
                      if (event.target === cy) {
                        setSelectedElement(null);
                      }
                    });
                    
                    // Z key for zoom
                    const handleKeyDown = (e: KeyboardEvent) => {
                      if (e.key === 'z' || e.key === 'Z') {
                        cy.userZoomingEnabled(true);
                      }
                    };
                    const handleKeyUp = (e: KeyboardEvent) => {
                      if (e.key === 'z' || e.key === 'Z') {
                        cy.userZoomingEnabled(false);
                      }
                    };
                    window.addEventListener('keydown', handleKeyDown);
                    window.addEventListener('keyup', handleKeyUp);
                    
                    // Initial fit after a short delay
                    setTimeout(() => {
                      cy.fit(undefined, 50);
                      cy.center();
                    }, 300);
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">No path data available</p>
                    <p className="text-sm">Unable to extract support graph for this result</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Zoom hint */}
            <div className="mt-2 text-center text-sm text-gray-500">
              Hold <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Z</kbd> + scroll to zoom
            </div>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-3">Legend</h5>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Nodes:</div>
                <div className="space-y-2">
                  {elements.some(el => el.data.nodeType === 'set') && (
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-10 rounded-lg bg-yellow-100 border-2 border-yellow-600 flex items-center justify-center">
                        <span className="text-xs text-gray-800 font-bold">Input</span>
                      </div>
                      <span className="text-sm text-gray-700">Input Node(s)</span>
                    </div>
                  )}
                  {elements.some(el => el.data.nodeType === 'query') && (
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-10 rounded-lg bg-blue-100 border-2 border-blue-600 flex items-center justify-center">
                        <span className="text-xs text-gray-800 font-bold">Enrich</span>
                      </div>
                      <span className="text-sm text-gray-700">Enrichment</span>
                    </div>
                  )}
                  {elements.some(el => el.data.nodeType === 'intermediate') && (
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-10 rounded-lg bg-green-100 border-2 border-green-600 flex items-center justify-center">
                        <span className="text-xs text-gray-800 font-bold">Lookup</span>
                      </div>
                      <span className="text-sm text-gray-700">Lookup Set</span>
                    </div>
                  )}
                  {elements.some(el => el.data.nodeType === 'result') && (
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-10 rounded-lg bg-purple-100 border-2 border-purple-600 flex items-center justify-center">
                        <span className="text-xs text-gray-800 font-bold">Output</span>
                      </div>
                      <span className="text-sm text-gray-700">Result Node</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Element Details */}
          {selectedElement && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h5 className="font-semibold text-gray-900 mb-3">
                {selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}
              </h5>

              {selectedElement.type === 'node' ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <p className="text-gray-600 mt-1 break-words">{selectedElement.fullName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <p className="text-xs text-gray-600 mt-1 break-all font-mono bg-gray-50 p-2 rounded">
                      {selectedElement.id}
                    </p>
                  </div>
                  {selectedElement.categories && selectedElement.categories.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Categories:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedElement.categories.slice(0, 3).map((cat: string) => (
                          <span key={cat} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {cat.replace('biolink:', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                     <span className="font-medium text-gray-700">Connection:</span>
                     <p className="text-xs text-gray-600 mt-1 break-all">
                       {selectedElement.source} → {selectedElement.target}
                     </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Predicate:</span>
                    <p className="mt-1">
                      <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        {selectedElement.predicate?.replace('biolink:', '').replace(/_/g, ' ')}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function extractResultSubgraph(
  results: any[],
  knowledgeGraph: any,
  querySetInfo: { setIds: Set<string>; memberIds: Set<string> },
  auxiliaryGraphs: any
) {
  try {
    const allEdges: any[] = [];
    const uuidToMembers = new Map<string, Set<string>>();
    const memberToUuid = new Map<string, string>();
    let mainEdge: any = null;

    const boundNodeIds = new Set<string>();
    const allQueryNodeIds = new Set<string>([...querySetInfo.setIds, ...querySetInfo.memberIds]);
    
    results.forEach((result) => {
      const nodeBindings = result.node_bindings || {};
      Object.entries(nodeBindings).forEach(([queryId, bindings]: [string, any]) => {
        (bindings || []).forEach((binding: any) => {
          boundNodeIds.add(binding.id);
        });
      });
    });

    results.forEach((result) => {
      const analyses = result.analyses || [];
      
      if (analyses.length > 0) {
        const edgeBindings = analyses[0].edge_bindings || {};

        Object.entries(edgeBindings).forEach(([queryEdgeId, bindings]: [string, any]) => {
          if (!bindings || bindings.length === 0) return;
          
          (bindings || []).forEach((binding: any) => {
            const edgeId = binding.id;
            if (!knowledgeGraph || !knowledgeGraph.edges) return;
            
            const edge = knowledgeGraph.edges?.[edgeId];
            if (!edge) return;
            
            if (!mainEdge) mainEdge = edge;

            allEdges.push({
              id: edgeId,
              source: edge.subject,
              target: edge.object,
              predicate: edge.predicate,
              edgeType: 'main',
              attributes: edge.attributes,
            });

            const supportGraphAttrs = edge.attributes?.filter(
              (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
            ) || [];
            
            supportGraphAttrs.forEach((supportGraphAttr: any) => {
              const supportGraphValue = supportGraphAttr?.value;
              const supportGraphIds = Array.isArray(supportGraphValue) 
                ? supportGraphValue 
                : [supportGraphValue];
              
              supportGraphIds.forEach((supportGraphId: string) => {
                if (!supportGraphId || !auxiliaryGraphs) return;
                
                const auxGraph = auxiliaryGraphs?.[supportGraphId];
                if (!auxGraph) return;
                
                if (auxGraph.edges) {
                  auxGraph.edges.forEach((supportEdgeId: string) => {
                    const supportEdge = knowledgeGraph.edges?.[supportEdgeId];
                    
                    if (supportEdge) {
                      allEdges.push({
                        id: supportEdgeId,
                        source: supportEdge.subject,
                        target: supportEdge.object,
                        predicate: supportEdge.predicate,
                        edgeType: 'support',
                        attributes: supportEdge.attributes,
                      });
                    }
                  });
                }
              });
            });
          });
        });
      }
    });

    const mainSupportGraphEdges = new Set<string>();
    
    results.forEach(result => {
      const analyses = result.analyses || [];
      if (analyses.length > 0) {
        const edgeBindings = analyses[0].edge_bindings || {};
        Object.entries(edgeBindings).forEach(([queryEdgeId, bindings]: [string, any]) => {
          (bindings || []).forEach((binding: any) => {
            const edgeId = binding.id;
            const edge = knowledgeGraph.edges?.[edgeId];
            if (!edge) return;
            
            const supportGraphAttrs = edge.attributes?.filter(
              (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
            ) || [];
            
            supportGraphAttrs.forEach((supportGraphAttr: any) => {
              const supportGraphValue = supportGraphAttr?.value;
              const supportGraphIds = Array.isArray(supportGraphValue) 
                ? supportGraphValue 
                : [supportGraphValue];
              
              supportGraphIds.forEach((supportGraphId: string) => {
                if (!supportGraphId) return;
                const auxGraph = auxiliaryGraphs?.[supportGraphId];
                if (auxGraph?.edges) {
                  auxGraph.edges.forEach((auxEdgeId: string) => {
                    mainSupportGraphEdges.add(auxEdgeId);
                  });
                }
              });
            });
          });
        });
      }
    });
    
    mainSupportGraphEdges.forEach(edgeId => {
      const edge = knowledgeGraph.edges?.[edgeId];
      if (!edge) return;
      
      const nestedSgAttr = edge.attributes?.find(
        (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
      );
      
      if (nestedSgAttr?.value) {
        const nestedSgValue = nestedSgAttr.value;
        const nestedSgIds = Array.isArray(nestedSgValue) 
          ? nestedSgValue 
          : [nestedSgValue];
        
        nestedSgIds.forEach((nestedSgId: string) => {
          const nestedAuxGraph = auxiliaryGraphs?.[nestedSgId];
          if (!nestedAuxGraph?.edges) return;
          
          nestedAuxGraph.edges.forEach((nestedEdgeId: string) => {
            const nestedEdge = knowledgeGraph.edges?.[nestedEdgeId];
            if (!nestedEdge) return;
            
            const targetIsUuid = nestedEdge.object && nestedEdge.object.startsWith('uuid:');
            const sourceIsUuid = nestedEdge.subject && nestedEdge.subject.startsWith('uuid:');
            
            if (targetIsUuid) {
              if (!uuidToMembers.has(nestedEdge.object)) {
                uuidToMembers.set(nestedEdge.object, new Set());
              }
              uuidToMembers.get(nestedEdge.object)!.add(nestedEdge.subject);
              memberToUuid.set(nestedEdge.subject, nestedEdge.object);
            } 
            else if (sourceIsUuid) {
              if (!uuidToMembers.has(nestedEdge.subject)) {
                uuidToMembers.set(nestedEdge.subject, new Set());
              }
              uuidToMembers.get(nestedEdge.subject)!.add(nestedEdge.object);
              memberToUuid.set(nestedEdge.object, nestedEdge.subject);
            }
            else {
              const alreadyExists = allEdges.some(e => e.id === nestedEdgeId);
              if (!alreadyExists) {
                allEdges.push({
                  id: nestedEdgeId,
                  source: nestedEdge.subject,
                  target: nestedEdge.object,
                  predicate: nestedEdge.predicate,
                  edgeType: 'support',
                  attributes: nestedEdge.attributes,
                });
              }
            }
          });
        });
      }
    });

    const nodeSet = new Set<string>();
    allEdges.forEach(edge => {
      if (!edge.source.startsWith('uuid:')) {
        nodeSet.add(edge.source);
      } else {
        const members = uuidToMembers.get(edge.source);
        if (members) {
          members.forEach(m => nodeSet.add(m));
        }
      }
      
      if (!edge.target.startsWith('uuid:')) {
        nodeSet.add(edge.target);
      } else {
        const members = uuidToMembers.get(edge.target);
        if (members) {
          members.forEach(m => nodeSet.add(m));
        }
      }
    });

    const nodeDetails: any[] = [];
    nodeSet.forEach(nodeId => {
      const node = knowledgeGraph.nodes?.[nodeId];
      let nodeType = 'query';
      
      if (allQueryNodeIds.has(nodeId)) {
        nodeType = 'set';
      } else if (memberToUuid.has(nodeId)) {
        nodeType = 'intermediate';
      } else if (boundNodeIds.has(nodeId) && !allQueryNodeIds.has(nodeId)) {
        nodeType = 'result';
      }
      
      nodeDetails.push({
        id: nodeId,
        name: node?.name || nodeId,
        categories: node?.categories || [],
        attributes: node?.attributes || [],
        nodeType: nodeType,
      });
    });

    const finalEdges: any[] = [];
    
    allEdges.forEach(edge => {
      if (edge.edgeType === 'main') return;
      if (edge.predicate === 'biolink:member_of') return;

      const sourceIsUuid = edge.source.startsWith('uuid:');
      const targetIsUuid = edge.target.startsWith('uuid:');

      if (sourceIsUuid || targetIsUuid) return;

      finalEdges.push(edge);
    });

    return {
      nodes: nodeDetails,
      edges: finalEdges,
      mainEdge: mainEdge,
      pathCount: results.length,
    };
  } catch (error) {
    console.error('Error in extractResultSubgraph:', error);
    return {
      nodes: [],
      edges: [],
      mainEdge: null,
    };
  }
}

function convertToCytoscapeFormat(subgraph: any) {
  const elements: any[] = [];

  const nodesByType: Record<string, any[]> = {
    set: [],
    query: [],
    intermediate: [],
    result: []
  };

  subgraph.nodes.forEach((node: any) => {
    const nodeType = node.nodeType || 'query';
    if (!nodesByType[nodeType]) {
      nodesByType['query'].push(node);
    } else {
      nodesByType[nodeType].push(node);
    }
  });

  const columnRanks: Record<string, number> = {
    set: 0,
    intermediate: 1,
    query: 2,
    result: 3
  };

  // MUCH WIDER column spacing
  const columnPositions: Record<string, number> = {
    set: 300,
    intermediate: 1000,
    query: 1800,
    result: 2500
  };

  const maxNodesInColumn = Math.max(
    nodesByType.set.length,
    nodesByType.intermediate.length,
    nodesByType.query.length,
    nodesByType.result.length
  );
  
  const nodeSpacing = 250; // LARGER vertical spacing
  const totalHeight = maxNodesInColumn * nodeSpacing;
  
  subgraph.nodes.forEach((node: any) => {
    let label = node.name || node.id;
    if (label.length > 30) {
      label = label.substring(0, 27) + '...';
    }

    const nodeType = node.nodeType || 'query';
    const typeNodes = nodesByType[nodeType] || nodesByType['query'];
    const nodeIndex = typeNodes.findIndex(n => n.id === node.id);
    
    const nodesInThisColumn = typeNodes.length;
    const columnHeight = nodesInThisColumn * nodeSpacing;
    const verticalOffset = (totalHeight - columnHeight) / 2;
    
    const yPosition = 150 + verticalOffset + (nodeIndex * nodeSpacing);
    const xPosition = columnPositions[nodeType] || columnPositions['query'];
    
    const nodeColor = getNodeColor(nodeType);

    elements.push({
      data: {
        id: node.id,
        label: label,
        fullName: node.name || node.id,
        type: 'node',
        categories: node.categories,
        nodeType: node.nodeType,
        color: nodeColor,
        rank: columnRanks[nodeType] || 2,
      },
      position: {
        x: xPosition,
        y: yPosition
      },
      classes: `column-${nodeType}`
    });
  });

  subgraph.edges.forEach((edge: any) => {
    const predicateLabel = edge.predicate 
      ? edge.predicate.replace('biolink:', '').replace(/_/g, ' ') 
      : 'related to';

    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: predicateLabel,
        type: 'edge',
        predicate: edge.predicate,
        edgeType: edge.edgeType,
        sources: edge.sources,
        attributes: edge.attributes,
      },
    });
  });

  return elements;
}