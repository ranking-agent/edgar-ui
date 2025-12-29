import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader, Copy, ExternalLink } from 'lucide-react';
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

  const normalizeNode = async () => {
    if (!nodeId.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Node Normalization</h2>
        </div>
        <p className="text-gray-600">
          Normalize biomedical entity identifiers to their preferred CURIEs using the SRI Node
          Normalization service.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter Node ID (CURIE format)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && normalizeNode()}
            placeholder="e.g., MONDO:0005148, NCBIGene:1636, HP:0000739"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={normalizeNode}
            disabled={loading || !nodeId.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Normalizing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Normalize
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Examples:</span>
          {['MONDO:0005148', 'NCBIGene:1636', 'HP:0000739', 'CHEMBL.COMPOUND:CHEMBL25'].map(
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
      {result && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Normalized Result</h3>
          </div>

          {/* Preferred ID */}
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="text-sm text-green-600 font-medium mb-2">Preferred Identifier</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-lg font-semibold text-gray-900">
                  {result.id.identifier}
                </div>
                <div className="text-gray-700 mt-1">{result.id.label}</div>
              </div>
              <button
                onClick={() => copyToClipboard(result.id.identifier)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                {copiedId === result.id.identifier ? (
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

          {/* Types */}
          {result.type && result.type.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Types</h4>
              <div className="flex flex-wrap gap-2">
                {result.type.map((type, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {type.replace('biolink:', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Information Content */}
          {result.information_content !== undefined && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm text-purple-600 font-medium mb-1">Information Content</div>
              <div className="text-2xl font-bold text-purple-900">
                {result.information_content.toFixed(4)}
              </div>
            </div>
          )}

          {/* Equivalent Identifiers */}
          {result.equivalent_identifiers && result.equivalent_identifiers.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Equivalent Identifiers ({result.equivalent_identifiers.length})
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {result.equivalent_identifiers.map((equiv, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-mono text-sm font-semibold text-gray-900">
                            {equiv.identifier}
                          </div>
                          {equiv.label && (
                            <div className="text-sm text-gray-600 mt-1">{equiv.label}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(equiv.identifier)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedId === equiv.identifier ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={`https://biolink.github.io/biolink-model/docs/${equiv.identifier}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="View in Biolink"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="mt-6">
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                View Raw JSON
              </summary>
              <div className="mt-3 bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">About Node Normalization</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Converts entity identifiers to their preferred canonical form</li>
          <li>• Provides equivalent identifiers from multiple sources</li>
          <li>• Returns entity types and metadata</li>
          <li>• Powered by SRI Node Normalization Service v1.5</li>
        </ul>
        <div className="mt-3 text-xs text-blue-600">
          Endpoint:{' '}
          <a
            href="https://nodenormalization-sri.renci.org/1.5/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-800"
          >
            https://nodenormalization-sri.renci.org/1.5/docs
          </a>
        </div>
      </div>
    </div>
  );
};
