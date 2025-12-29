import React, { useState, useEffect } from 'react';
import { Search, Info, Settings, ChevronDown, ChevronUp, SearchCode } from 'lucide-react';
import { enrichmentAPI, PREDICATES, NODE_CATEGORIES, ASPECT_QUALIFIERS, DIRECTION_QUALIFIERS } from '../utils/api';

const EXAMPLE_QUERIES = [
  {
    label: 'What Drugs treats Disease Y eg. MONDO:0004975?',
    value: 'biolink:Drug-biolink:treats-biolink:Disease',
    example: 'MONDO:0004975',
    exampleIsTarget: true  // Disease is the TARGET of "treats"
  },
  {
    label: 'What Genes are genetically associated with Disease X eg. DOID:0050430?',
    value: 'biolink:Gene-biolink:genetically_associated_with-biolink:Disease',
    example: 'DOID:0050430',
    exampleIsTarget: true  // Disease is the TARGET
  },
  {
    label: 'What are the Phenotypes of Disease X eg. MONDO:0005147?',
    value: 'biolink:Disease-biolink:has_phenotype-biolink:PhenotypicFeature',
    example: 'MONDO:0005147',
    exampleIsTarget: false  // Disease is the SOURCE (subject)
  },
  {
    label: 'What are the Genes that affects Phenotype X eg. HP:0003637?',
    value: 'biolink:Gene-biolink:affects-biolink:PhenotypicFeature',
    example: 'HP:0003637',
    exampleIsTarget: true  // Phenotype is the TARGET
  },
  {
    label: 'What are the Phenotypes of Gene X eg. NCBIGene:122481?',
    value: 'biolink:Gene-biolink:has_phenotype-biolink:PhenotypicFeature',
    example: 'NCBIGene:122481',
    exampleIsTarget: false  // Gene is the SOURCE (subject)
  }
];


