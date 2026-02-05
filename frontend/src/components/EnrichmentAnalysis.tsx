import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Info, AlertCircle, ChevronDown, ChevronUp, BarChart } from 'lucide-react';
import axios from 'axios';
import { EnrichmentResultsViewer } from './EnrichmentResultsViewer';
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
  const [queryBuilderExpanded, setQueryBuilderExpanded] = useState(true);
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

  const trapiQuery = buildTrapiQuery();

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
        <div ref={resultsRef}>
          <EnrichmentResultsViewer results={results} />
        </div>
      )}
    </div>
  );
};
