import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { QueryGraph } from '../types';

Cytoscape.use(coseBilkent);

interface QueryGraphViewerProps {
  queryGraph: QueryGraph;
}

// Color scheme for biolink categories - Purple themed
const CATEGORY_COLORS: Record<string, string> = {
  'biolink:Disease': '#e11d48',
  'biolink:Drug': '#7c3aed',
  'biolink:ChemicalEntity': '#a855f7',
  'biolink:SmallMolecule': '#8b5cf6',
  'biolink:Gene': '#10b981',
  'biolink:Protein': '#14b8a6',
  'biolink:BiologicalProcess': '#f59e0b',
  'biolink:Pathway': '#f97316',
  'biolink:Phenotype': '#8b5cf6',
  'biolink:PhenotypicFeature': '#8b5cf6',
  'biolink:AnatomicalEntity': '#64748b',
  'biolink:CellularComponent': '#06b6d4',
  'biolink:MolecularActivity': '#ea580c',
};

const DEFAULT_COLOR = '#6366f1';

export const QueryGraphViewer: React.FC<QueryGraphViewerProps> = ({ queryGraph }) => {
  const cyRef = useRef<any>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [presentCategories, setPresentCategories] = useState<string[]>([]);

  useEffect(() => {
    const categories = Array.from(
      new Set(
        Object.values(queryGraph.nodes)
          .flatMap(node => node.categories || [])
          .filter(Boolean)
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

    Object.entries(qg.nodes).forEach(([nodeId, node]) => {
      const primaryCategory = node.categories?.[0] || 'biolink:NamedThing';
      const color = CATEGORY_COLORS[primaryCategory] || DEFAULT_COLOR;
      
      let label = nodeId;
      if (node.ids && node.ids.length > 0) {
        const firstId = node.ids[0];
        label = firstId.includes(':') ? firstId : firstId;
      } else if (node.categories && node.categories.length > 0) {
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
      cy.zoom(cy.zoom() * 1.4);
      cy.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      const cy = cyRef.current;
      cy.zoom(cy.zoom() * 0.6);
      cy.center();
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 60);
    }
  };

  const handleDownloadPNG = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ full: true, scale: 3 });
      const link = document.createElement('a');
      link.href = png;
      link.download = 'query-graph.png';
      link.click();
    }
  };

  // MUCH LARGER NODE AND EDGE STYLING
  const cytoscapeStylesheet: any[] = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': '160px',         // INCREASED from 80px
        'height': '160px',        // INCREASED from 80px
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '18px',      // INCREASED from 12px
        'font-weight': 'bold',
        'color': '#ffffff',
        'text-outline-width': 3,
        'text-outline-color': 'data(color)',
        'border-width': 5,        // INCREASED from 3
        'border-color': '#ffffff',
        'text-wrap': 'wrap',
        'text-max-width': '140px',
      },
    },
    {
      selector: 'node[isSet]',
      style: {
        'shape': 'round-rectangle',
        'border-style': 'dashed',
        'border-width': 6,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 7,
        'border-color': '#fbbf24',
        'overlay-opacity': 0.2,
        'overlay-color': '#fbbf24',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 6,               // INCREASED from 4
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 2.0,       // INCREASED
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '16px',      // INCREASED from 11px
        'text-rotation': 'autorotate',
        'text-margin-y': -14,
        'color': '#1e293b',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.9,
        'text-background-padding': '5px',
        'font-weight': '600',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 8,
        'line-color': '#a855f7',
        'target-arrow-color': '#a855f7',
      },
    },
  ];

  const layout = {
    name: 'breadthfirst',
    directed: true,
    padding: 100,             // INCREASED
    spacingFactor: 2.5,       // INCREASED
    animate: true,
    animationDuration: 800,
    fit: true,
    avoidOverlap: true,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-900">Query Graph Structure</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2.5 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-purple-700" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-purple-700" />
          </button>
          <button
            onClick={handleFit}
            className="p-2.5 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-5 h-5 text-purple-700" />
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main visualization - MUCH LARGER */}
        <div className="lg:col-span-3">
          <div 
            className="bg-slate-50 border-2 border-purple-200 rounded-xl overflow-hidden" 
            style={{ height: '500px' }}  /* INCREASED from 200px */
          >
            <CytoscapeComponent
              elements={elements}
              stylesheet={cytoscapeStylesheet}
              layout={layout}
              cy={(cy) => {
                cyRef.current = cy;
                cy.on('tap', 'node, edge', handleElementClick);
                cy.on('tap', (event: any) => {
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
          <div className="bg-white border border-purple-100 rounded-xl p-5 shadow-sm">
            <h5 className="font-semibold text-slate-900 mb-4">Node Types</h5>
            <div className="space-y-2">
              {presentCategories.length > 0 ? (
                presentCategories.map(category => {
                  const displayName = category.replace('biolink:', '');
                  const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;

                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-slate-700">{displayName}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500 italic">No categorized nodes</div>
              )}
            </div>
          </div>

          {/* Selected element details */}
          {selectedElement && (
            <div className="bg-white border border-purple-100 rounded-xl p-5 shadow-sm">
              <h5 className="font-semibold text-slate-900 mb-3">
                {selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}
              </h5>
              
              {selectedElement.type === 'node' ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">ID:</span>
                    <p className="text-slate-900 mt-1 font-mono text-xs bg-slate-100 px-3 py-2 rounded-lg">{selectedElement.id}</p>
                  </div>
                  
                  {selectedElement.ids && selectedElement.ids.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-600">CURIEs:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.ids.map((id: string) => (
                          <div key={id} className="text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-mono">
                            {id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.categories && selectedElement.categories.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-600">Categories:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.categories.map((cat: string) => (
                          <div key={cat} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg">
                            {cat.replace('biolink:', '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.isSet && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <span className="text-sm text-amber-800 font-medium">Set Node</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">ID:</span>
                    <p className="text-slate-900 mt-1 font-mono text-xs bg-slate-100 px-3 py-2 rounded-lg">{selectedElement.id}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-slate-600">Connection:</span>
                    <p className="text-slate-600 mt-1 text-sm">
                      {selectedElement.source} → {selectedElement.target}
                    </p>
                  </div>
                  
                  {selectedElement.predicates && selectedElement.predicates.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-600">Predicates:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.predicates.map((pred: string) => (
                          <div key={pred} className="text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-lg">
                            {pred.replace('biolink:', '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.knowledgeType && (
                    <div>
                      <span className="font-medium text-slate-600">Knowledge Type:</span>
                      <p className="text-sm text-slate-600 mt-1 bg-slate-100 px-3 py-2 rounded-lg">{selectedElement.knowledgeType}</p>
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