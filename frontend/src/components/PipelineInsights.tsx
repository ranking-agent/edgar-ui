// PipelineInsights.tsx
// Shows detailed pipeline information from logs when results are empty or limited

import React from 'react';
import { AlertTriangle, Info, CheckCircle, ArrowRight } from 'lucide-react';

interface LogEntry {
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

interface PipelineInsightsProps {
  logs: LogEntry[];
  totalResults: number;
}

export const PipelineInsights: React.FC<PipelineInsightsProps> = ({ logs, totalResults }) => {
  if (!logs || logs.length === 0) return null;
  
  // Extract key metrics from logs
  const lookupLog = logs.find(l => l.message?.includes('Lookup stage complete'));
  const enrichmentLog = logs.find(l => l.message?.includes('Enrichment stage complete'));
  const inferenceLog = logs.find(l => l.message?.includes('Inference lookup returned'));
  const filteringLog = logs.find(l => l.message?.includes('Inference filtering complete'));
  const finalizationLog = logs.find(l => l.message?.includes('EDGAR finalization complete'));

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

  // Determine where the pipeline "broke down"
  const getInsight = () => {
    if (lookupCount === 0) {
      return {
        type: 'error',
        title: 'No Lookup Results',
        message: 'The query entity was not found in the knowledge graph, or no related entities were discovered.',
        suggestion: 'Try a different entity or check the CURIE identifier.'
      };
    }
    
    if (totalEnrichments === 0) {
      return {
        type: 'warning',
        title: 'No Enrichments Found',
        message: `Found ${lookupCount} lookup result(s), but no statistically significant enrichments were discovered.`,
        suggestion: 'Try increasing the p-value threshold or using a different predicate.'
      };
    }
    
    if (enrichmentsAfterFilter === 0) {
      return {
        type: 'warning',
        title: 'All Enrichments Filtered',
        message: `Found ${totalEnrichments} enrichments, but all were filtered out by the p-value threshold.`,
        suggestion: 'Try increasing the p-value threshold (e.g., from 1e-5 to 1e-3).'
      };
    }
    
    if (totalInferences === 0) {
      return {
        type: 'warning',
        title: 'No Inference Candidates',
        message: `Found ${enrichmentsAfterFilter} enrichments, but no inference candidates were discovered.`,
        suggestion: 'The enriched features may not connect to any new entities of the target type.'
      };
    }
    
    if (uniqueInferred === 0 && totalInferences > 0) {
      return {
        type: 'info',
        title: 'Inferences Filtered Out',
        message: `Found ${totalInferences} inference candidates, but none passed final filtering (may be duplicates of lookup results).`,
        suggestion: 'The inferred entities may already be in the lookup set, or predicate constraints filtered them out.'
      };
    }
    
    return null;
  };

  const insight = getInsight();
  
  // Only show if there's an issue to explain
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

      {/* Suggestion */}
      {insight?.suggestion && (
        <div className="mt-4 flex items-start gap-2 text-sm text-amber-800 bg-white/50 rounded-lg p-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span><strong>Suggestion:</strong> {insight.suggestion}</span>
        </div>
      )}
    </div>
  );
};

// Missing import - add this at the top
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
