import React from 'react';
import { AlertTriangle, Info, CheckCircle, ArrowRight, RefreshCw, Sliders, Shuffle } from 'lucide-react';

interface LogEntry {
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface RetrySuggestion {
  label: string;
  description: string;
  tweaks: {
    predicate?: string;
    pvalueThreshold?: string;
    ruleLength?: string;
    sourceCategory?: string;
    targetCategory?: string;
    entityId?: string;
    entityName?: string;
    entityIsTarget?: boolean;
  };
}

interface QueryContext {
  sourceCategory: string;
  targetCategory: string;
  predicate: string;
  entityId: string;
  entityName?: string;
  entityIsTarget: boolean;
  pvalueThreshold?: string;
  ruleLength?: string;
}

interface PipelineInsightsProps {
  logs: LogEntry[];
  totalResults: number;
  queryContext?: QueryContext;
  onRetry?: (suggestion: RetrySuggestion) => void;
}

const BROADER_PREDICATES: Record<string, string[]> = {
  'biolink:treats': ['biolink:ameliorates', 'biolink:affects', 'biolink:associated_with'],
  'biolink:ameliorates': ['biolink:affects', 'biolink:associated_with'],
  'biolink:causes': ['biolink:contributes_to', 'biolink:associated_with', 'biolink:correlated_with'],
  'biolink:gene_associated_with_condition': ['biolink:genetically_associated_with', 'biolink:associated_with', 'biolink:correlated_with'],
  'biolink:genetically_associated_with': ['biolink:associated_with', 'biolink:correlated_with'],
  'biolink:expressed_in': ['biolink:active_in', 'biolink:located_in', 'biolink:associated_with'],
  'biolink:actively_involved_in': ['biolink:active_in', 'biolink:associated_with'],
  'biolink:has_phenotype': ['biolink:associated_with', 'biolink:correlated_with'],
  'biolink:disease_has_basis_in': ['biolink:genetically_associated_with', 'biolink:associated_with'],
  'biolink:disrupts': ['biolink:affects', 'biolink:associated_with'],
  'biolink:regulates': ['biolink:affects', 'biolink:associated_with'],
  'biolink:directly_physically_interacts_with': ['biolink:physically_interacts_with', 'biolink:binds', 'biolink:associated_with'],
  'biolink:coexpressed_with': ['biolink:correlated_with', 'biolink:associated_with'],
};

const RELATED_CATEGORIES: Record<string, string[]> = {
  'biolink:Drug': ['biolink:ChemicalEntity'],
  'biolink:ChemicalEntity': ['biolink:Drug'],
  'biolink:Gene': ['biolink:Protein'],
  'biolink:Protein': ['biolink:Gene'],
  'biolink:Disease': ['biolink:PhenotypicFeature'],
  'biolink:PhenotypicFeature': ['biolink:Disease'],
  'biolink:BiologicalProcess': ['biolink:MolecularActivity', 'biolink:Pathway'],
  'biolink:MolecularActivity': ['biolink:BiologicalProcess'],
  'biolink:Pathway': ['biolink:BiologicalProcess'],
  'biolink:AnatomicalEntity': ['biolink:Cell', 'biolink:GrossAnatomicalStructure', 'biolink:CellularComponent'],
  'biolink:Cell': ['biolink:AnatomicalEntity'],
  'biolink:CellularComponent': ['biolink:AnatomicalEntity', 'biolink:Cell'],
  'biolink:GrossAnatomicalStructure': ['biolink:AnatomicalEntity'],
};

function formatCategory(cat: string): string {
  return cat.replace('biolink:', '').replace(/([A-Z])/g, ' $1').trim();
}

function formatPredicate(pred: string): string {
  return pred.replace('biolink:', '').replace(/_/g, ' ');
}

export const PipelineInsights: React.FC<PipelineInsightsProps> = ({ logs, totalResults, queryContext, onRetry }) => {
  if (!logs || logs.length === 0) return null;

  const lookupLog = logs.find(l => l.message?.includes('Lookup stage complete'));
  const enrichmentLog = logs.find(l => l.message?.includes('Enrichment stage complete'));
  const inferenceLog = logs.find(l => l.message?.includes('Inference lookup returned'));
  const filteringLog = logs.find(l => l.message?.includes('Inference filtering complete'));

  const lookupCount = lookupLog?.metadata?.total_lookups || 0;
  const totalEnrichments = enrichmentLog?.metadata?.total_enrichments || 0;
  const enrichmentsAfterFilter = enrichmentLog?.metadata?.total_enrichments_after_filtering || 0;
  const graphEnrichments = enrichmentLog?.metadata?.graph_enrichments || 0;
  const propertyEnrichments = enrichmentLog?.metadata?.property_enrichments || 0;
  const totalInferences = inferenceLog?.metadata?.total_inferences || 0;
  const uniqueInferred = inferenceLog?.metadata?.graph_inferences?.unique ||
                         filteringLog?.metadata?.unique_inferred_nodes || 0;
  const enrichmentsUsed = (filteringLog?.metadata?.graph_enrichments_used || 0) +
                          (filteringLog?.metadata?.property_enrichments_used || 0);

  const buildSuggestions = (): RetrySuggestion[] => {
    if (!queryContext) return [];
    const suggestions: RetrySuggestion[] = [];
    const { predicate, sourceCategory, targetCategory, pvalueThreshold, ruleLength } = queryContext;
    const currentP = parseFloat(pvalueThreshold || '1e-5');
    const currentRules = parseInt(ruleLength || '50', 10);

    if (lookupCount === 0) {
      // Entity not found — only predicate/category changes help here;
      // parameter tweaks (p-value, rules) have no effect without lookups
      if (predicate !== 'biolink:related_to') {
        suggestions.push({
          label: 'Use "related to" predicate',
          description: 'The broadest relationship — finds any known connection',
          tweaks: { predicate: 'biolink:related_to' },
        });
      }
      const broaderPreds = BROADER_PREDICATES[predicate];
      if (broaderPreds) {
        suggestions.push({
          label: `Try "${formatPredicate(broaderPreds[0])}"`,
          description: 'A broader relationship may discover connections',
          tweaks: { predicate: broaderPreds[0] },
        });
      }
      const relatedTargets = RELATED_CATEGORIES[targetCategory];
      if (relatedTargets?.length) {
        suggestions.push({
          label: `Try ${formatCategory(relatedTargets[0])} as target`,
          description: 'A related category may have more connections',
          tweaks: { targetCategory: relatedTargets[0] },
        });
      }
      const relatedSources = RELATED_CATEGORIES[sourceCategory];
      if (relatedSources?.length) {
        suggestions.push({
          label: `Try ${formatCategory(relatedSources[0])} as source`,
          description: 'A related category may have more connections',
          tweaks: { sourceCategory: relatedSources[0] },
        });
      }
    }

    if (totalEnrichments === 0 && lookupCount > 0) {
      // Lookups exist but no enrichments — relax thresholds first
      if (currentP < 0.01) {
        suggestions.push({
          label: 'Relax p-value to 1e-2',
          description: 'A higher threshold catches weaker but potentially valid enrichments',
          tweaks: { pvalueThreshold: '1e-2' },
        });
      }
      if (currentRules < 200) {
        suggestions.push({
          label: `Increase max rules to ${Math.min(currentRules * 2, 200)}`,
          description: 'More rules gives the enrichment stage more material to work with',
          tweaks: { ruleLength: String(Math.min(currentRules * 2, 200)) },
        });
      }
      if (predicate !== 'biolink:related_to') {
        suggestions.push({
          label: 'Use "related to" predicate',
          description: 'A broader predicate may yield enrichments',
          tweaks: { predicate: 'biolink:related_to' },
        });
      }
    }

    if (enrichmentsAfterFilter === 0 && totalEnrichments > 0) {
      // Enrichments found but all filtered — p-value is the bottleneck
      const relaxedP = Math.min(currentP * 100, 0.05);
      suggestions.push({
        label: `Relax p-value to ${relaxedP.toExponential(0)}`,
        description: `${totalEnrichments} enrichments were found but filtered — a looser threshold keeps more`,
        tweaks: { pvalueThreshold: relaxedP.toExponential(0) },
      });
      if (currentRules < 200) {
        suggestions.push({
          label: `Increase max rules to ${Math.min(currentRules * 2, 200)}`,
          description: 'More rules explored means more enrichment candidates survive',
          tweaks: { ruleLength: String(Math.min(currentRules * 2, 200)) },
        });
      }
    }

    if (totalInferences === 0 && enrichmentsAfterFilter > 0) {
      // Enrichments passed but no inferences — try broader predicate or more rules
      if (currentRules < 200) {
        suggestions.push({
          label: `Increase max rules to ${Math.min(currentRules * 2, 200)}`,
          description: 'More inference paths explored from enriched features',
          tweaks: { ruleLength: String(Math.min(currentRules * 2, 200)) },
        });
      }
      if (predicate !== 'biolink:related_to') {
        suggestions.push({
          label: 'Use "related to" predicate',
          description: 'A broader predicate may discover indirect inferences',
          tweaks: { predicate: 'biolink:related_to' },
        });
      }
      const relatedTargets = RELATED_CATEGORIES[targetCategory];
      if (relatedTargets?.length) {
        suggestions.push({
          label: `Try ${formatCategory(relatedTargets[0])} as target`,
          description: 'Enriched features may connect to a related category',
          tweaks: { targetCategory: relatedTargets[0] },
        });
      }
    }

    if (uniqueInferred === 0 && totalInferences > 0) {
      // Inferences found but all filtered out
      if (predicate !== 'biolink:related_to') {
        suggestions.push({
          label: 'Use "related to" predicate',
          description: 'Relaxing the predicate may allow candidates to pass filtering',
          tweaks: { predicate: 'biolink:related_to' },
        });
      }
      if (currentP < 0.01) {
        suggestions.push({
          label: 'Relax p-value to 1e-2',
          description: 'A looser threshold may let inference candidates through',
          tweaks: { pvalueThreshold: '1e-2' },
        });
      }
    }

    // Every suggestion carries the full original query as baseline,
    // with the specific tweak overriding one field
    const baseline: RetrySuggestion['tweaks'] = {
      predicate: queryContext.predicate,
      sourceCategory: queryContext.sourceCategory,
      targetCategory: queryContext.targetCategory,
      pvalueThreshold: queryContext.pvalueThreshold || undefined,
      ruleLength: queryContext.ruleLength || undefined,
      ...(queryContext.entityId ? {
        entityId: queryContext.entityId,
        entityName: queryContext.entityName,
        entityIsTarget: queryContext.entityIsTarget,
      } : {}),
    };

    // Deduplicate by label and skip no-ops
    const seen = new Set<string>();
    return suggestions
      .filter(s => {
        if (seen.has(s.label)) return false;
        if (s.tweaks.predicate && s.tweaks.predicate === predicate) return false;
        if (s.tweaks.targetCategory && s.tweaks.targetCategory === targetCategory) return false;
        if (s.tweaks.sourceCategory && s.tweaks.sourceCategory === sourceCategory) return false;
        seen.add(s.label);
        return true;
      })
      .map(s => ({ ...s, tweaks: { ...baseline, ...s.tweaks } }));
  };

  const getInsight = () => {
    if (lookupCount === 0) {
      return {
        type: 'error',
        title: 'No Lookup Results',
        message: 'The query entity was not found in the knowledge graph, or no related entities were discovered.',
      };
    }
    if (totalEnrichments === 0) {
      return {
        type: 'warning',
        title: 'No Enrichments Found',
        message: `Found ${lookupCount} lookup result(s), but no statistically significant enrichments were discovered.`,
      };
    }
    if (enrichmentsAfterFilter === 0) {
      return {
        type: 'warning',
        title: 'All Enrichments Filtered',
        message: `Found ${totalEnrichments} enrichments, but all were filtered out by the p-value threshold.`,
      };
    }
    if (totalInferences === 0) {
      return {
        type: 'warning',
        title: 'No Inference Candidates',
        message: `Found ${enrichmentsAfterFilter} enrichments, but no inference candidates were discovered.`,
      };
    }
    if (uniqueInferred === 0 && totalInferences > 0) {
      return {
        type: 'info',
        title: 'Inferences Filtered Out',
        message: `Found ${totalInferences} inference candidates, but none passed final filtering (may be duplicates of lookup results).`,
      };
    }
    return null;
  };

  const insight = getInsight();
  const suggestions = buildSuggestions();

  if (totalResults > 0 && !insight) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-900 text-lg">
            {insight?.title || 'Pipeline Summary'}
          </h3>
          {insight && (
            <p className="text-amber-800 mt-1">{insight.message}</p>
          )}
        </div>
      </div>

      {/* Pipeline Flow Visualization */}
      <div className="bg-white/60 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              lookupCount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {lookupCount > 0 ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="mt-2 font-semibold text-gray-900">Lookup</div>
            <div className="text-gray-600">{lookupCount} found</div>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-400" />

          <div className="text-center">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              enrichmentsAfterFilter > 0 ? 'bg-green-100 text-green-700' :
              totalEnrichments > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {enrichmentsAfterFilter > 0 ? <CheckCircle className="w-6 h-6" /> :
               totalEnrichments > 0 ? <Info className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="mt-2 font-semibold text-gray-900">Enrichment</div>
            <div className="text-gray-600">
              {totalEnrichments > 0 ? `${enrichmentsAfterFilter}/${totalEnrichments}` : '0 found'}
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-400" />

          <div className="text-center">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              uniqueInferred > 0 ? 'bg-green-100 text-green-700' :
              totalInferences > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {uniqueInferred > 0 ? <CheckCircle className="w-6 h-6" /> :
               totalInferences > 0 ? <Info className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="mt-2 font-semibold text-gray-900">Inference</div>
            <div className="text-gray-600">
              {totalInferences > 0 ? `${uniqueInferred}/${totalInferences}` : '0 found'}
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-400" />

          <div className="text-center">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              totalResults > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {totalResults > 0 ? <CheckCircle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
            </div>
            <div className="mt-2 font-semibold text-gray-900">Results</div>
            <div className="text-gray-600">{totalResults} final</div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <details className="group">
        <summary className="cursor-pointer text-amber-800 hover:text-amber-900 font-medium flex items-center gap-2">
          <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
          View detailed breakdown
        </summary>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Lookup Results</div>
            <div className="font-semibold text-gray-900">{lookupCount}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Total Enrichments</div>
            <div className="font-semibold text-gray-900">{totalEnrichments}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">After P-value Filter</div>
            <div className="font-semibold text-gray-900">{enrichmentsAfterFilter}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Graph Enrichments</div>
            <div className="font-semibold text-gray-900">{graphEnrichments}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Property Enrichments</div>
            <div className="font-semibold text-gray-900">{propertyEnrichments}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Inference Candidates</div>
            <div className="font-semibold text-gray-900">{totalInferences}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Unique Inferred</div>
            <div className="font-semibold text-gray-900">{uniqueInferred}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-gray-600">Enrichments Used</div>
            <div className="font-semibold text-gray-900">{enrichmentsUsed}</div>
          </div>
        </div>
      </details>

      {/* Clickable Retry Suggestions */}
      {onRetry && suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <RefreshCw className="w-4 h-4" />
            Try a different approach
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onRetry(s)}
                className="group flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-amber-900 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-800 transition-all shadow-sm hover:shadow"
                title={s.description}
              >
                {s.tweaks.predicate ? <Shuffle className="w-3.5 h-3.5 text-amber-500 group-hover:text-purple-500" /> :
                 s.tweaks.pvalueThreshold ? <Sliders className="w-3.5 h-3.5 text-amber-500 group-hover:text-purple-500" /> :
                 <RefreshCw className="w-3.5 h-3.5 text-amber-500 group-hover:text-purple-500" />}
                <span className="font-medium">{s.label}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
