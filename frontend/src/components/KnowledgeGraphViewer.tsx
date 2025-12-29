import React, { useEffect, useRef, useState, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent';
import { Download, ZoomIn, ZoomOut, Maximize2, Filter, Search } from 'lucide-react';
import { KnowledgeGraph, Result } from '../types';

// Register the layout
Cytoscape.use(coseBilkent);

interface KnowledgeGraphViewerProps {
  knowledgeGraph: KnowledgeGraph;
  results?: Result[];
  maxNodes?: number;
}

// Enhanced color scheme for biolink categories
const CATEGORY_COLORS: Record<string, string> = {
  'biolink:Disease': '#e74c3c',
  'biolink:Drug': '#3498db',
  'biolink:ChemicalEntity': '#9b59b6',
  'biolink:SmallMolecule': '#8e44ad',
  'biolink:Gene': '#2ecc71',
  'biolink:Protein': '#1abc9c',
  'biolink:BiologicalProcess': '#f39c12',
  'biolink:MolecularActivity': '#d35400',
  'biolink:CellularComponent': '#16a085',
  'biolink:Pathway': '#e67e22',
  'biolink:Phenotype': '#95a5a6',
  'biolink:PhenotypicFeature': '#7f8c8d',
  'biolink:AnatomicalEntity': '#34495e',
  'biolink:Cell': '#2c3e50',
  'biolink:GrossAnatomicalStructure': '#596275',
};

const DEFAULT_COLOR = '#7f8c8d';

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ 
  knowledgeGraph, 
  results,
  maxNodes = 200 
}) => {
  const cyRef = useRef<any>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTopResultsOnly, setShowTopResultsOnly] = useState(true);
  const [topNResults, setTopNResults] = useState(20);

  // Get unique categories from the knowledge graph
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    Object.values(knowledgeGraph.nodes).forEach(node => {
      node.categories?.forEach(cat => categories.add(cat));
    });
    return Array.from(categories).sort();
  }, [knowledgeGraph]);

  // Get nodes that are in top results
  const topResultNodeIds = useMemo(() => {
    if (!results || !showTopResultsOnly) return null;
    
    const nodeIds = new Set<string>();
    results.slice(0, topNResults).forEach(result => {
      Object.values(result.node_bindings).forEach(bindings => {
        bindings.forEach(binding => nodeIds.add(binding.id));
      });
      
      // Also add edges from analyses
      result.analyses.forEach(analysis => {
        if (analysis.edge_bindings) {
          Object.values(analysis.edge_bindings).forEach(edgeBindings => {
            edgeBindings.forEach(edgeBinding => {
              const edge = knowledgeGraph.edges[edgeBinding.id];
              if (edge) {
                nodeIds.add(edge.subject);
                nodeIds.add(edge.object);
              }
            });
          });
        }
      });
    });
    
    return nodeIds;
  }, [results, showTopResultsOnly, topNResults, knowledgeGraph]);

  useEffect(() => {
    const cyElements = convertToCytoscapeFormat(
      knowledgeGraph, 
      filterCategory, 
      searchTerm,
      topResultNodeIds
    );
    setElements(cyElements);
  }, [knowledgeGraph, filterCategory, searchTerm, topResultNodeIds]);

  const convertToCytoscapeFormat = (
    kg: KnowledgeGraph, 
    categoryFilter: string,
    search: string,
    topNodeIds: Set<string> | null
  ) => {
    const elements: any[] = [];
    const addedNodes = new Set<string>();

    // Filter nodes
    let filteredNodes = Object.entries(kg.nodes);
    
    // Apply top results filter
    if (topNodeIds) {
      filteredNodes = filteredNodes.filter(([nodeId]) => topNodeIds.has(nodeId));
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filteredNodes = filteredNodes.filter(([, node]) => 
        node.categories?.includes(categoryFilter)
      );
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredNodes = filteredNodes.filter(([nodeId, node]) => 
        nodeId.toLowerCase().includes(searchLower) ||
        node.name?.toLowerCase().includes(searchLower)
      );
    }

    // Limit number of nodes to prevent performance issues
    filteredNodes = filteredNodes.slice(0, maxNodes);

    // Add filtered nodes
    filteredNodes.forEach(([nodeId, node]) => {
      const primaryCategory = node.categories?.[0] || 'biolink:NamedThing';
      const color = CATEGORY_COLORS[primaryCategory] || DEFAULT_COLOR;
      
      let label = node.name || nodeId;
      if (label.length > 30) {
        label = label.substring(0, 27) + '...';
      }

      elements.push({
        data: {
          id: nodeId,
          label: label,
          fullName: node.name || nodeId,
          type: 'node',
          categories: node.categories || [],
          color: color,
          primaryCategory: primaryCategory,
          attributes: node.attributes || [],
        },
      });
      
      addedNodes.add(nodeId);
    });

    // Add edges only between existing nodes
    Object.entries(kg.edges).forEach(([edgeId, edge]) => {
      if (addedNodes.has(edge.subject) && addedNodes.has(edge.object)) {
        const predicateLabel = edge.predicate
          ? edge.predicate.replace('biolink:', '')
          : 'related_to';

        elements.push({
          data: {
            id: edgeId,
            source: edge.subject,
            target: edge.object,
            label: predicateLabel,
            type: 'edge',
            predicate: edge.predicate,
            sources: edge.sources || [],
            attributes: edge.attributes || [],
          },
        });
      }
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
      link.download = 'knowledge-graph.png';
      link.click();
    }
  };

  const handleDownloadJSON = () => {
    const graphData = {
      nodes: elements.filter(e => e.data.type === 'node').map(e => e.data),
      edges: elements.filter(e => e.data.type === 'edge').map(e => e.data),
    };
    
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.json';
    link.click();
  };

  const cytoscapeStylesheet: any[] = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': 50,
        'height': 50,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'font-size': '10px',
        'font-weight': '600',
        'color': '#2c3e50',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
        'border-width': 2,
        'border-color': '#ffffff',
        'overlay-padding': '3px',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#f39c12',
        'overlay-opacity': 0.3,
        'overlay-color': '#f39c12',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#bdc3c7',
        'target-arrow-color': '#bdc3c7',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '8px',
        'text-rotation': 'autorotate',
        'text-margin-y': -8,
        'color': '#7f8c8d',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.7,
        'text-background-padding': '2px',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 4,
        'line-color': '#f39c12',
        'target-arrow-color': '#f39c12',
      },
    },
  ];

  const layout = {
    name: 'cose-bilkent',
    quality: 'proof',
    nodeDimensionsIncludeLabels: false,
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 30,
    nodeRepulsion: 4500,
    idealEdgeLength: 100,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.4,
    numIter: 2500,
    tile: true,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
    randomize: false,
  };

  const nodeCount = elements.filter(e => e.data.type === 'node').length;
  const edgeCount = elements.filter(e => e.data.type === 'edge').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h4 className="text-lg font-semibold text-gray-900">Knowledge Graph Visualization</h4>
        <div className="flex items-center gap-2 flex-wrap">
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
            PNG
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace('biolink:', '')}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Top Results Filter */}
          {results && results.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showTopResultsOnly}
                  onChange={(e) => setShowTopResultsOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show top results only
              </label>
              {showTopResultsOnly && (
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={topNResults}
                  onChange={(e) => setTopNResults(parseInt(e.target.value) || 20)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Displaying: <strong>{nodeCount}</strong> nodes, <strong>{edgeCount}</strong> edges</span>
          {nodeCount >= maxNodes && (
            <span className="text-orange-600">
              (Limited to {maxNodes} nodes for performance)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main visualization */}
        <div className="lg:col-span-3">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden" style={{ height: '600px' }}>
            {nodeCount > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium mb-2">No nodes to display</p>
                  <p className="text-sm">Try adjusting the filters</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Category Legend */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <h5 className="font-semibold text-gray-900 mb-3 text-sm">Node Categories</h5>
            <div className="space-y-2">
              {availableCategories.map(category => {
                const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
                return (
                  <div key={category} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-700">
                      {category.replace('biolink:', '')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected element details */}
          {selectedElement && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[280px] overflow-y-auto">
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
                    <p className="text-xs text-gray-600 mt-1 break-all">{selectedElement.id}</p>
                  </div>
                  
                  {selectedElement.categories && selectedElement.categories.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Categories:</span>
                      <div className="mt-1 space-y-1">
                        {selectedElement.categories.map((cat: string) => (
                          <div key={cat} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded break-words">
                            {cat.replace('biolink:', '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.attributes && selectedElement.attributes.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Attributes:</span>
                      <div className="mt-1 text-xs text-gray-600">
                        {selectedElement.attributes.length} attribute(s)
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <p className="text-xs text-gray-600 mt-1 break-all">{selectedElement.id}</p>
                  </div>
                  
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
                  
                  {selectedElement.sources && selectedElement.sources.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Sources:</span>
                      <div className="mt-1 text-xs text-gray-600">
                        {selectedElement.sources.length} source(s)
                      </div>
                    </div>
                  )}
                  
                  {selectedElement.attributes && selectedElement.attributes.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Attributes:</span>
                      <div className="mt-1 text-xs text-gray-600">
                        {selectedElement.attributes.length} attribute(s)
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
