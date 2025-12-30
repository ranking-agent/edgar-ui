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
// import { useMargin } from 'recharts';

Cytoscape.use(klay);
Cytoscape.use(dagre);
Cytoscape.use(avsdf);

interface ResultPathViewerProps {
  result: any;
  knowledgeGraph: any;
  queryGraph: any;
  auxiliaryGraphs?: any;
  resultIndex?: number;
  allResults?: any[]; // NEW: All results to find matching paths
}

// Layout configurations matching ARAX UI
const padding = 10;
const spacingFactor = 1.0
const animationDuration = 500
const layoutList = {
  preset: {
    name: 'preset',
    label: 'columnar',
    fit: true,
    padding: padding,
    animate: false, // No animation - positions are exact
  },
  dagre: {
    name: 'dagre',
    label: 'dagre horizontal',
    rankDir: 'LR', // Left to right
    nodeSep: padding*2, // Vertical spacing between nodes
    rankSep: animationDuration/2, // Horizontal spacing between columns - increased
    ranker: 'network-simplex',
    minLen: function(edge: any) {
      // Force edges to span at least 1 rank to prevent column collapse
      return 1;
    },
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
      spacing: padding,
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
    spacingFactor: spacingFactor,
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
    minNodeSpacing: padding,
    avoidOverlap: true,
    spacingFactor: spacingFactor,
    levelWidth: () => 2,
    animate: true,
    animationDuration: animationDuration,
  },
};

type LayoutKey = keyof typeof layoutList;

// const CATEGORY_COLORS: Record<string, string> = {
//   'biolink:Disease': '#e74c3c',
//   'biolink:Drug': '#3498db',
//   'biolink:ChemicalEntity': '#9b59b6',
//   'biolink:SmallMolecule': '#8e44ad',
//   'biolink:Gene': '#2ecc71',
//   'biolink:Protein': '#1abc9c',
//   'biolink:BiologicalProcess': '#f39c12',
//   'biolink:MolecularActivity': '#d35400',
//   'biolink:CellularComponent': '#16a085',
//   'biolink:Pathway': '#e67e22',
//   'biolink:Phenotype': '#95a5a6',
//   'biolink:PhenotypicFeature': '#95a5a6',
//   'biolink:AnatomicalEntity': '#34495e',
// };

const DEFAULT_COLOR = '#7f8c8d';

// Helper function to get color based on node type
const getNodeColor = (nodeType: string): string => {
  const typeColors: Record<string, string> = {
    'set': '#fef08a',       // yellow-200 - Input
    'intermediate': '#86efac', // green-300 - Lookup
    'query': '#93c5fd',     // blue-300 - Enrichment
    'result': '#d8b4fe',    // purple-300 - Output
  };
  
  return typeColors[nodeType] || DEFAULT_COLOR;
};

