import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Info, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  Play,
  Lightbulb,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { enrichmentAPI, PREDICATES, NODE_CATEGORIES, ASPECT_QUALIFIERS, DIRECTION_QUALIFIERS } from '../utils/api';

const EXAMPLE_QUERIES = [
  {
    label: 'Drugs that treat a Disease',
    description: 'e.g., MONDO:0004975 (Alzheimer disease)',
    value: 'biolink:Drug-biolink:treats-biolink:Disease',
    example: 'MONDO:0004975',
    exampleIsTarget: true
  },
  {
    label: 'Genes associated with a Disease',
    description: 'e.g., DOID:0050430 (Alzheimer disease)',
    value: 'biolink:Gene-biolink:genetically_associated_with-biolink:Disease',
    example: 'DOID:0050430',
    exampleIsTarget: true
  },
  {
    label: 'Phenotypes of a Disease',
    description: 'e.g., MONDO:0005147 (Type 1 diabetes)',
    value: 'biolink:Disease-biolink:has_phenotype-biolink:PhenotypicFeature',
    example: 'MONDO:0005147',
    exampleIsTarget: false
  },
  {
    label: 'Genes affecting a Phenotype',
    description: 'e.g., HP:0003637 (Myasthenia)',
    value: 'biolink:Gene-biolink:affects-biolink:PhenotypicFeature',
    example: 'HP:0003637',
    exampleIsTarget: true
  },
  {
    label: 'Phenotypes of a Gene',
    description: 'e.g., NCBIGene:122481',
    value: 'biolink:Gene-biolink:has_phenotype-biolink:PhenotypicFeature',
    example: 'NCBIGene:122481',
    exampleIsTarget: false
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
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

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
  
  const handleExampleQuery = (exampleValue: string, exampleId: string, exampleIsTarget: boolean, idx: number) => {
    const [source, pred, target] = exampleValue.split('-');
    setSourceCategory(source);
    setPredicate(pred);
    setTargetCategory(target);
    setSelectedExample(idx);
    
    if (exampleIsTarget) {
      setSourceId('');
      setTargetId(exampleId);
    } else {
      setSourceId(exampleId);
      setTargetId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      console.error('Error submitting job:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to submit query');
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryName = (cat: string) => {
    return cat.replace('biolink:', '').replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <div className="space-y-6">
      {/* Example Queries */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <label className="text-sm font-semibold text-slate-700">
            Quick Start Templates
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {EXAMPLE_QUERIES.map((query, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleQuery(query.value, query.example, query.exampleIsTarget, idx)}
              className={`
                text-left px-4 py-3 rounded-xl border-2 transition-all duration-200
                ${selectedExample === idx 
                  ? 'border-purple-500 bg-purple-50 shadow-sm' 
                  : 'border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${selectedExample === idx ? 'text-purple-700' : 'text-slate-700'}`}>
                  {query.label}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {query.example}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{query.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-purple-100" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Node Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Node */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              Source Node
            </label>
            <select
              value={sourceCategory}
              onChange={(e) => setSourceCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
            >
              {NODE_CATEGORIES.map((cat, idx) => (
                <option key={`source-${cat}-${idx}`} value={cat}>
                  {formatCategoryName(cat)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="Leave blank to find sources..."
              className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder-slate-400 font-mono text-sm"
            />
          </div>

          {/* Target Node */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
              Target Node
            </label>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
            >
              {NODE_CATEGORIES.map((cat, idx) => (
                <option key={`target-${cat}-${idx}`} value={cat}>
                  {formatCategoryName(cat)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Leave blank to find targets..."
              className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder-slate-400 font-mono text-sm"
            />
          </div>
        </div>

        {/* Predicate */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="w-6 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded" />
            Relationship Predicate
          </label>
          <select
            value={predicate}
            onChange={(e) => setPredicate(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium"
          >
            {PREDICATES.map((pred, idx) => (
              <option key={`pred-${pred}-${idx}`} value={pred}>
                {pred.replace('biolink:', '').replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Qualifiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">
              Aspect Qualifier <span className="text-slate-400">(optional)</span>
            </label>
            <select
              value={aspectQualifier}
              onChange={(e) => setAspectQualifier(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-600 text-sm"
            >
              <option value="">None</option>
              {ASPECT_QUALIFIERS.map((qual, idx) => (
                <option key={`aspect-${qual}-${idx}`} value={qual}>
                  {qual}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">
              Direction Qualifier <span className="text-slate-400">(optional)</span>
            </label>
            <select
              value={directionQualifier}
              onChange={(e) => setDirectionQualifier(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-600 text-sm"
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

        {/* Advanced Parameters Toggle */}
        <div className="border-t border-purple-100 pt-4">
          <button
            type="button"
            onClick={() => setShowParameters(!showParameters)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium text-sm transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Advanced Parameters
            {showParameters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showParameters && (
            <div className="mt-4 p-5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    P-value Threshold
                  </label>
                  <input
                    type="text"
                    value={pvalueThreshold}
                    onChange={(e) => setPvalueThreshold(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Max Results
                  </label>
                  <input
                    type="number"
                    value={resultLength}
                    onChange={(e) => setResultLength(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Predicates to Exclude
                </label>
                <textarea
                  value={predicatesToExclude}
                  onChange={(e) => setPredicatesToExclude(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                  placeholder="Comma-separated list of predicates..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Query...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Enrichment Analysis
            </>
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="flex items-start gap-2 px-4 py-3 bg-purple-50 rounded-xl border border-purple-100">
        <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-purple-700">
          Provide exactly <strong>one CURIE</strong> (either source or target). The system will infer the matching nodes.
        </p>
      </div>
    </div>
  );
};