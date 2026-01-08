import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  ExternalLink,
  Sparkles,
  Hash,
  Tag,
  Info,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';

const NORMALIZER_URL = 'https://nodenormalization-sri.renci.org/1.5/get_normalized_nodes';

interface NormalizedNode {
  id: {
    identifier: string;
    label: string;
  };
  equivalent_identifiers?: Array<{
    identifier: string;
    label?: string;
  }>;
  type?: string[];
  information_content?: number;
}

export const NormalizeNode: React.FC = () => {
  const [nodeId, setNodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NormalizedNode | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllEquivalents, setShowAllEquivalents] = useState(false);

  const normalizeNode = async () => {
    if (!nodeId.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setShowAllEquivalents(false);

    try {
      const response = await axios.get(NORMALIZER_URL, {
        params: {
          curie: nodeId.trim(),
        },
      });

      const normalized = response.data[nodeId.trim()];
      if (normalized) {
        setResult(normalized);
      } else {
        setError('Node not found in normalization service');
      }
    } catch (err: any) {
      console.error('Error normalizing node:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to normalize node');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exampleCuries = [
    { id: 'MONDO:0005148', label: 'Type 2 Diabetes' },
    { id: 'NCBIGene:1636', label: 'ACE Gene' },
    { id: 'HP:0000739', label: 'Anxiety' },
    { id: 'CHEMBL.COMPOUND:CHEMBL25', label: 'Aspirin' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Node Normalization
              </h2>
              <p className="text-slate-500">
                Resolve biomedical identifiers to their canonical form
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Enter CURIE Identifier
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && normalizeNode()}
                  placeholder="e.g., MONDO:0005148, NCBIGene:1636"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400 font-mono text-sm"
                />
              </div>
              <button
                onClick={normalizeNode}
                disabled={loading || !nodeId.trim()}
                className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Normalize
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Quick examples:</span>
            {exampleCuries.map((example) => (
              <button
                key={example.id}
                onClick={() => setNodeId(example.id)}
                className="px-3 py-1.5 text-sm font-mono bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
              >
                {example.id}
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
            <h3 className="font-semibold text-red-900">Normalization Failed</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
          {/* Success Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-emerald-800">Successfully Normalized</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Preferred Identifier - Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center gap-2 text-purple-100 text-sm font-medium mb-2">
                  <Sparkles className="w-4 h-4" />
                  Preferred Identifier
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold font-mono mb-1">
                      {result.id.identifier}
                    </div>
                    <div className="text-emerald-100 text-lg">{result.id.label}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.id.identifier)}
                    className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    {copiedId === result.id.identifier ? (
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
            {result.type && result.type.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <h4 className="font-semibold text-slate-900">Entity Types</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.type.map((type, idx) => {
                    const displayType = type.replace('biolink:', '');
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                      >
                        {displayType}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Information Content */}
            {result.information_content !== undefined && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-violet-600 font-medium mb-1">Information Content</div>
                    <p className="text-xs text-violet-500">Higher values indicate more specific concepts</p>
                  </div>
                  <div className="text-3xl font-bold text-violet-700 font-mono">
                    {result.information_content.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Equivalent Identifiers */}
            {result.equivalent_identifiers && result.equivalent_identifiers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900">
                      Equivalent Identifiers
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({result.equivalent_identifiers.length})
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-80 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    {(showAllEquivalents 
                      ? result.equivalent_identifiers 
                      : result.equivalent_identifiers.slice(0, 8)
                    ).map((equiv, idx) => (
                      <div
                        key={idx}
                        className="group bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm font-semibold text-slate-900 truncate">
                              {equiv.identifier}
                            </div>
                            {equiv.label && (
                              <div className="text-sm text-slate-500 truncate mt-0.5">
                                {equiv.label}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyToClipboard(equiv.identifier)}
                              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copy identifier"
                            >
                              {copiedId === equiv.identifier ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <a
                              href={`https://biolink.github.io/biolink-model/docs/${equiv.identifier}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View in Biolink"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.equivalent_identifiers.length > 8 && (
                    <button
                      onClick={() => setShowAllEquivalents(!showAllEquivalents)}
                      className="w-full mt-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1"
                    >
                      {showAllEquivalents ? (
                        <>Show Less</>
                      ) : (
                        <>
                          Show {result.equivalent_identifiers.length - 8} more
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Raw JSON Toggle */}
            <details className="group">
              <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-2">
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                View Raw JSON
              </summary>
              <div className="mt-3 bg-slate-900 rounded-xl overflow-hidden">
                <div className="p-4 overflow-x-auto max-h-64 custom-scrollbar">
                  <pre className="text-sm text-emerald-400 font-mono">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">About Node Normalization</h4>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                Converts entity identifiers to their preferred canonical form
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                Provides equivalent identifiers from multiple sources
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                Returns entity types and information content metrics
              </li>
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <a
                href="https://nodenormalization-sri.renci.org/1.5/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                SRI Node Normalization Service v1.5
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};