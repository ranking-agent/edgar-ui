import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { QueryGraph } from '../types';

// Register the layout
Cytoscape.use(coseBilkent);

interface QueryGraphViewerProps {
  queryGraph: QueryGraph;
}

// Color scheme for biolink categories
const CATEGORY_COLORS: Record<string, string> = {
  'biolink:Disease': '#e74c3c',
  'biolink:Drug': '#3498db',
  'biolink:ChemicalEntity': '#9b59b6',
  'biolink:Gene': '#2ecc71',
  'biolink:Protein': '#1abc9c',
  'biolink:BiologicalProcess': '#f39c12',
  'biolink:Pathway': '#e67e22',
  'biolink:Phenotype': '#95a5a6',
  'biolink:AnatomicalEntity': '#34495e',
  'biolink:CellularComponent': '#16a085',
  'biolink:MolecularActivity': '#d35400',
};

const DEFAULT_COLOR = '#7f8c8d';

export const QueryGraphViewer: React.FC<QueryGraphViewerProps> = ({ queryGraph }) => {
  const cyRef = useRef<any>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [presentCategories, setPresentCategories] = useState<string[]>([]);

  // Extract and sort unique categories present in the graph
  useEffect(() => {
    const categories = Array.from(
      new Set(
        Object.values(queryGraph.nodes)
          .flatMap(node => node.categories || [])
          .filter(Boolean) // remove empty strings or nulls
      )
    ).sort();

    setPresentCategories(categories);
  }, [queryGraph]);
  
  useEffect(() => {
    const cyElements = convertToCytoscapeFormat(queryGraph);
    setElements(cyElements);
  }, [queryGraph]);

  const convertToCytoscapeFormat = (qg: QueryGraph) => {
    const elements: any[] = [];

    // Add nodes
    Object.entries(qg.nodes).forEach(([nodeId, node]) => {
      const primaryCategory = node.categories?.[0] || 'biolink:NamedThing';
      const color = CATEGORY_COLORS[primaryCategory] || DEFAULT_COLOR;
      
      // Create label
      let label = nodeId;
      if (node.ids && node.ids.length > 0) {
        // If node has specific IDs, show first ID
        const firstId = node.ids[0];
        label = firstId.includes(':') ? firstId : firstId;
      } else if (node.categories && node.categories.length > 0) {
        // Otherwise show primary category
        label = primaryCategory.replace('biolink:', '');
      }

      elements.push({
        data: {
          id: nodeId,
          label: label,
          type: 'node',
          categories: node.categories || [],
          ids: node.ids || [],
          isSet: node.is_set || false,
          color: color,
          primaryCategory: primaryCategory,
        },
      });
    });

    // Add edges
    Object.entries(qg.edges).forEach(([edgeId, edge]) => {
      const predicateLabel = edge.predicates?.[0]
        ? edge.predicates[0].replace('biolink:', '')
        : 'related_to';

      elements.push({
        data: {
          id: edgeId,
          source: edge.subject,
          target: edge.object,
          label: predicateLabel,
          type: 'edge',
          predicates: edge.predicates || [],
          knowledgeType: edge.knowledge_type,
        },
      });
    });

    return elements;
  };

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
      const cy = cyRef.current;
      cy.zoom(cy.zoom() * 1.2);
      cy.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      const cy = cyRef.current;
      cy.zoom(cy.zoom() * 0.8);
      cy.center();
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  const handleDownloadPNG = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ full: true, scale: 2 });
      const link = document.createElement('a');
      link.href = png;
      link.download = 'query-graph.png';
      link.click();
    }
  };

  const cytoscapeStylesheet: any[] = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': '80px',
        'height': '80px',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'font-weight': 'bold',
        'color': '#ffffff',
        // 'text-outline-width': 0,
        'text-outline-color': 'data(color)',
        'border-width': 3,
        'border-color': '#ffffff',
        // 'overlay-padding': '4px',
      },
    },
    {
      selector: 'node[isSet]',
      style: {
        'shape': 'round',
        // 'border-width': 4,
        'border-style': 'dashed',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 5,
        // 'border-color': '#f39c12',
        'overlay-opacity': 0.3,
        // 'overlay-color': '#f39c12',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 4,
        'line-color': '#95a5a6',
        'target-arrow-color': '#95a5a6',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '11px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'color': '#2c3e50',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.8,
        // 'text-background-padding': '1px',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 6,
        'line-color': '#f39c12',
        'target-arrow-color': '#f39c12',
      },
    },
  ];

  const layout = {
    name: 'breadthfirst',
    quality: 'proof',
    nodeDimensionsIncludeLabels: true,
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 50,
    nodeRepulsion: 8000,
    idealEdgeLength: 150,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Query Graph Structure</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleFit}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main visualization */}
        <div className="lg:col-span-3">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden" style={{ height: '200px' }}>
            <CytoscapeComponent
              elements={elements}
              stylesheet={cytoscapeStylesheet}
              layout={layout}
              cy={(cy) => {
                cyRef.current = cy;
                cy.on('tap', 'node, edge', handleElementClick);
                cy.on('tap', (event) => {
                  if (event.target === cy) {
                    setSelectedElement(null);
                  }
                });
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Info panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Legend */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-3 text-sm">Node Types</h5>
            <div className="space-y-2">
              {presentCategories.length > 0 ? (
                presentCategories.map(category => {
                  const displayName = category.replace('biolink:', '');
                  const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;

                  return (
                    <div key={category} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-700">{displayName}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 italic">No categorized nodes</div>
              )}
            </div>
          </div>

          {/* Selected element details */}
          {selectedElement && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3 text-sm">
                {selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}
              </h5>
              
              {selectedElement.type === 'node' ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <p className="text-gray-600 mt-1">{selectedElement.id}</p>
                  </div>
                  
                  {selectedElement.ids && selectedElement.ids.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">CURIEs:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.ids.map((id: string) => (
                          <div key={id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.categories && selectedElement.categories.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Categories:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.categories.map((cat: string) => (
                          <div key={cat} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {cat.replace('biolink:', '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.isSet && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <span className="text-xs text-yellow-800 font-medium">Set Node</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <p className="text-gray-600 mt-1">{selectedElement.id}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Connection:</span>
                    <p className="text-gray-600 mt-1">
                      {selectedElement.source} → {selectedElement.target}
                    </p>
                  </div>
                  
                  {selectedElement.predicates && selectedElement.predicates.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Predicates:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.predicates.map((pred: string) => (
                          <div key={pred} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                            {pred.replace('biolink:', '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.knowledgeType && (
                    <div>
                      <span className="font-medium text-gray-700">Knowledge Type:</span>
                      <p className="text-xs text-gray-600 mt-1">{selectedElement.knowledgeType}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Query Nodes</div>
          <div className="text-2xl font-bold text-blue-900">
            {Object.keys(queryGraph.nodes).length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Query Edges</div>
          <div className="text-2xl font-bold text-purple-900">
            {Object.keys(queryGraph.edges).length}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Fixed Nodes</div>
          <div className="text-2xl font-bold text-green-900">
            {Object.values(queryGraph.nodes).filter(n => n.ids && n.ids.length > 0).length}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="text-xs text-orange-600 font-medium mb-1">Set Nodes</div>
          <div className="text-2xl font-bold text-orange-900">
            {Object.values(queryGraph.nodes).filter(n => n.is_set).length}
          </div>
        </div>
      </div>
    </div>
  );
};
