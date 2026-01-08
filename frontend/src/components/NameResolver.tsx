import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy,
  Sparkles,
  Tag,
  Info,
  ChevronDown,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';

const RESOLVER_URL = (params: string) =>
  `https://robokop-name-resolver.apps.renci.org/lookup?string=${encodeURIComponent(
    params
  )}&autocomplete=true&highlighting=false&offset=0&limit=10`;

interface ResolvedName {
  curie: string;
  label: string;
  synonyms: string[];
  types?: string[];
  score?: number;
}

export const ResolveName: React.FC = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResolvedName[]>([]);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSynonyms, setExpandedSynonyms] = useState<Set<number>>(new Set());

  const resolveName = async () => {
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setExpandedSynonyms(new Set());

    try {
      const response = await axios.get(RESOLVER_URL(name.trim()));
      const resolved = response.data;
      if (Array.isArray(resolved) && resolved.length > 0) {
        setResults(resolved);   
      } else {
        setError("No results found for this term. Try a different spelling or related term.");
      }
    } catch (err: any) {
      console.error('Error resolving name:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to resolve name');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSynonyms = (idx: number) => {
    const newExpanded = new Set(expandedSynonyms);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedSynonyms(newExpanded);
  };

  const exampleTerms = ['Headache', 'Alzheimer', 'Metformin', 'BRCA1'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Name Resolver
              </h2>
              <p className="text-slate-500">
                Look up biomedical terms and find their standard identifiers
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Enter Term or Synonym
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && resolveName()}
                  placeholder="e.g., Headache, Cancer, Alzheimer..."
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>
              <button
                onClick={resolveName}
                disabled={loading || !name.trim()}
                className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Lookup
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Try these:</span>
            {exampleTerms.map((term) => (
              <button
                key={term}
                onClick={() => setName(term)}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-5 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">No Results Found</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Found {results.length} result{results.length > 1 ? 's' : ''}
            </h3>
          </div>

          {/* Result Cards */}
          {results.map((result, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden"
            >
              {/* Result Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-800">Match #{idx + 1}</span>
                  {result.score !== undefined && (
                    <span className="ml-auto text-sm text-emerald-600 font-mono">
                      Score: {result.score.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Preferred ID Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-purple-100 text-sm font-medium mb-2">
                      <Sparkles className="w-4 h-4" />
                      Preferred Identifier
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold font-mono mb-1">
                          {result.curie}
                        </div>
                        <div className="text-teal-100">{result.label}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.curie)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
                      >
                        {copiedId === result.curie ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Types */}
                {result.types && result.types.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-slate-400" />
                      <h4 className="font-medium text-slate-700">Entity Types</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.types.map((type, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                        >
                          {type.replace('biolink:', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synonyms */}
                {result.synonyms && result.synonyms.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSynonyms(idx)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          expandedSynonyms.has(idx) ? 'rotate-180' : ''
                        }`} 
                      />
                      <h4 className="font-medium text-slate-700">
                        Synonyms
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          ({result.synonyms.length})
                        </span>
                      </h4>
                    </button>

                    {expandedSynonyms.has(idx) && (
                      <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                        <div className="space-y-1.5">
                          {result.synonyms.map((syn, i) => (
                            <div
                              key={i}
                              className="group flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors"
                            >
                              <span className="text-sm text-slate-700">{syn}</span>
                              <button
                                onClick={() => copyToClipboard(syn)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copiedId === syn ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Raw JSON */}
          <details className="group bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
            <summary className="cursor-pointer px-6 py-4 font-semibold text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-2 bg-slate-50">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              View Raw JSON Response
            </summary>
            <div className="bg-slate-900 p-4 overflow-x-auto max-h-80 custom-scrollbar">
              <pre className="text-sm text-emerald-400 font-mono">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-900 mb-2">About Name Resolver</h4>
            <ul className="space-y-1.5 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0" />
                Converts names or synonyms to their preferred identifiers
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0" />
                Provides comprehensive synonym lists from multiple sources
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0" />
                Returns entity types and relevance scores
              </li>
            </ul>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <a
                href="https://robokop-name-resolver.apps.renci.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1"
              >
                SRI Name Resolver Service
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};