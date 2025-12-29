import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Info, AlertCircle, CheckCircle, ChevronDown, ChevronUp, BarChart } from 'lucide-react';
import axios from 'axios';
import { ResultPathViewer } from './ResultPathViewer';
import { AC_URL, PREDICATES, NODE_CATEGORIES, COMMON_CHEMICALS, COMMON_DISEASES, COMMON_GENES, COMMON_PHENOTYPES } from '../utils/api';



interface EnrichmentQuery {
  inputCategory: string;
  outputCategory: string;
  predicate: string;
  memberIds: string[];
  setInterpretation: 'BATCH' | 'MANY' | 'ALL';
}

// Map input categories to their example IDs
const EXAMPLE_IDS_BY_CATEGORY: Record<string, typeof COMMON_PHENOTYPES> = {
  'biolink:PhenotypicFeature': COMMON_PHENOTYPES,
  'biolink:Gene': COMMON_GENES,
  'biolink:Disease': COMMON_DISEASES,
  'biolink:ChemicalEntity': COMMON_CHEMICALS,
  'biolink:BiologicalProcess': [], // Add examples if needed
};


export const EnrichmentAnalysis: React.FC = () => {
  const [query, setQuery] = useState<EnrichmentQuery>({
    inputCategory: 'biolink:PhenotypicFeature',
    outputCategory: 'biolink:Disease',
    predicate: 'biolink:has_phenotype',
    memberIds: ['HP:0000739', 'HP:0001288', 'HP:0001252'],
    setInterpretation: 'MANY',
  });
  const [customId, setCustomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [visualizationMode, setVisualizationMode] = useState<'cytoscape' | 'text'>('text');
  const [expandedEnrichmentPaths, setExpandedEnrichmentPaths] = useState<Set<string>>(new Set());
  const [queryBuilderExpanded, setQueryBuilderExpanded] = useState(true);
  const [showCombinedGraph, setShowCombinedGraph] = useState(false);
  const [topN, setTopN] = useState(10);
  const [showTopOrBottom, setShowTopOrBottom] = useState<'top' | 'bottom'>('top');
  const [expandedMemberSets, setExpandedMemberSets] = useState<Set<string>>(new Set());
  const [expandedDiseases, setExpandedDiseases] = useState<Set<string>>(new Set());
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  const addMemberId = (id: string) => {
    if (id && !query.memberIds.includes(id)) {
      setQuery({ ...query, memberIds: [...query.memberIds, id] });
      setCustomId('');
    }
  };

  const removeMemberId = (id: string) => {
    setQuery({ ...query, memberIds: query.memberIds.filter((mid) => mid !== id) });
  };

  const buildTrapiQuery = () => {
    return {
      message: {
        query_graph: {
          nodes: {
            input: {
              categories: [query.inputCategory],
              ids: ['uuid:1'],
              member_ids: query.memberIds,
              set_interpretation: query.setInterpretation,
            },
            output: {
              categories: [query.outputCategory],
            },
          },
          edges: {
            edge_0: {
              subject: 'input',
              object: 'output',
              predicates: [query.predicate],
            },
          },
        },
      },
    };
  };

  const runEnrichment = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    setExpandedResults(new Set());
    setQueryBuilderExpanded(true); // Keep expanded while loading

    try {
      const trapiQuery = buildTrapiQuery();
      console.log('Sending query to AnswerCoalesce:', trapiQuery);

      const response = await axios.post(AC_URL, trapiQuery, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setResults(response.data);
      setQueryBuilderExpanded(false); // Auto-collapse when results load
    } catch (err: any) {
      console.error('Error running enrichment:', err);
      setError(
        err.response?.data?.detail || err.message || 'Failed to run enrichment analysis'
      );
    } finally {
      setLoading(false);
    }
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

  const toggleEnrichmentPath = (pathId: string) => {
    const newExpanded = new Set(expandedEnrichmentPaths);
    if (newExpanded.has(pathId)) {
      newExpanded.delete(pathId);
    } else {
      newExpanded.add(pathId);
    }
    setExpandedEnrichmentPaths(newExpanded);
  };

  const toggleMemberSet = (memberSetKey: string) => {
    const newExpanded = new Set(expandedMemberSets);
    if (newExpanded.has(memberSetKey)) {
      newExpanded.delete(memberSetKey);
    } else {
      newExpanded.add(memberSetKey);
    }
    setExpandedMemberSets(newExpanded);
  };

  const toggleDisease = (diseaseId: string) => {
    const newExpanded = new Set(expandedDiseases);
    if (newExpanded.has(diseaseId)) {
      newExpanded.delete(diseaseId);
    } else {
      newExpanded.add(diseaseId);
    }
    setExpandedDiseases(newExpanded);
  };

  const trapiQuery = buildTrapiQuery();
  const resultCount = results?.message?.results?.length || 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Enrichment Analysis</h2>
        </div>
        <p className="text-gray-600">
          Build custom TRAPI queries for enrichment analysis using phenotypic features, diseases,
          genes, and more. Powered by AnswerCoalesce.
        </p>
      </div>

      {/* Show Query Builder Toggle */}
      {!queryBuilderExpanded && results && (
        <button
          onClick={() => setQueryBuilderExpanded(true)}
          className="fixed left-4 top-24 z-50 bg-purple-600 text-white px-4 py-2 rounded-r-lg shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
          <span>Show Query Builder</span>
        </button>
      )}

      <div className={`grid gap-6 transition-all duration-300 ${
        queryBuilderExpanded ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {/* Left Column - Build Query & Query Preview (can be hidden) */}
        {queryBuilderExpanded && (
          <>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-6 bg-gray-50 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Build Query</h3>
                {results && (
                  <button
                    onClick={() => setQueryBuilderExpanded(false)}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                    <span>Hide</span>
                  </button>
                )}
              </div>
              <div className="p-6">

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Category
            </label>
            <select
              value={query.inputCategory}
              onChange={(e) => setQuery({ ...query, inputCategory: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {NODE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('biolink:', '')}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Category
            </label>
            <select
              value={query.outputCategory}
              onChange={(e) => setQuery({ ...query, outputCategory: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {NODE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('biolink:', '')}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Predicate</label>
            <select
              value={query.predicate}
              onChange={(e) => setQuery({ ...query, predicate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {PREDICATES.map((pred) => (
                <option key={pred} value={pred}>
                  {pred.replace('biolink:', '')}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set Interpretation
            </label>
            <select
              value={query.setInterpretation}
              onChange={(e) =>
                setQuery({ ...query, setInterpretation: e.target.value as any })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="MANY">MANY (any member)</option>
              <option value="BATCH">BATCH (treat as batch)</option>
              <option value="ALL">ALL (all members)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              <Info className="inline w-3 h-3 mr-1" />
              MANY: Results for any member. ALL: Results for all members.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member IDs ({query.memberIds.length})
            </label>

            {EXAMPLE_IDS_BY_CATEGORY[query.inputCategory]?.length > 0 && (
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block">Quick Add:</label>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_IDS_BY_CATEGORY[query.inputCategory].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addMemberId(item.id)}
                      disabled={query.memberIds.includes(item.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        query.memberIds.includes(item.id)
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                      title={item.label}
                    >
                      {item.id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMemberId(customId)}
                placeholder="e.g., HP:0000001"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={() => addMemberId(customId)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {query.memberIds.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No member IDs added yet
                </p>
              ) : (
                <div className="space-y-2">
                  {query.memberIds.map((id) => {
                    // Find label from any category
                    const allExamples = [
                      ...COMMON_PHENOTYPES,
                      ...COMMON_GENES,
                      ...COMMON_DISEASES,
                      ...COMMON_CHEMICALS,
                    ];
                    const itemLabel = allExamples.find((p) => p.id === id)?.label;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-sm text-gray-900">{id}</span>
                          {itemLabel && (
                            <span className="ml-2 text-xs text-gray-500 truncate block">
                              ({itemLabel})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeMemberId(id)}
                          className="text-red-600 hover:text-red-700 flex-shrink-0 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={runEnrichment}
            disabled={loading || query.memberIds.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {loading ? 'Running Analysis...' : 'Run Enrichment Analysis'}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">TRAPI Query Preview</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(trapiQuery, null, 2)}
                </pre>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4" />
                <span>
                  Endpoint: <span className="font-mono">{AC_URL}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {results && (
        <div ref={resultsRef} className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Results</h3>
            <div className="flex items-center gap-4">
              {/* Combined Graph Toggle */}
              <button
                onClick={() => setShowCombinedGraph(!showCombinedGraph)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showCombinedGraph
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showCombinedGraph ? 'Show Individual' : 'Show Combined Graph'}
              </button>
              
              {/* Top/Bottom N Controls - only show in combined mode */}
              {showCombinedGraph && (
                <>
                  <select
                    value={showTopOrBottom}
                    onChange={(e) => setShowTopOrBottom(e.target.value as 'top' | 'bottom')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  
                  <input
                    type="number"
                    min="1"
                    max={resultCount}
                    value={topN}
                    onChange={(e) => setTopN(Math.min(Math.max(1, parseInt(e.target.value) || 1), resultCount))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">results</span>
                </>
              )}
              
              {/* Visualization Mode Toggle - only show in individual mode */}
              {!showCombinedGraph && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">View:</label>
                  <select
                    value={visualizationMode}
                    onChange={(e) => setVisualizationMode(e.target.value as 'text' | 'cytoscape')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="text">Text</option>
                    <option value="cytoscape">Graph</option>
                    
                  </select>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">{resultCount} results</span>
              </div>
            </div>
          </div>

          {showCombinedGraph ? (
            /* Combined Graph View - Grouped by number of connected members */
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              {(() => {
                // Filter top N or bottom N results
                const allRes = results.message?.results || [];
                const filteredResults = showTopOrBottom === 'top' 
                  ? allRes.slice(0, topN)
                  : allRes.slice(-topN);
                
                if (filteredResults.length === 0) {
                  return <p className="text-sm text-gray-500">No results to display</p>;
                }
                
                // Group results by their connected members (as a unique key)
                const resultsByMemberSet = new Map<string, {
                  memberIds: string[];
                  members: Array<{id: string, name: string}>;
                  results: Array<{id: string, name: string, score: number}>;
                }>();
                
                filteredResults.forEach((result: any) => {
                  const outputNodeId = result.node_bindings?.output?.[0]?.id;
                  const node = results.message?.knowledge_graph?.nodes?.[outputNodeId];
                  const score = result.analyses?.[0]?.score || 0;
                  
                  if (!outputNodeId) return;
                  
                  // Get connected members for this result
                  const connectedMembers: Array<{id: string, name: string}> = [];
                  
                  const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
                  const firstEdgeKey = Object.keys(edgeBindings)[0];
                  if (!firstEdgeKey) return;
                  
                  const edgeId = edgeBindings[firstEdgeKey]?.[0]?.id;
                  if (!edgeId) return;
                  
                  const mainEdge = results.message?.knowledge_graph?.edges?.[edgeId];
                  if (!mainEdge) return;
                  
                  const supportGraphsAttr = mainEdge.attributes?.find(
                    (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
                  );
                  
                  const supportGraphIds = Array.isArray(supportGraphsAttr?.value)
                    ? supportGraphsAttr.value
                    : supportGraphsAttr?.value ? [supportGraphsAttr.value] : [];
                  
                  // Collect members for this result
                  const memberIds: string[] = [];
                  supportGraphIds.forEach((sgId: string) => {
                    const auxGraph = results.message?.auxiliary_graphs?.[sgId];
                    if (!auxGraph?.edges) return;
                    
                    auxGraph.edges.forEach((auxEdgeId: string) => {
                      const auxEdge = results.message?.knowledge_graph?.edges?.[auxEdgeId];
                      if (auxEdge?.predicate === 'biolink:member_of') {
                        const memberId = auxEdge.subject;
                        if (!memberIds.includes(memberId)) {
                          const memberNode = results.message?.knowledge_graph?.nodes?.[memberId];
                          memberIds.push(memberId);
                          connectedMembers.push({
                            id: memberId,
                            name: memberNode?.name || memberId
                          });
                        }
                      }
                    });
                  });
                  
                  // Create unique key for this member set
                  const memberSetKey = memberIds.sort().join('|');
                  
                  if (!resultsByMemberSet.has(memberSetKey)) {
                    resultsByMemberSet.set(memberSetKey, {
                      memberIds,
                      members: connectedMembers,
                      results: []
                    });
                  }
                  
                  resultsByMemberSet.get(memberSetKey)!.results.push({
                    id: outputNodeId,
                    name: node?.name || outputNodeId,
                    score
                  });
                });
                
                // Sort groups by member count (descending), then by number of results
                const sortedGroups = Array.from(resultsByMemberSet.values())
                  .sort((a, b) => {
                    if (b.members.length !== a.members.length) {
                      return b.members.length - a.members.length;
                    }
                    return b.results.length - a.results.length;
                  });
                
                return (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Showing {showTopOrBottom === 'top' ? 'top' : 'bottom'} {filteredResults.length} results, grouped by input member subsets
                    </div>
                    
                    {sortedGroups.map((group, groupIdx) => {
                      const memberSetKey = group.memberIds.sort().join('|');
                      const isExpanded = expandedMemberSets.has(memberSetKey);
                      
                      return (
                        <div key={memberSetKey} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                          {/* Header - Clickable */}
                          <button
                            onClick={() => toggleMemberSet(memberSetKey)}
                            className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {/* Member badges */}
                                <div className="flex flex-wrap gap-1">
                                  {group.members.map(member => (
                                    <span key={member.id} className="bg-yellow-100 border border-yellow-400 px-2 py-1 rounded text-xs font-semibold">
                                      {member.name}
                                    </span>
                                  ))}
                                </div>
                                
                                {/* Arrow */}
                                <span className="text-purple-600 font-bold text-xl flex-shrink-0">→</span>
                                
                                {/* Result count */}
                                <span className="text-sm font-semibold text-gray-900">
                                  {group.results.length} Disease{group.results.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              
                              {/* Expand/Collapse icon */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                              </div>
                            </div>
                          </button>
                          
                          {/* Expanded Results List */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-white p-4">
                              <div className="space-y-2">
                                {group.results
                                  .sort((a, b) => b.score - a.score)
                                  .map((resultData, idx) => {
                                    const isDiseaseExpanded = expandedDiseases.has(resultData.id);
                                    
                                    return (
                                      <div key={resultData.id} className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
                                        {/* Disease Card - Clickable */}
                                        <button
                                          onClick={() => toggleDisease(resultData.id)}
                                          className="w-full p-3 hover:bg-purple-100 transition-colors text-left"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-semibold text-gray-900">
                                                {resultData.name}
                                              </div>
                                              <div className="text-xs text-gray-500 font-mono truncate">
                                                {resultData.id}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="flex-shrink-0 text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                                {resultData.score.toFixed(4)}
                                              </div>
                                              {isDiseaseExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-600" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-600" />
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                        
                                        {/* Expanded Member Details */}
                                        {isDiseaseExpanded && (
                                          <div className="border-t border-purple-200 bg-white p-3">
                                            <div className="text-xs text-gray-600 mb-2 font-semibold">
                                              Connected Members ({group.members.length}):
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {group.members.map(member => (
                                                <div key={member.id} className="bg-yellow-50 border border-yellow-300 rounded px-2 py-1">
                                                  <div className="text-xs font-semibold text-gray-900">
                                                    {member.name}
                                                  </div>
                                                  <div className="text-xs text-gray-500 font-mono">
                                                    {member.id}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="text-xs text-gray-500 italic">
                      Note: Click on any member subset to expand/collapse the list of connected diseases. Diseases are sorted by score within each group.
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Individual Results List */
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <h4 className="font-semibold text-gray-900 mb-3">
              click on any result to view evidence that supports it
            </h4>
            <div className="space-y-3">
              {results.message?.results?.map((result: any, idx: number) => {
                const outputNodeId = result.node_bindings?.output?.[0]?.id;
                const node = results.message?.knowledge_graph?.nodes?.[outputNodeId];
                const score = result.analyses?.[0]?.score;
                const isExpanded = expandedResults.has(idx);

                return (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleResultExpansion(idx)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {node?.name || outputNodeId}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="text-xs text-gray-600">ID: {outputNodeId}</div>
                        </div>
                        {score !== undefined && (
                          <div className="text-right ml-3">
                            <div className="text-xs text-gray-500">Score</div>
                            <div className="font-bold text-purple-600">{score.toFixed(4)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-white">
                        {visualizationMode === 'cytoscape' ? (
                          <ResultPathViewer
                            result={result}
                            knowledgeGraph={results.message?.knowledge_graph}
                            queryGraph={results.message?.query_graph}
                            auxiliaryGraphs={results.message?.auxiliary_graphs}
                            resultIndex={idx}
                            allResults={results.message?.results}
                          />
                        ) : (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 mb-3">Support Paths</h4>
                            {(() => {
                              const edgeBindings = result.analyses?.[0]?.edge_bindings || {};
                              const firstEdgeKey = Object.keys(edgeBindings)[0];
                              if (!firstEdgeKey) return <p className="text-sm text-gray-500">No edge bindings found</p>;
                              
                              const edgeId = edgeBindings[firstEdgeKey]?.[0]?.id;
                              if (!edgeId) return <p className="text-sm text-gray-500">No edge ID found</p>;
                              
                              const mainEdge = results.message?.knowledge_graph?.edges?.[edgeId];
                              if (!mainEdge) return <p className="text-sm text-gray-500">Edge not found in knowledge graph</p>;
                              
                              const supportGraphsAttr = mainEdge.attributes?.find(
                                (attr: any) => attr.attribute_type_id === 'biolink:support_graphs'
                              );
                              
                              const supportGraphIds = Array.isArray(supportGraphsAttr?.value)
                                ? supportGraphsAttr.value
                                : supportGraphsAttr?.value ? [supportGraphsAttr.value] : [];
                              
                              if (supportGraphIds.length === 0) {
                                return <p className="text-sm text-gray-500">No support graphs found</p>;
                              }
                              
                              const connectedMembers: Array<{
                                id: string;
                                name: string;
                                category: string;
                                pValue?: number;
                              }> = [];
                              
                              let predicate = '';
                              
                              supportGraphIds.forEach((sgId: string) => {
                                const auxGraph = results.message?.auxiliary_graphs?.[sgId];
                                if (!auxGraph?.edges) return;
                                
                                let memberId: string | null = null;
                                let memberName = '';
                                let memberCategory = '';
                                let pValue: number | undefined;
                                
                                auxGraph.edges.forEach((auxEdgeId: string) => {
                                  const auxEdge = results.message?.knowledge_graph?.edges?.[auxEdgeId];
                                  if (!auxEdge) return;
                                  
                                  if (auxEdge.predicate === 'biolink:member_of') {
                                    memberId = auxEdge.subject;
                                    const memberNode = results.message?.knowledge_graph?.nodes?.[memberId];
                                    memberName = memberNode?.name || memberId;
                                    memberCategory = memberNode?.categories?.[0]?.replace('biolink:', '') || 'Entity';
                                  } else {
                                    predicate = auxEdge.predicate?.replace('biolink:', '').replace(/_/g, ' ') || 'related to';
                                    const pValueAttr = auxEdge.attributes?.find(
                                      (attr: any) => attr.attribute_type_id === 'biolink:p_value'
                                    );
                                    if (pValueAttr) pValue = pValueAttr.value;
                                  }
                                });
                                
                                if (memberId) {
                                  connectedMembers.push({ id: memberId, name: memberName, category: memberCategory, pValue });
                                }
                              });
                              
                              connectedMembers.sort((a, b) => {
                                if (a.pValue !== undefined && b.pValue !== undefined) return a.pValue - b.pValue;
                                return 0;
                              });
                              
                              const categoryCount: Record<string, number> = {};
                              connectedMembers.forEach(m => {
                                categoryCount[m.category] = (categoryCount[m.category] || 0) + 1;
                              });
                              const mostCommonCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Entity';
                              
                              let memberTypeLabel = mostCommonCategory + 's';
                              if (connectedMembers.length === 1) {
                                memberTypeLabel = mostCommonCategory;
                              } else if (mostCommonCategory.endsWith('y')) {
                                memberTypeLabel = mostCommonCategory.slice(0, -1) + 'ies';
                              }
                              
                              const outputName = node?.name || outputNodeId;
                              const pathId = `${idx}-direct`;
                              const isPathExpanded = expandedEnrichmentPaths.has(pathId);
                              
                              return (
                                <div className="space-y-3">
                                  <div className="text-sm text-gray-600 mb-3">
                                    {connectedMembers.length} of input members connect to this result
                                  </div>
                                  
                                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                                      <div className="flex items-center gap-3 text-sm flex-wrap">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleEnrichmentPath(pathId);
                                          }}
                                          className="inline-flex items-center bg-green-100 border border-green-400 px-2 py-1 rounded font-semibold hover:bg-green-200 transition-colors"
                                        >
                                          {connectedMembers.length} {memberTypeLabel}
                                        </button>
                                        
                                        <div className="flex flex-col items-center justify-center">
                                          <span className="text-xs text-gray-600 whitespace-nowrap mb-1">{predicate}</span>
                                          <div className="flex items-center">
                                            <div className="flex-1 border-t-2 border-purple-600"></div>
                                            <span className="text-purple-600 font-bold text-lg mx-1">→</span>
                                          </div>
                                        </div>
                                        
                                        <span className="inline-flex items-center bg-purple-100 border border-purple-400 px-2 py-1 rounded font-semibold">
                                          {outputName}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {isPathExpanded && (
                                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 mt-3">
                                        <div className="text-xs text-green-700 font-semibold mb-2">
                                          Connected {memberTypeLabel} ({connectedMembers.length})
                                        </div>
                                        <div className="space-y-1 max-h-64 overflow-y-auto">
                                          {connectedMembers.map((member, mIdx) => (
                                            <div key={mIdx} className="flex items-center justify-between bg-white border border-green-200 rounded p-2">
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
                                              {member.pValue !== undefined && (
                                                <div className="text-xs text-gray-600 ml-2 flex-shrink-0">
                                                  p = {member.pValue.toExponential(2)}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          <button
            onClick={() => {
              const dataStr = JSON.stringify(results, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `enrichment-results-${Date.now()}.json`;
              link.click();
            }}
            className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Download Full Results (JSON)
          </button>
        </div>
      )}
    </div>
  );
};