import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader, Copy } from 'lucide-react';
import axios from 'axios';

const RESOLVER_URL = (params: string) =>
    `https://robokop-name-resolver.apps.renci.org/lookup?string=${encodeURIComponent(
      params
    )}&autocomplete=true&highlighting=false&offset=0&limit=10`;
  

interface ResolveName {
  curie: string;
  label: string;
  synonyms: string[];
  types?: string[];
  score?: number;
}


export const ResolveName: React.FC = () => {
  const [name, setNodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResolveName[]>([]);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resolveName = async () => {
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await axios.get(RESOLVER_URL(name.trim()));
      const resolved = response.data;
      if (Array.isArray(resolved) && resolved.length > 0) {
        setResults(resolved);   
      } else {
        setError("No results found for the synonym.");
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Name Resolver</h2>
        </div>
        <p className="text-gray-600">
          Resolve biomedical name or synonym to their standard CURIEs using the SRI Name Resolver service.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter Name 
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setNodeId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && resolveName()}
            placeholder="e.g., Headache, Cancer, Alzheimer"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={resolveName}
            disabled={loading || !name.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Lookup
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Examples:</span>
          {['Headache', 'Cancer', 'Alzheimer'].map(
            (example) => (
              <button
                key={example}
                onClick={() => setNodeId(example)}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {example}
              </button>
            )
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-6">
        {results.map((result, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">
                Lookup Result {idx + 1}
            </h3>
            </div>

            {/** Preferred ID section */}
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="text-sm text-green-600 font-medium mb-2">
                Preferred Identifier
            </div>
            <div className="flex items-center justify-between">
                <div>
                <div className="font-mono text-lg font-semibold text-gray-900">
                    {result.curie}
                </div>
                <div className="text-gray-700 mt-1">{result.label}</div>
                </div>

                <button
                onClick={() => copyToClipboard(result.curie)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                {copiedId === result.curie ? (
                    <>
                    <CheckCircle className="w-4 h-4" />
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

            {/** Types */}
            {result.types && (
            <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Types</h4>
                <div className="flex flex-wrap gap-2">
                {result.types.map((t, i) => (
                    <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                    {t.replace("biolink:", "")}
                    </span>
                ))}
                </div>
            </div>
            )}

            {/* Information Content */}
            {result.score !== undefined && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm text-purple-600 font-medium mb-1">Score</div>
                <div className="text-2xl font-bold text-purple-900">
                    {result.score.toFixed(4)}
                </div>
                </div>
            )}

            {/** Synonyms */}
            {result.synonyms && result.synonyms.length > 0 && (
            <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                Synonyms ({result.synonyms.length})
                </h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                    {result.synonyms.map((syn, i) => (
                    <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                        <div className="font-mono text-sm font-semibold text-gray-900">
                            {syn}
                        </div>

                        <button
                            onClick={() => copyToClipboard(syn)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                            {copiedId === syn ? (
                            <CheckCircle className="w-4 h-4" />
                            ) : (
                            <Copy className="w-4 h-4" />
                            )}
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            </div>
            )}
        </div>))}

        {/* Raw JSON for the entire list */}
        <div className="mt-6">
            <details>
                <summary className="cursor-pointer font-semibold text-gray-900 hover:text-blue-600">
                View Raw JSON
                </summary>
                <div className="mt-3 bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                    {JSON.stringify(results, null, 2)}
                </pre>
                </div>
            </details>
        </div>
    </div>
    )}

      

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">About Name Resolver</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Converts name or synonyms to their preferred identifiers or canonical form</li>
          <li>• Provides equivalent synonyms from multiple sources</li>
          <li>• Returns entity types and metadata</li>
          <li>• Powered by SRI Name Resolver Service v1.5</li>
        </ul>
        <div className="mt-3 text-xs text-blue-600">
          Endpoint:{' '}
          <a
            href="https://robokop-name-resolver.apps.renci.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-800"
          >
            https://robokop-name-resolver.apps.renci.org/
          </a>
        </div>
      </div>
    </div>
  );
};
