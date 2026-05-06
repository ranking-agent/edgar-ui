import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Info, AlertCircle, ChevronDown, ChevronUp, BarChart, Loader2, Search, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { EnrichmentResultsViewer } from './EnrichmentResultsViewer';
import { AC_URL, PREDICATES, NODE_CATEGORIES, ASPECT_QUALIFIERS, COMMON_CHEMICALS, COMMON_DISEASES, COMMON_GENES, COMMON_PHENOTYPES } from '../utils/api';

// Qualified predicates that support aspect/direction qualifiers
const QUALIFIED_PREDICATES = ['biolink:affects', 'biolink:regulates'];

// Direction qualifiers specific to each qualified predicate
const DIRECTION_QUALIFIERS_BY_PREDICATE: Record<string, string[]> = {
  'biolink:affects': ['increased', 'decreased'],
  'biolink:regulates': ['upregulated', 'downregulated'],
};

interface EnrichmentQuery {
  inputCategory: string;
  outputCategory: string;
  predicate: string;
  memberIds: string[];
  setInterpretation: 'BATCH' | 'MANY' | 'ALL';
  aspectQualifier: string;
  directionQualifier: string;
  maxResults: string;
}

interface MemberIdWithLabel {
  id: string;
  label?: string;
}

// Map input categories to their example IDs
const EXAMPLE_IDS_BY_CATEGORY: Record<string, typeof COMMON_PHENOTYPES> = {
  'biolink:PhenotypicFeature': COMMON_PHENOTYPES,
  'biolink:Gene': COMMON_GENES,
  'biolink:Disease': COMMON_DISEASES,
  'biolink:ChemicalEntity': COMMON_CHEMICALS,
  'biolink:BiologicalProcess': [],
};