interface QueryBuilderProps {
  onJobCreated: (jobId: string) => void;
  onQueryPreview?: (query: any) => void; 
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onJobCreated, onQueryPreview }) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceCategory, setSourceCategory] = useState('biolink:Disease');
  const [targetCategory, setTargetCategory] = useState('biolink:Drug');
  const [predicate, setPredicate] = useState('biolink:treats');
  const [aspectQualifier, setAspectQualifier] = useState('');
  const [directionQualifier, setDirectionQualifier] = useState('');
  const [showParameters, setShowParameters] = useState(false);
  const [pvalueThreshold, setPvalueThreshold] = useState('1e-5');
  const [resultLength, setResultLength] = useState('100');
  const [predicatesToExclude, setPredicatesToExclude] = useState('causes, biomarker_for, contraindicated_for, contraindicated_in, contributes_to, has_adverse_event, causes_adverse_event, treats_or_applied_or_studied_to_treat');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildTrapiQuery = () => {
    const qualifierConstraints = [];
  
    if (aspectQualifier || directionQualifier) {
      const qualifierSet: any[] = [];
      if (aspectQualifier) {
        qualifierSet.push({
          qualifier_type_id: 'biolink:object_aspect_qualifier',
          qualifier_value: aspectQualifier,
        });
      }
      if (directionQualifier) {
        qualifierSet.push({
          qualifier_type_id: 'biolink:object_direction_qualifier',
          qualifier_value: directionQualifier,
        });
      }
      qualifierConstraints.push({ qualifier_set: qualifierSet });
    }
  
    return {
      message: {
        query_graph: {
          nodes: {
            n0: sourceId
              ? { ids: [sourceId], categories: [sourceCategory] }
              : { categories: [sourceCategory] },
            n1: targetId
              ? { ids: [targetId], categories: [targetCategory] }
              : { categories: [targetCategory] },
          },
          edges: {
            e0: {
              subject: "n0",
              object: "n1",
              predicates: [predicate],
              knowledge_type: "inferred",
              attribute_constraints: [],
              qualifier_constraints: qualifierConstraints,
            },
          },
        },
      },
    };
  };
  
  useEffect(() => {
    onQueryPreview?.(buildTrapiQuery());
  }, [
    sourceId,
    targetId,
    sourceCategory,
    targetCategory,
    predicate,
    aspectQualifier,
    directionQualifier,
    predicatesToExclude,
    pvalueThreshold,
    resultLength,
  ]);
  
  
  const handleExampleQuery = (exampleValue: string, exampleId: string, exampleIsTarget: boolean) => {
    const [source, pred, target] = exampleValue.split('-');
    setSourceCategory(source);
    setPredicate(pred);
    setTargetCategory(target);
    
    // Set the CURIE in the correct position based on exampleIsTarget
    if (exampleIsTarget) {
      setSourceId('');  // Clear source - we want to find what connects TO this target
      setTargetId(exampleId);  // Example CURIE goes in target
    } else {
      setSourceId(exampleId);  // Example CURIE goes in source
      setTargetId('');  // Clear target - we want to find what this source connects TO
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if ((!sourceId && !targetId) || (sourceId && targetId)) {
      setError('Please provide exactly ONE CURIE (either source OR target)');
      return;
    }

    if (!predicate) {
      setError('Please select a predicate');
      return;
    }

    const curie = sourceId || targetId;
    if (!curie.includes(':')) {
      setError('CURIE must be in format PREFIX:ID (e.g., MONDO:0004975)');
      return;
    }

    setLoading(true);

    try {
      // Build qualifier constraints
      const qualifierConstraints = [];
      if (aspectQualifier || directionQualifier) {
        const qualifierSet = [];
        if (aspectQualifier) {
          qualifierSet.push({
            qualifier_type_id: 'biolink:object_aspect_qualifier',
            qualifier_value: aspectQualifier
          });
        }
        if (directionQualifier) {
          qualifierSet.push({
            qualifier_type_id: 'biolink:object_direction_qualifier',
            qualifier_value: directionQualifier
          });
        }
        qualifierConstraints.push({ qualifier_set: qualifierSet });
      }

      // Build TRAPI query
      const query: any = {
        message: {
          query_graph: {
            nodes: {
              n0: sourceId ? {
                ids: [sourceId],
                categories: [sourceCategory]
              } : {
                categories: [sourceCategory]
              },
              n1: targetId ? {
                ids: [targetId],
                categories: [targetCategory]
              } : {
                categories: [targetCategory]
              }
            },
            edges: {
              e0: {
                subject: "n0",
                object: "n1",
                predicates: [predicate],
                knowledge_type: "inferred",
                attribute_constraints: [],
                qualifier_constraints: qualifierConstraints
              }
            }
          }
        }
      };
      if (onQueryPreview) {onQueryPreview(query);}

      // Add parameters if configured
      if (showParameters) {
        const excludeList = predicatesToExclude
          .split(',')
          .map(p => p.trim())
          .filter(p => p)
          .map(p => p.startsWith('biolink:') ? p : `biolink:${p}`);

        query.parameters = {
          pvalue_threshold: parseFloat(pvalueThreshold),
          result_length: parseInt(resultLength, 10),
          predicates_to_exclude: excludeList
        };
      }

      const response = await enrichmentAPI.submitAnalysis(query);
      onJobCreated(response.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <SearchCode className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Build Query</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Example Queries Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Example Query Patterns (Optional)
          </label>
          <select
            onChange={(e) => {
              const selected = EXAMPLE_QUERIES.find(q => q.value === e.target.value);
              if (selected) {
                handleExampleQuery(selected.value, selected.example, selected.exampleIsTarget);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an example query pattern...</option>
            {EXAMPLE_QUERIES.map((query, idx) => (
              <option key={`${query.value}-${idx}`} value={query.value}>
                {query.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source Node */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Type
            </label>
            <select
              value={sourceCategory}
              onChange={(e) => setSourceCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {NODE_CATEGORIES.map((cat, idx) => (
                <option key={`source-${cat}-${idx}`} value={cat}>
                  {cat.replace('biolink:', '')}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="Leave blank if this is the return node(s)..."
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Target Node */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Type
            </label>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {NODE_CATEGORIES.map((cat, idx) => (
                <option key={`target-${cat}-${idx}`} value={cat}>
                  {cat.replace('biolink:', '')}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Leave blank if this is the return node(s)..."
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Predicate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Predicate
          </label>
          <select
            value={predicate}
            onChange={(e) => setPredicate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PREDICATES.map((pred, idx) => (
              <option key={`pred-${pred}-${idx}`} value={pred}>
                {pred.replace('biolink:', '')}
              </option>
            ))}
          </select>
        </div>

        {/* Qualifiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Object Aspect Qualifier (Optional)
            </label>
            <select
              value={aspectQualifier}
              onChange={(e) => setAspectQualifier(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              {ASPECT_QUALIFIERS.map((qual, idx) => (
                <option key={`aspect-${qual}-${idx}`} value={qual}>
                  {qual}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Object Direction Qualifier (Optional)
            </label>
            <select
              value={directionQualifier}
              onChange={(e) => setDirectionQualifier(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              {DIRECTION_QUALIFIERS.map((qual, idx) => (
                <option key={`direction-${qual}-${idx}`} value={qual}>
                  {qual}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameters Section */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowParameters(!showParameters)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <Settings className="w-5 h-5" />
            Advanced Parameters
            {showParameters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showParameters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    P-value Threshold
                  </label>
                  <input
                    type="text"
                    value={pvalueThreshold}
                    onChange={(e) => setPvalueThreshold(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Result Length
                  </label>
                  <input
                    type="number"
                    value={resultLength}
                    onChange={(e) => setResultLength(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Predicates to Exclude (comma-separated)
                </label>
                <textarea
                  value={predicatesToExclude}
                  onChange={(e) => setPredicatesToExclude(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          {loading ? 'Submitting Query...' : 'Run Enrichment Analysis'}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500">
        <Info className="inline w-4 h-4 mr-1" />
        Provide exactly ONE CURIE (either source OR target). The other will be inferred.
      </div>
    </div>
  );
};