export const ResultPathViewer: React.FC<ResultPathViewerProps> = ({
  result,
  knowledgeGraph,
  queryGraph,
  auxiliaryGraphs,
  resultIndex = 0,
  allResults = [], // NEW: Default to empty array
}) => {
  const cyRef = useRef<any>(null);
  const hasInitialized = useRef(false);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutKey>('preset');
  const [layoutTrigger, setLayoutTrigger] = useState(0); // Counter to force layout re-run

  // Extract query set IDs and their member IDs from queryGraph
  const querySetInfo = useMemo(() => {
    const setIds = new Set<string>();
    const memberIds = new Set<string>();
    
    Object.values(queryGraph.nodes || {}).forEach((node: any) => {
      // Add set IDs (from 'ids' field)
      if (node.ids && Array.isArray(node.ids)) {
        node.ids.forEach((id: string) => setIds.add(id));
      }
      // Add member IDs (actual query node IDs)
      if (node.member_ids && Array.isArray(node.member_ids)) {
        node.member_ids.forEach((id: string) => memberIds.add(id));
      }
    });
    
    return { setIds, memberIds };
  }, [queryGraph]);

  const resultSubgraph = useMemo(() => {
    // If we have allResults, find all results with the same output node
    let resultsToProcess = [result];
    
    if (allResults && allResults.length > 0) {
      try {
        console.log(`=== Searching for matching results among ${allResults.length} total results ===`);
        
        // Get the output node ID from current result
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
        
        console.log('Current result output node:', currentOutputNodeId);
        console.log('Query node IDs:', Array.from(allQueryNodeIds));
        
        // Find ALL results with the same output node
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
          
          const matches = rOutputNodeId === currentOutputNodeId;
          console.log(`  Checking result ${idx}: output=${rOutputNodeId}, matches=${matches}`);
          return matches;
        });
        
        console.log(`✓ Found ${resultsToProcess.length} results with output: ${currentOutputNodeId}`);
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
    
    // Debounce to prevent rapid re-runs
    const timeoutId = setTimeout(() => {
      console.log(`Running layout: ${currentLayout}`);
      
      // Stop any running layouts
      cy.stop();
      
      if (currentLayout === 'preset') {
        console.log('Restoring preset positions');
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
    }, 150); // Debounce
    
    return () => clearTimeout(timeoutId);
  }, [currentLayout, layoutTrigger]); // REMOVED elements dependency!

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
      cyRef.current.zoom(cyRef.current.zoom() * 1.15);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.85);
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
      const png = cyRef.current.png({ full: true, scale: 2 });
      const link = document.createElement('a');
      link.href = png;
      link.download = `result-${resultIndex + 1}-path.png`;
      link.click();
    }
  };

  const cytoscapeStylesheet: any[] = [
    {
      selector: 'node',
      style: {
        'shape': 'ellipse', // Circular nodes
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': '100px',
        'height': '80px',
        'text-valign': 'center',
        'text-halign': 'center',
        'padding': '10px',
        'font-size': '15px',
        'font-weight': 'bold',
        'color': '#000',
        'text-wrap': 'wrap',
        'text-max-width': '70px',
        'border-width': '3px',
        'border-color': '#000',
      },
    },
    {
      selector: 'node[nodeType="set"]',
      style: {
        'background-color': '#fefce8', // yellow-50 - Input nodes
        'border-width': '2px',
        'border-color': '#fde047', // yellow-300
      },
    },
    {
      selector: 'node[nodeType="query"]',
      style: {
        'background-color': '#eff6ff', // blue-50 - SWAPPED: query gets BLUE for enrichment
        'border-width': '2px',
        'border-color': '#60a5fa', // blue-400
      },
    },
    {
      selector: 'node[nodeType="intermediate"]',
      style: {
        'background-color': '#f0fdf4', // green-50 - SWAPPED: intermediate gets GREEN for lookup
        'border-width': '2px',
        'border-color': '#86efac', // green-300
      },
    },
    {
      selector: 'node[nodeType="result"]',
      style: {
        'background-color': '#faf5ff', // purple-50 - Output nodes (result )
        'border-width': '2px',
        'border-color': '#d8b4fe', // purple-300
        'color': '#000', // Black text
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': '2px',
        'border-color': '#3498db',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#95a5a6',
        'target-arrow-color': '#95a5a6',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.5,
        'curve-style': 'unbundled-bezier', // Better curves for multiple edges
        'control-point-distances': [50], // Distance from edge midpoint
        'control-point-weights': [0.5], // Position along edge (0=source, 1=target)
        'label': 'data(label)',
        'font-size': '15px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.8,
        'text-background-padding': '3px',
        'color': '#2c3e50',
      },
    },
    {
      selector: 'edge[edgeType="main"]',
      style: {
        'width': 3,
        'line-color': '#242424',
        'target-arrow-color': '#242424',
        'line-style': 'dashed',
        'line-dash-pattern': [20, 5],
      },
    },
    {
      selector: 'edge[edgeType="support"]',
      style: {
        'width': 2,
        'line-color': '#CED0D0',
        'target-arrow-color': '#CED0D0',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 3,
        'line-color': '#3498db',
        'target-arrow-color': '#3498db',
      },
    },
    {
      selector: 'edge.highlight',
      style: {
        'line-color': '#242424',
        'opacity': 1.0,
        'target-arrow-color': '#242424',
      },
    },
    {
      selector: '.hide',
      style: {
        'opacity': 0.3,
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
    <div className="space-y-4">
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
      
      {/* Scrollable Layout Buttons - ROBOKOP Style */}
      <div className="mb-3">
        <div className="grid grid-cols-2 ">
          {/* Left column - Layout buttons */}
          <div className="flex items-center gap-1 min-w-max">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap mr-1">Layout:</span>
            {(Object.keys(layoutList) as LayoutKey[]).map((key) => {
              const name = layoutList[key].label;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentLayout(key);
                    setLayoutTrigger(prev => prev + 1); // Force layout to re-run
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    currentLayout === key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {capitalizeAllWords(name)}
                </button>
              );
            })}
          </div>
          {/* Right column - PNG button */}
          <div className="flex justify-end items-center">
            <button
              onClick={handleDownloadPNG}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> PNG
            </button>
          </div>
        </div>
      </div>
      {/* <hr /> */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
            {/* Floating vertical buttons on left side - ROBOKOP style */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={handleResetView}
                className="p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={handleDeselectAll}
                className="p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-300 transition-colors"
                title="Deselect All"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              className="bg-white-50 border-2 border-gray-200 rounded-lg overflow-hidden cytoscape-container"
              style={{ height: '500px' }}
            >
              {elements.length > 0 ? (
                <CytoscapeComponent
                  elements={elements}
                  stylesheet={cytoscapeStylesheet}
                  layout={{ name: 'preset' }} // Use preset initially, useEffect will handle actual layout
                  cy={(cy) => {
                    cyRef.current = cy;
                    console.log('Cytoscape initialized with', cy.elements().length, 'elements');
                    cy.userZoomingEnabled(false);
                    cy.on('tap', 'node, edge', handleElementClick);
                    cy.on('tap', (event: any) => {
                      if (event.target === cy) {
                        setSelectedElement(null);
                      }
                    });
                    
                    // Z key for zoom
                    let zoomKeyDown = false;
                    const handleKeyDown = (e: KeyboardEvent) => {
                      if (e.key === 'z' || e.key === 'Z') {
                        zoomKeyDown = true;
                        cy.userZoomingEnabled(true);
                      }
                    };
                    const handleKeyUp = (e: KeyboardEvent) => {
                      if (e.key === 'z' || e.key === 'Z') {
                        zoomKeyDown = false;
                        cy.userZoomingEnabled(false);
                      }
                    };
                    window.addEventListener('keydown', handleKeyDown);
                    window.addEventListener('keyup', handleKeyUp);
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
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-3 text-sm">Legend</h5>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Nodes:</div>
                <div className="space-y-2">
                  {/* Dynamically show only node types that exist in the graph */}
                  {/* FIXED: Legend now matches CSS colors */}
                  {elements.some(el => el.data.nodeType === 'set') && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-7 rounded bg-yellow-50 border-2 border-yellow-300 flex items-center justify-center">
                        <span className="text-[11px] text-black font-bold">Input</span>
                      </div>
                      <span className="text-xs text-gray-700">Input Node(s)</span>
                    </div>
                  )}
                  {elements.some(el => el.data.nodeType === 'query') && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-7 rounded bg-blue-50 border-2 border-blue-400 flex items-center justify-center">
                        <span className="text-[11px] text-black font-bold">Enrich</span>
                      </div>
                      <span className="text-xs text-gray-700">Enrichment</span>
                    </div>
                  )}
                  {elements.some(el => el.data.nodeType === 'intermediate') && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-7 rounded bg-green-50 border-2 border-green-300 flex items-center justify-center">
                        <span className="text-[11px] text-black font-bold">Lookup</span>
                      </div>
                      <span className="text-xs text-gray-700">Lookup Set</span>
                    </div>
                  )}
                  {elements.some(el => el.data.nodeType === 'result') && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-7 rounded bg-purple-50 border-2 border-purple-300 flex items-center justify-center">
                        <span className="text-[11px] text-black font-bold">Output</span>
                      </div>
                      <span className="text-xs text-gray-700">Result Node</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {selectedElement && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h5 className="font-semibold text-gray-900 mb-3 text-sm">
                {selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}
              </h5>

              {selectedElement.type === 'node' ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <p className="text-gray-600 mt-1 break-words">{selectedElement.fullName}</p>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <p className="text-xs text-gray-600 mt-1 break-all font-mono">
                      {selectedElement.id}
                    </p>
                  </div>

                  {selectedElement.categories && selectedElement.categories.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Categories:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.categories.slice(0, 3).map((cat: string) => (
                          <div
                            key={cat}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded break-words"
                          >
                            {cat.replace('biolink:', '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Connection:</span>
                    <p className="text-xs text-gray-600 mt-1 break-all">
                      {selectedElement.source} → {selectedElement.target}
                    </p>
                  </div>

                  {selectedElement.predicate && (
                    <div>
                      <span className="font-medium text-gray-700">Predicate:</span>
                      <div className="mt-1">
                        <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded break-words">
                          {selectedElement.predicate.replace('biolink:', '')}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedElement.edgeType && (
                    <div>
                      <span className="font-medium text-gray-700">Edge Type:</span>
                      <span
                        className={`ml-2 text-xs px-2 py-1 rounded ${
                          selectedElement.edgeType === 'main'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {selectedElement.edgeType}
                      </span>
                    </div>
                  )}

                  {selectedElement.sources && selectedElement.sources.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Sources:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.sources.map((source: any, idx: number) => (
                          <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {source.resource_id?.replace('infores:', '')} ({source.resource_role})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
  results: any[], // Changed from single result to array of results
  knowledgeGraph: any,
  querySetInfo: { setIds: Set<string>; memberIds: Set<string> },
  auxiliaryGraphs: any
) {
  try {
    console.log('=== extractResultSubgraph START ===');
    console.log('ASSUMPTIONS (Hard Rules):');
    console.log('  1. UUID nodes: Any node ID starting with "uuid:"');
    console.log('  2. Member edges: Any edge with predicate "biolink:member_of" (skipped in output)');
    console.log('  3. Support graphs: Attribute "biolink:support_graphs" (can be string OR array)');
    console.log('  4. Membership: ANY edge to/from uuid:* in nested support graph = member');
    console.log('  5. Node types: Assigned by STRUCTURE only (no predicate/category assumptions)');
    console.log('NO ASSUMPTIONS about:');
    console.log('  - Specific predicates (works with ANY relationship type)');
    console.log('  - Node categories (works with ANY entity type)');
    console.log('  - Edge directions (works subject→object or object→subject)');
    console.log('  - Support graph value format (handles both string and array)');
    console.log(`Processing ${results.length} results`);
    console.log('Query Set Info:', querySetInfo);
    console.log('Auxiliary Graphs keys:', Object.keys(auxiliaryGraphs || {}).length);
    
    const allEdges: any[] = []; // Collect ALL edges first
    const uuidToMembers = new Map<string, Set<string>>(); // UUID -> Set of member IDs
    const memberToUuid = new Map<string, string>(); // Member ID -> UUID it belongs to
    let mainEdge: any = null;

    const boundNodeIds = new Set<string>();
    const allQueryNodeIds = new Set<string>([...querySetInfo.setIds, ...querySetInfo.memberIds]);
    
    // Collect bound node IDs from ALL results
    results.forEach((result, resultIdx) => {
      console.log(`\n=== Processing result ${resultIdx} ===`);
      const nodeBindings = result.node_bindings || {};
      Object.entries(nodeBindings).forEach(([queryId, bindings]: [string, any]) => {
        (bindings || []).forEach((binding: any) => {
          boundNodeIds.add(binding.id);
        });
      });
    });

    console.log('Bound node IDs:', Array.from(boundNodeIds));
    console.log('\n=== SET CONTENTS ===');
    console.log('allQueryNodeIds (INPUT - should be YELLOW):', Array.from(allQueryNodeIds));
    console.log('boundNodeIds (BOUND - includes both input and output):', Array.from(boundNodeIds));
    console.log('OUTPUT nodes = boundNodeIds - allQueryNodeIds');

  // STEP 1: Collect ALL edges from ALL support graphs from ALL results
  results.forEach((result, resultIdx) => {
    console.log(`\n=== RESULT ${resultIdx} - Collecting edges ===`);
    console.log('Result structure:', JSON.stringify(result, null, 2).substring(0, 500));
    
    const analyses = result.analyses || [];
    console.log(`  Analyses count: ${analyses.length}`);
    
    if (analyses.length > 0) {
      const edgeBindings = analyses[0].edge_bindings || {};
      console.log(`  Edge bindings:`, edgeBindings);

      Object.entries(edgeBindings).forEach(([queryEdgeId, bindings]: [string, any]) => {
        console.log(`  Query edge: ${queryEdgeId}, bindings count: ${bindings?.length || 0}`);
        
        if (!bindings || bindings.length === 0) {
          console.log(`    WARNING: No bindings for query edge ${queryEdgeId}`);
          return;
        }
        
        (bindings || []).forEach((binding: any, bindingIdx: number) => {
          const edgeId = binding.id;
          console.log(`    Binding ${bindingIdx}: edgeId = ${edgeId}`);
          
          if (!knowledgeGraph || !knowledgeGraph.edges) {
            console.log(`    ERROR: Knowledge graph or edges is missing`);
            return;
          }
          
          const edge = knowledgeGraph.edges?.[edgeId];
          
          if (!edge) {
            console.log(`    ERROR: Edge ${edgeId} not found in knowledge graph`);
            console.log(`    Available edge IDs (first 5):`, Object.keys(knowledgeGraph.edges).slice(0, 5));
            return;
          }

          console.log(`    Edge found: ${edge.subject} --[${edge.predicate}]--> ${edge.object}`);
          console.log(`    Edge attributes:`, edge.attributes?.map((a: any) => a.attribute_type_id));
          
          if (!mainEdge) mainEdge = edge;

          allEdges.push({
            id: edgeId,
            source: edge.subject,
            target: edge.object,
            predicate: edge.predicate,
            edgeType: 'main',
            attributes: edge.attributes,
          });

          // Get ALL support graph attributes (there can be multiple paths)
          const supportGraphAttrs = edge.attributes?.filter(
            (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
          ) || [];
          
          if (supportGraphAttrs.length === 0) {
            console.log(`    WARNING: No support_graphs attributes found`);
            return;
          }
          
          console.log(`    Found ${supportGraphAttrs.length} support graph(s)`);
          
          // Process EACH support graph (each represents a different path)
          supportGraphAttrs.forEach((supportGraphAttr: any, sgIdx: number) => {
            // CRITICAL: Handle both string and array values
            const supportGraphValue = supportGraphAttr?.value;
            const supportGraphIds = Array.isArray(supportGraphValue) 
              ? supportGraphValue 
              : [supportGraphValue]; // Normalize to array
            
            supportGraphIds.forEach((supportGraphId: string, idIdx: number) => {
              console.log(`    Support graph ${sgIdx + 1}.${idIdx + 1} ID: ${supportGraphId}`);

              if (!supportGraphId) {
                console.log(`    ERROR: Support graph ID is empty`);
                return;
              }
            
            if (!auxiliaryGraphs) {
              console.log(`    ERROR: auxiliaryGraphs is missing or null`);
              return;
            }
            
            const auxGraph = auxiliaryGraphs?.[supportGraphId];
            
            if (!auxGraph) {
              console.log(`    ERROR: Aux graph not found for key: ${supportGraphId}`);
              console.log(`    Available aux graph keys (first 10):`, Object.keys(auxiliaryGraphs).slice(0, 10));
              return;
            }

            console.log(`    Aux graph found! Contains ${auxGraph.edges?.length || 0} edges`);
            
            if (auxGraph.edges) {
              auxGraph.edges.forEach((supportEdgeId: string, seIdx: number) => {
                const supportEdge = knowledgeGraph.edges?.[supportEdgeId];
                
                if (supportEdge) {
                  console.log(`      Edge ${seIdx}: ${supportEdge.subject} --[${supportEdge.predicate}]--> ${supportEdge.object}`);
                  
                  allEdges.push({
                    id: supportEdgeId,
                    source: supportEdge.subject,
                    target: supportEdge.object,
                    predicate: supportEdge.predicate,
                    edgeType: 'support',
                    attributes: supportEdge.attributes,
                  });
                } else {
                  console.log(`      ERROR: Support edge ${supportEdgeId} not found`);
                }
              });
            }
            }); // Close supportGraphIds.forEach
          }); // Close supportGraphAttrs.forEach
        });
      });
    } else {
      console.log(`  ERROR: No analyses found in result`);
    }
  });

  console.log(`\n=== STEP 1 COMPLETE: Collected ${allEdges.length} total edges ===`);

  // STEP 2: Identify UUID nodes and their members from nested support graphs
  console.log('\n=== STEP 2: Identifying UUID nodes and members ===');
  console.log('RULE: Any node connected to uuid:* in a nested support graph is a member');
  console.log('RULE: Predicate-agnostic - works with ANY relationship type');
  
  // Strategy: 
  // 1. Find all first-level support graph edges
  // 2. For each first-level edge WITH nested support graphs:
  //    - Any node connected to uuid:* (in either direction, any predicate) = member
  
  const mainSupportGraphEdges = new Set<string>();
  
  // Collect ALL edges from first-level support graphs
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
            // CRITICAL: Handle both string and array values
            const supportGraphValue = supportGraphAttr?.value;
            const supportGraphIds = Array.isArray(supportGraphValue) 
              ? supportGraphValue 
              : [supportGraphValue]; // Normalize to array
            
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
  
  console.log(`Found ${mainSupportGraphEdges.size} edges in first-level support graphs`);
  
  // Now check each first-level edge for nested support graphs
  // ANY connection to uuid:* in nested graphs = membership (predicate-agnostic)
  mainSupportGraphEdges.forEach(edgeId => {
    const edge = knowledgeGraph.edges?.[edgeId];
    if (!edge) return;
    
    const nestedSgAttr = edge.attributes?.find(
      (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
    );
    
    if (nestedSgAttr?.value) {
      // CRITICAL: Handle both string and array values
      const nestedSgValue = nestedSgAttr.value;
      const nestedSgIds = Array.isArray(nestedSgValue) 
        ? nestedSgValue 
        : [nestedSgValue]; // Normalize to array
      
      console.log(`Edge ${edgeId} has ${nestedSgIds.length} nested support graph(s)`);
      
      nestedSgIds.forEach((nestedSgId: string) => {
        const nestedAuxGraph = auxiliaryGraphs?.[nestedSgId];
        if (!nestedAuxGraph?.edges) return;
        
        nestedAuxGraph.edges.forEach((nestedEdgeId: string) => {
          const nestedEdge = knowledgeGraph.edges?.[nestedEdgeId];
          if (!nestedEdge) return;
          
          // PREDICATE-AGNOSTIC: Check if EITHER endpoint is a UUID
          const targetIsUuid = nestedEdge.object && nestedEdge.object.startsWith('uuid:');
          const sourceIsUuid = nestedEdge.subject && nestedEdge.subject.startsWith('uuid:');
          
          if (targetIsUuid) {
            // subject → uuid:* (ANY predicate)
            console.log(`  Member found: ${nestedEdge.subject} --[${nestedEdge.predicate}]--> ${nestedEdge.object}`);
            
            if (!uuidToMembers.has(nestedEdge.object)) {
              uuidToMembers.set(nestedEdge.object, new Set());
            }
            uuidToMembers.get(nestedEdge.object)!.add(nestedEdge.subject);
            memberToUuid.set(nestedEdge.subject, nestedEdge.object);
          } 
          else if (sourceIsUuid) {
            // uuid:* → object (ANY predicate)
            console.log(`  Member found: ${nestedEdge.object} <--[${nestedEdge.predicate}]-- ${nestedEdge.subject}`);
            
            if (!uuidToMembers.has(nestedEdge.subject)) {
              uuidToMembers.set(nestedEdge.subject, new Set());
            }
            uuidToMembers.get(nestedEdge.subject)!.add(nestedEdge.object);
            memberToUuid.set(nestedEdge.object, nestedEdge.subject);
          }
          else {
            // Regular edge (not involving UUID) - add for visualization
            const alreadyExists = allEdges.some(e => e.id === nestedEdgeId);
            if (!alreadyExists) {
              console.log(`  Supporting edge: ${nestedEdge.subject} --[${nestedEdge.predicate}]--> ${nestedEdge.object}`);
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

  console.log(`Found ${uuidToMembers.size} UUID nodes:`);
  uuidToMembers.forEach((members, uuid) => {
    console.log(`  ${uuid} has ${members.size} members:`, Array.from(members).slice(0, 5));
  });

  // STEP 3: Build final node list (excluding UUID nodes, including their members)
  console.log('\n=== STEP 3: Building node list ===');
  
  const nodeSet = new Set<string>();
  allEdges.forEach(edge => {
    // Add source if not UUID
    if (!edge.source.startsWith('uuid:')) {
      nodeSet.add(edge.source);
    } else {
      // Add all members of this UUID instead
      const members = uuidToMembers.get(edge.source);
      if (members) {
        members.forEach(m => nodeSet.add(m));
      }
    }
    
    // Add target if not UUID
    if (!edge.target.startsWith('uuid:')) {
      nodeSet.add(edge.target);
    } else {
      // Add all members of this UUID instead
      const members = uuidToMembers.get(edge.target);
      if (members) {
        members.forEach(m => nodeSet.add(m));
      }
    }
  });

  console.log(`Collected ${nodeSet.size} unique nodes (excluding UUIDs)`);

  // Create node details with proper types
  console.log('\n=== STEP 3.5: Assigning node types ===');
  console.log('RULE: Node type assignment is STRUCTURE-BASED only:');
  console.log('  - "set" (yellow) = nodes in allQueryNodeIds (from query graph)');
  console.log('  - "intermediate" (green) = nodes in memberToUuid (connected to uuid in nested SG)');
  console.log('  - "result" (purple) = nodes in boundNodeIds but NOT in allQueryNodeIds');
  console.log('  - "query" (blue) = everything else (enrichment connectors)');
  console.log('RULE: No assumptions about predicates, categories, or node types');
  
  const nodeDetails: any[] = [];
  nodeSet.forEach(nodeId => {
    const node = knowledgeGraph.nodes?.[nodeId];
    let nodeType = 'query'; // Default: enrichment nodes
    
    console.log(`\n  Node: ${nodeId} (${node?.name || 'unknown'})`);
    console.log(`    In allQueryNodeIds? ${allQueryNodeIds.has(nodeId)}`);
    console.log(`    In memberToUuid? ${memberToUuid.has(nodeId)}`);
    console.log(`    In boundNodeIds? ${boundNodeIds.has(nodeId)}`);
    
    // Assignment based PURELY on structure
    if (allQueryNodeIds.has(nodeId)) {
      nodeType = 'set'; // Input nodes (YELLOW)
      console.log(`    ✓ ASSIGNED: INPUT (set) → YELLOW (in query graph)`);
    } else if (memberToUuid.has(nodeId)) {
      nodeType = 'intermediate'; // Lookup Set members (GREEN)
      console.log(`    ✓ ASSIGNED: LOOKUP (intermediate) → GREEN (connected to uuid)`);
    } else if (boundNodeIds.has(nodeId) && !allQueryNodeIds.has(nodeId)) {
      nodeType = 'result'; // Output nodes (PURPLE)
      console.log(`    ✓ ASSIGNED: OUTPUT (result) → PURPLE (in node_bindings, not in query)`);
    } else {
      nodeType = 'query'; // Enrichment nodes (BLUE)
      console.log(`    ✓ ASSIGNED: ENRICHMENT (query) → BLUE (connects lookup to output)`);
    }
    
    nodeDetails.push({
      id: nodeId,
      name: node?.name || nodeId,
      categories: node?.categories || [],
      attributes: node?.attributes || [],
      nodeType: nodeType,
    });
  });

  // STEP 4: Build final edge list
  console.log('\n=== STEP 4: Building edge list ===');
  console.log('RULE: Skip edges where edgeType=main (inferred edges)');
  console.log('RULE: Skip edges with predicate=biolink:member_of (metadata only)');
  console.log('RULE: Skip edges with uuid:* as source OR target (membership indicators)');
  console.log('RULE: Keep ALL other edges between real nodes (these show the actual relationships)');
  
  const finalEdges: any[] = [];
  
  allEdges.forEach(edge => {
    // Rule 1: Skip main/inferred edges
    if (edge.edgeType === 'main') {
      console.log(`Skipping: main/inferred edge ${edge.source} → ${edge.target}`);
      return;
    }

    // Rule 2: Skip member_of edges (they're just metadata)
    if (edge.predicate === 'biolink:member_of') {
      console.log(`Skipping: member_of edge ${edge.source} → ${edge.target}`);
      return;
    }

    // Rule 3: Skip edges involving uuid nodes
    const sourceIsUuid = edge.source.startsWith('uuid:');
    const targetIsUuid = edge.target.startsWith('uuid:');

    if (sourceIsUuid || targetIsUuid) {
      console.log(`Skipping: UUID edge ${edge.source} --[${edge.predicate}]--> ${edge.target}`);
      return;
    }

    // Rule 4: Keep all edges between real nodes
    console.log(`Keeping: ${edge.source} --[${edge.predicate}]--> ${edge.target}`);
    finalEdges.push(edge);
  });

  console.log(`\n=== FINAL SUMMARY ===`);
  console.log(`Nodes: ${nodeDetails.length}`);
  console.log(`  Set (Input/Yellow): ${nodeDetails.filter(n => n.nodeType === 'set').length}`);
  console.log(`  Query (Lookup/Green): ${nodeDetails.filter(n => n.nodeType === 'query').length}`);
  console.log(`  Intermediate (Enrichment/Blue): ${nodeDetails.filter(n => n.nodeType === 'intermediate').length}`);
  console.log(`  Result (Output/Purple): ${nodeDetails.filter(n => n.nodeType === 'result').length}`);
  console.log(`Edges: ${finalEdges.length}`);
  console.log('=== extractResultSubgraph END ===\n');

  return {
    nodes: nodeDetails,
    edges: finalEdges,
    mainEdge: mainEdge,
    pathCount: results.length, // Number of support paths (matching results)
  };
  } catch (error) {
    console.error('=== ERROR in extractResultSubgraph ===');
    console.error(error);
    
    // Return empty graph on error
    return {
      nodes: [],
      edges: [],
      mainEdge: null,
    };
  }
}

function convertToCytoscapeFormat(subgraph: any) {
  console.log('=== convertToCytoscapeFormat START ===');
  console.log(`Nodes to convert: ${subgraph.nodes?.length || 0}`);
  console.log(`Edges to convert: ${subgraph.edges?.length || 0}`);
  
  const elements: any[] = [];

  // Group nodes by type for positioning
  const nodesByType: Record<string, any[]> = {
    set: [],
    query: [],
    intermediate: [],
    result: []
  };

  subgraph.nodes.forEach((node: any) => {
    const nodeType = node.nodeType || 'query'; // Default to 'query' if missing
    console.log(`  Grouping node ${node.id}: type=${nodeType}`);
    if (!nodesByType[nodeType]) {
      console.warn(`  WARNING: Unknown nodeType "${nodeType}" for node ${node.id}, defaulting to 'query'`);
      nodesByType['query'].push(node);
    } else {
      nodesByType[nodeType].push(node);
    }
  });

  console.log('Node grouping complete:');
  console.log(`  set (yellow/input): ${nodesByType.set.length}`);
  console.log(`  intermediate (green/lookup): ${nodesByType.intermediate.length}`);
  console.log(`  query (blue/enrichment): ${nodesByType.query.length}`);
  console.log(`  result (purple/output): ${nodesByType.result.length}`);

  // Assign column ranks for dagre layout
  const columnRanks: Record<string, number> = {
    set: 0,          // Column 0: Input (yellow) - LEFTMOST
    intermediate: 1, // Column 1: Lookup (green) - moved from position 2
    query: 2,        // Column 2: Enrichment (blue) - moved from position 1
    result: 3        // Column 3: Output (purple) - RIGHTMOST
  };

  // Calculate column positions for preset layout (x-coordinates)
  const columnPositions: Record<string, number> = {
    set: 150,          // Input - leftmost
    intermediate: 650, // Lookup (green) - increased spacing
    query: 1250,        // Enrichment (yellow genes) - increased spacing
    result: 1650       // Output - rightmost
  };

  // Process nodes and assign positions/ranks
  console.log('\n=== Creating Cytoscape elements ===');
  
  // Calculate the maximum number of nodes in any column for vertical centering
  const maxNodesInColumn = Math.max(
    nodesByType.set.length,
    nodesByType.intermediate.length,
    nodesByType.query.length,
    nodesByType.result.length
  );
  
  const nodeSpacing = 130; // Vertical spacing between nodes
  const totalHeight = maxNodesInColumn * nodeSpacing;
  
  console.log(`Max nodes in any column: ${maxNodesInColumn}`);
  console.log(`Total height needed: ${totalHeight}px`);
  
  subgraph.nodes.forEach((node: any) => {
    let label = node.name || node.id;
    // Truncate to 25 characters for better layout
    if (label.length > 25) {
      label = label.substring(0, 20) + '...';
    }

    const nodeType = node.nodeType || 'query'; // Must match default above
    const typeNodes = nodesByType[nodeType] || nodesByType['query']; // Fallback
    const nodeIndex = typeNodes.findIndex(n => n.id === node.id);
    
    // Calculate vertical offset to center this column's nodes
    const nodesInThisColumn = typeNodes.length;
    const columnHeight = nodesInThisColumn * nodeSpacing;
    const verticalOffset = (totalHeight - columnHeight) / 2; // Center offset
    
    const yPosition = 100 + verticalOffset + (nodeIndex * nodeSpacing);
    const xPosition = columnPositions[nodeType] || columnPositions['query']; // Fallback
    
    // Get color based on node type
    const nodeColor = getNodeColor(nodeType);
    
    console.log(`  Node: ${node.id}`);
    console.log(`    Type: ${nodeType}, Index: ${nodeIndex}/${nodesInThisColumn}`);
    console.log(`    Color: ${nodeColor}`);
    console.log(`    Vertical offset: ${verticalOffset.toFixed(0)}px`);
    console.log(`    Position: (${xPosition}, ${yPosition.toFixed(0)})`);
    console.log(`    Rank: ${columnRanks[nodeType]}`);

    elements.push({
      data: {
        id: node.id,
        label: label,
        fullName: node.name || node.id,
        type: 'node',
        categories: node.categories,
        nodeType: node.nodeType,
        color: nodeColor, // Add color to data
        rank: columnRanks[nodeType] || 2, // For dagre layout, fallback to middle
      },
      position: {
        x: xPosition,
        y: yPosition
      },
      classes: `column-${nodeType}` // CSS class for styling
    });
  });

  // Track parallel edges for curve offsets
  const edgeGroups = new Map<string, any[]>(); // "source-target" -> array of edges
  
  subgraph.edges.forEach((edge: any) => {
    const key = `${edge.source}-${edge.target}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }
    edgeGroups.get(key)!.push(edge);
  });
  
  console.log('\nMulti-edge detection:');
  edgeGroups.forEach((edges, key) => {
    if (edges.length > 1) {
      console.log(`  ${key}: ${edges.length} parallel edges`);
    }
  });
  
  subgraph.edges.forEach((edge: any) => {
    const predicateLabel = edge.predicate ? edge.predicate.replace('biolink:', '').replace(/_/g, ' ') : 'related to';
    
    const key = `${edge.source}-${edge.target}`;
    const parallelEdges = edgeGroups.get(key) || [edge];
    const edgeIndex = parallelEdges.findIndex(e => e.id === edge.id);
    const totalParallel = parallelEdges.length;
    
    // Calculate curve offset for parallel edges
    let controlPointDistances: number[] | undefined;
    let controlPointWeights: number[] | undefined;
    
    if (totalParallel > 1) {
      // Spread parallel edges with different curves
      // Center index for symmetry
      const centerIndex = (totalParallel - 1) / 2;
      const offset = (edgeIndex - centerIndex) * 60; // 60px spacing between curves
      
      controlPointDistances = [offset];
      controlPointWeights = [0.5]; // Curve at midpoint
      
      console.log(`  Edge ${edge.id}: parallel ${edgeIndex + 1}/${totalParallel}, offset=${offset}px`);
    }

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
      style: controlPointDistances ? {
        'control-point-distances': controlPointDistances,
        'control-point-weights': controlPointWeights,
      } : undefined,
    });
  });

  console.log('\n=== convertToCytoscapeFormat COMPLETE ===');
  console.log(`Total elements: ${elements.length}`);
  console.log(`  Nodes: ${elements.filter(e => e.data.type === 'node').length}`);
  console.log(`  Edges: ${elements.filter(e => e.data.type === 'edge').length}`);
  console.log('=== END ===\n');

  return elements;
}