// Helper function to debounce
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const EnrichmentAnalysis: React.FC = () => {
  const [query, setQuery] = useState<EnrichmentQuery>({
    inputCategory: 'biolink:PhenotypicFeature',
    outputCategory: 'biolink:Disease',
    predicate: 'biolink:has_phenotype',
    memberIds: ['HP:0000739', 'HP:0001288', 'HP:0001252'],
    setInterpretation: 'MANY',
    aspectQualifier: '',
    directionQualifier: '',
    maxResults: '',
  });
  
  // Member ID labels map
  const [memberIdLabels, setMemberIdLabels] = useState<Record<string, string>>({
    'HP:0000739': 'Anxiety',
    'HP:0001288': 'Gait disturbance',
    'HP:0001252': 'Hypotonia',
  });
  
  const [customId, setCustomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'answercoalesce' | 'generic'>('generic');
  const [queryBuilderExpanded, setQueryBuilderExpanded] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Autocomplete states
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  // Autocomplete search function
  const searchNodes = async (searchQuery: string): Promise<any[]> => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    try {
      const response = await fetch(`https://name-resolution-sri.renci.org/lookup?string=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  };

  // Debounced search
  const handleSearch = debounce(async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    const results = await searchNodes(value);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setIsSearching(false);
  }, 500);

  const selectSuggestion = (suggestion: any) => {
    const id = suggestion.curie;
    const label = suggestion.label;
    
    if (!query.memberIds.includes(id)) {
      setQuery({ ...query, memberIds: [...query.memberIds, id] });
      setMemberIdLabels({ ...memberIdLabels, [id]: label });
    }
    
    setCustomId('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const addMemberId = (id: string) => {
    if (id && !query.memberIds.includes(id)) {
      setQuery({ ...query, memberIds: [...query.memberIds, id] });
      setCustomId('');
    }
  };

  const removeMemberId = (id: string) => {
    setQuery({ ...query, memberIds: query.memberIds.filter((mid) => mid !== id) });
    const newLabels = { ...memberIdLabels };
    delete newLabels[id];
    setMemberIdLabels(newLabels);
  };

  const buildTrapiQuery = () => {
    const qualifierConstraints: any[] = [];
  
    if (query.aspectQualifier || query.directionQualifier) {
      const qualifierSet: any[] = [];
      if (query.aspectQualifier) {
        qualifierSet.push({
          qualifier_type_id: 'biolink:object_aspect_qualifier',
          qualifier_value: query.aspectQualifier,
        });
      }
      if (query.directionQualifier) {
        qualifierSet.push({
          qualifier_type_id: 'biolink:object_direction_qualifier',
          qualifier_value: query.directionQualifier,
        });
      }
      qualifierConstraints.push({ qualifier_set: qualifierSet });
    }

    const trapiQuery: any = {
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
              ...(qualifierConstraints.length > 0 && { qualifier_constraints: qualifierConstraints }),
            },
          },
        },
      },
    };

    // Add parameters if max_results is specified
    const parsedMaxResults = parseInt(query.maxResults, 10)
    if (!isNaN(parsedMaxResults) && parsedMaxResults > 0) {
      trapiQuery.parameters = {
        max_results: parsedMaxResults,
      };
    }

    return trapiQuery;
  };

  const runEnrichment = async () => {
    setLoading(true);
    setError('');
    setErrorType('generic');
    setResults(null);
    setQueryBuilderExpanded(true);

    try {
      const trapiQuery = buildTrapiQuery();
      console.log('Sending query to AnswerCoalesce:', trapiQuery);

      const response = await axios.post(AC_URL, trapiQuery, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minute timeout
      });

      setResults(response.data);
      setQueryBuilderExpanded(false);
    } catch (err: any) {
      console.error('Error running enrichment:', err);
      
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to run enrichment analysis';
      
      // Check if it's an AnswerCoalesce specific error
      if (errorMessage.toLowerCase().includes('answercoalesce') || 
          err.response?.status === 500 ||
          err.response?.status === 502 ||
          err.response?.status === 503 ||
          err.response?.status === 504) {
        setErrorType('answercoalesce');
      } else {
        setErrorType('generic');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const trapiQuery = buildTrapiQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Enrichment Analysis</h2>
            <p className="text-sm text-slate-500">Powered by AnswerCoalesce</p>
          </div>
        </div>
        <p className="text-slate-600">
          Build custom TRAPI queries for enrichment analysis using phenotypic features, diseases,
          genes, and more.
        </p>
      </div>

      {/* Show Query Builder Toggle */}
      {!queryBuilderExpanded && results && (
        <button
          onClick={() => setQueryBuilderExpanded(true)}
          className="fixed left-6 top-36 z-40 flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 rounded-xl shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-200 text-purple-700 hover:text-purple-900 font-medium text-sm"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          Show Query Builder
        </button>
      )}

      <div className={`grid gap-6 transition-all duration-300 ${
        queryBuilderExpanded ? 'lg:grid-cols-5' : 'grid-cols-1'
      }`}>
        {/* Left Column - Build Query (wider: 3/5) */}
        {queryBuilderExpanded && (
          <>
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50/50 border-b border-purple-100/60">
                <h3 className="text-lg font-semibold text-slate-900">Build Query</h3>
                {results && (
                  <button
                    onClick={() => setQueryBuilderExpanded(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                    Collapse
                  </button>
                )}
              </div>
              
              <div className="p-6 space-y-5">
                {/* Category Selection Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      Input Category
                    </label>
                    <select
                      value={query.inputCategory}
                      onChange={(e) => setQuery({ ...query, inputCategory: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
                    >
                      {NODE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('biolink:', '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
                      Output Category
                    </label>
                    <select
                      value={query.outputCategory}
                      onChange={(e) => setQuery({ ...query, outputCategory: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
                    >
                      {NODE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('biolink:', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Predicate */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded" />
                    Predicate
                  </label>
                  <select
                    value={query.predicate}
                    onChange={(e) => {
                      const newPredicate = e.target.value;
                      setQuery({ 
                        ...query, 
                        predicate: newPredicate,
                        // Clear qualifiers if switching to non-qualified predicate
                        aspectQualifier: QUALIFIED_PREDICATES.includes(newPredicate) ? query.aspectQualifier : '',
                        directionQualifier: QUALIFIED_PREDICATES.includes(newPredicate) ? '' : '',
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
                  >
                    {PREDICATES.map((pred) => (
                      <option key={pred} value={pred}>
                        {pred.replace('biolink:', '').replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qualifiers - Only show for qualified predicates */}
                {QUALIFIED_PREDICATES.includes(query.predicate) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Qualifiers available for "{query.predicate.replace('biolink:', '').replace(/_/g, ' ')}"
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">
                          Aspect Qualifier <span className="text-slate-400">(optional)</span>
                        </label>
                        <select
                          value={query.aspectQualifier}
                          onChange={(e) => setQuery({ ...query, aspectQualifier: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-600 text-sm"
                        >
                          <option value="">None</option>
                          {ASPECT_QUALIFIERS.map((qual) => (
                            <option key={qual} value={qual}>{qual}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">
                          Direction Qualifier <span className="text-slate-400">(optional)</span>
                        </label>
                        <select
                          value={query.directionQualifier}
                          onChange={(e) => setQuery({ ...query, directionQualifier: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-600 text-sm"
                        >
                          <option value="">None</option>
                          {(DIRECTION_QUALIFIERS_BY_PREDICATE[query.predicate] || []).map((qual) => (
                            <option key={qual} value={qual}>{qual}</option>
                          ))}
                        </select>
                        <p className="text-xs text-amber-700">
                          {query.predicate === 'biolink:affects' 
                            ? 'Use "increased" or "decreased" for affects' 
                            : 'Use "upregulated" or "downregulated" for regulates'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Set Interpretation and Max Results Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Set Interpretation</label>
                    <select
                      value={query.setInterpretation}
                      onChange={(e) => setQuery({ ...query, setInterpretation: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
                    >
                      <option value="MANY">MANY (any member)</option>
                      <option value="BATCH">BATCH (treat as batch)</option>
                      <option value="ALL">ALL (all members)</option>
                    </select>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      MANY: Results for any member. ALL: Results for all members.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Max Results</label>
                    <input
                      type="number"
                      value={query.maxResults}
                      onChange={(e) => setQuery({ ...query, maxResults: e.target.value })}
                      placeholder="e.g., 100"
                      className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-mono"
                      min="1"
                      max="10000"
                    />
                    <p className="text-xs text-slate-500">
                      Leave empty for all results
                    </p>
                  </div>
                </div>

                {/* Member IDs with Autocomplete */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Member IDs ({query.memberIds.length})
                  </label>

                  {/* Quick Add Examples */}
                  {EXAMPLE_IDS_BY_CATEGORY[query.inputCategory]?.length > 0 && (
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">Quick Add:</label>
                      <div className="flex flex-wrap gap-2">
                        {EXAMPLE_IDS_BY_CATEGORY[query.inputCategory].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (!query.memberIds.includes(item.id)) {
                                setQuery({ ...query, memberIds: [...query.memberIds, item.id] });
                                setMemberIdLabels({ ...memberIdLabels, [item.id]: item.label });
                              }
                            }}
                            disabled={query.memberIds.includes(item.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                              query.memberIds.includes(item.id)
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
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

                  {/* Autocomplete Input */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={inputRef}
                          type="text"
                          value={customId}
                          onChange={(e) => {
                            setCustomId(e.target.value);
                            handleSearch(e.target.value);
                          }}
                          onFocus={() => customId.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          onKeyPress={(e) => e.key === 'Enter' && addMemberId(customId)}
                          placeholder="Search by name or enter CURIE (e.g., HP:0000001)"
                          className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm pr-10"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
                        )}
                      </div>
                      <button
                        onClick={() => addMemberId(customId)}
                        disabled={!customId}
                        className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => selectSuggestion(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-purple-50 last:border-0"
                          >
                            <div className="font-medium text-slate-900 text-sm">{suggestion.label}</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">{suggestion.curie}</div>
                            {suggestion.types && suggestion.types.length > 0 && (
                              <div className="text-xs text-purple-600 mt-1">
                                {suggestion.types[0].replace('biolink:', '')}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Member IDs */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                    {query.memberIds.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No member IDs added yet. Search above or use Quick Add.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {query.memberIds.map((id) => {
                          const label = memberIdLabels[id] || 
                            [...COMMON_PHENOTYPES, ...COMMON_GENES, ...COMMON_DISEASES, ...COMMON_CHEMICALS]
                              .find((p) => p.id === id)?.label;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 group hover:border-purple-200 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-mono text-sm text-slate-900">{id}</span>
                                {label && (
                                  <span className="ml-2 text-xs text-slate-500 truncate">
                                    ({label})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removeMemberId(id)}
                                className="text-slate-400 hover:text-red-600 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
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

                {/* Submit Button */}
                <button
                  onClick={runEnrichment}
                  disabled={loading || query.memberIds.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Run Enrichment Analysis
                    </>
                  )}
                </button>

                {/* Error Display - AnswerCoalesce style */}
                {error && errorType === 'answercoalesce' && (
                  <div className="flex items-start gap-3 px-4 py-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-amber-800 mb-1">
                        External Service Issue
                      </div>
                      <div className="text-xs text-amber-700 mb-3">
                        The AnswerCoalesce service encountered an error while processing your query.
                      </div>
                      <div className="text-xs text-amber-600">
                        <div className="font-semibold mb-1.5">Suggestions:</div>
                        <ul className="list-disc list-inside space-y-1 ml-1">
                          <li>Try a more specific query with fewer member IDs</li>
                          <li>Change the set interpretation to BATCH</li>
                          <li>Wait a few minutes and try again</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generic Error Display */}
                {error && errorType === 'generic' && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - TRAPI Preview (narrower: 2/5) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 overflow-hidden sticky top-32">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white">TRAPI Query Preview</h3>
                  <p className="text-sm text-slate-400">Live preview of your query</p>
                </div>
                
                <div className="bg-slate-900">
                  <div className="p-4 overflow-x-auto max-h-[500px] custom-scrollbar">
                    <pre className="text-sm text-emerald-400 font-mono leading-relaxed">
                      {JSON.stringify(trapiQuery, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-purple-50 border-t border-purple-100">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-purple-700">
                      Target: <a href="https://answercoalesce.renci.org/docs" target="_blank" rel="noopener noreferrer" className="font-mono text-purple-600 text-xs underline hover:text-purple-800 transition-colors">{AC_URL}</a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Results */}
      {results && (
        <div ref={resultsRef}>
          <EnrichmentResultsViewer results={results} />
        </div>
      )}
    </div>
  );
};