import React, { useState, useEffect, useRef } from 'react';
import { 
  Info,
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  Play,

  Loader2,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import { enrichmentAPI, biolinkAPI, PREDICATES, NODE_CATEGORIES, ASPECT_QUALIFIERS, DIRECTION_QUALIFIERS } from '../utils/api';

// Qualified predicates that support aspect/direction qualifiers
const QUALIFIED_PREDICATES = ['biolink:affects', 'biolink:regulates'];

// Direction qualifiers specific to each qualified predicate
const DIRECTION_QUALIFIERS_BY_PREDICATE: Record<string, string[]> = {
  'biolink:affects': ['increased', 'decreased'],
  'biolink:regulates': ['upregulated', 'downregulated'],
};

const DEFAULT_PVALUE = '1e-5';
const DEFAULT_MAX_RULES = '100';

// Natural-language verb forms: plural (for category subjects) and singular (for entity subjects)
const PREDICATE_PHRASES: Record<string, { plural: string; singular: string }> = {
  'biolink:treats':                                      { plural: 'treat',                                       singular: 'treats' },
  'biolink:affects':                                     { plural: 'affect',                                      singular: 'affects' },
  'biolink:regulates':                                   { plural: 'regulate',                                    singular: 'regulates' },
  'biolink:associated_with':                             { plural: 'are associated with',                         singular: 'is associated with' },
  'biolink:active_in':                                   { plural: 'are active in',                               singular: 'is active in' },
  'biolink:actively_involved_in':                        { plural: 'are actively involved in',                    singular: 'is actively involved in' },
  'biolink:acts_upstream_of':                            { plural: 'act upstream of',                             singular: 'acts upstream of' },
  'biolink:acts_upstream_of_negative_effect':            { plural: 'act upstream of with negative effect on',     singular: 'acts upstream of with negative effect on' },
  'biolink:acts_upstream_of_or_within_negative_effect':  { plural: 'act upstream of or within with negative effect on',  singular: 'acts upstream of or within with negative effect on' },
  'biolink:acts_upstream_of_or_within_positive_effect':  { plural: 'act upstream of or within with positive effect on',  singular: 'acts upstream of or within with positive effect on' },
  'biolink:acts_upstream_of_positive_effect':            { plural: 'act upstream of with positive effect on',     singular: 'acts upstream of with positive effect on' },
  'biolink:affects_response_to':                         { plural: 'affect response to',                          singular: 'affects response to' },
  'biolink:ameliorates':                                 { plural: 'ameliorate',                                  singular: 'ameliorates' },
  'biolink:binds':                                       { plural: 'bind',                                        singular: 'binds' },
  'biolink:capable_of':                                  { plural: 'are capable of',                              singular: 'is capable of' },
  'biolink:catalyzes':                                   { plural: 'catalyze',                                    singular: 'catalyzes' },
  'biolink:causes':                                      { plural: 'cause',                                       singular: 'causes' },
  'biolink:coexists_with':                               { plural: 'coexist with',                                singular: 'coexists with' },
  'biolink:coexpressed_with':                            { plural: 'are coexpressed with',                        singular: 'is coexpressed with' },
  'biolink:colocalizes_with':                            { plural: 'colocalize with',                             singular: 'colocalizes with' },
  'biolink:composed_primarily_of':                       { plural: 'are composed primarily of',                   singular: 'is composed primarily of' },
  'biolink:contraindicated_for':                         { plural: 'are contraindicated for',                     singular: 'is contraindicated for' },
  'biolink:contributes_to':                              { plural: 'contribute to',                               singular: 'contributes to' },
  'biolink:correlated_with':                             { plural: 'are correlated with',                         singular: 'is correlated with' },
  'biolink:decreases_response_to':                       { plural: 'decrease response to',                        singular: 'decreases response to' },
  'biolink:derives_from':                                { plural: 'derive from',                                 singular: 'derives from' },
  'biolink:develops_from':                               { plural: 'develop from',                                singular: 'develops from' },
  'biolink:directly_physically_interacts_with':          { plural: 'directly physically interact with',           singular: 'directly physically interacts with' },
  'biolink:disease_has_basis_in':                        { plural: 'have basis in',                               singular: 'has basis in' },
  'biolink:disrupts':                                    { plural: 'disrupt',                                     singular: 'disrupts' },
  'biolink:expressed_in':                                { plural: 'are expressed in',                             singular: 'is expressed in' },
  'biolink:gene_associated_with_condition':              { plural: 'are associated with',                         singular: 'is associated with' },
  'biolink:gene_product_of':                             { plural: 'are gene products of',                        singular: 'is a gene product of' },
  'biolink:genetically_associated_with':                 { plural: 'are genetically associated with',             singular: 'is genetically associated with' },
  'biolink:genetically_interacts_with':                  { plural: 'genetically interact with',                   singular: 'genetically interacts with' },
  'biolink:has_adverse_event':                           { plural: 'have adverse event',                          singular: 'has adverse event' },
  'biolink:has_input':                                   { plural: 'have as input',                               singular: 'has as input' },
  'biolink:has_output':                                  { plural: 'have as output',                              singular: 'has as output' },
  'biolink:has_part':                                    { plural: 'have as part',                                singular: 'has as part' },
  'biolink:has_participant':                             { plural: 'have as participant',                          singular: 'has as participant' },
  'biolink:has_phenotype':                               { plural: 'exhibit',                                     singular: 'exhibits' },
  'biolink:homologous_to':                               { plural: 'are homologous to',                           singular: 'is homologous to' },
  'biolink:in_taxon':                                    { plural: 'are in taxon',                                singular: 'is in taxon' },
  'biolink:increases_response_to':                       { plural: 'increase response to',                        singular: 'increases response to' },
  'biolink:is_frameshift_variant_of':                    { plural: 'are frameshift variants of',                  singular: 'is a frameshift variant of' },
  'biolink:is_missense_variant_of':                      { plural: 'are missense variants of',                    singular: 'is a missense variant of' },
  'biolink:is_nearby_variant_of':                        { plural: 'are nearby variants of',                      singular: 'is a nearby variant of' },
  'biolink:is_non_coding_variant_of':                    { plural: 'are non-coding variants of',                  singular: 'is a non-coding variant of' },
  'biolink:is_nonsense_variant_of':                      { plural: 'are nonsense variants of',                    singular: 'is a nonsense variant of' },
  'biolink:is_splice_site_variant_of':                   { plural: 'are splice site variants of',                 singular: 'is a splice site variant of' },
  'biolink:is_synonymous_variant_of':                    { plural: 'are synonymous variants of',                  singular: 'is a synonymous variant of' },
  'biolink:located_in':                                  { plural: 'are located in',                              singular: 'is located in' },
  'biolink:negatively_correlated_with':                  { plural: 'are negatively correlated with',              singular: 'is negatively correlated with' },
  'biolink:occurs_in':                                   { plural: 'occur in',                                    singular: 'occurs in' },
  'biolink:overlaps':                                    { plural: 'overlap with',                                singular: 'overlaps with' },
  'biolink:physically_interacts_with':                   { plural: 'physically interact with',                    singular: 'physically interacts with' },
  'biolink:positively_correlated_with':                  { plural: 'are positively correlated with',              singular: 'is positively correlated with' },
  'biolink:precedes':                                    { plural: 'precede',                                     singular: 'precedes' },
  'biolink:produces':                                    { plural: 'produce',                                     singular: 'produces' },
  'biolink:related_to':                                  { plural: 'are related to',                              singular: 'is related to' },
  'biolink:similar_to':                                  { plural: 'are similar to',                              singular: 'is similar to' },
  'biolink:subclass_of':                                 { plural: 'are subclasses of',                           singular: 'is a subclass of' },
};


interface QueryTemplate {
  value: string;
  example: string;
  exampleLabel: string;
  exampleIsTarget: boolean;
  params?: { pvalueThreshold?: string; ruleLength?: string };
}

interface RetryTweaks {
  predicate?: string;
  pvalueThreshold?: string;
  ruleLength?: string;
  sourceCategory?: string;
  targetCategory?: string;
  entityId?: string;
  entityName?: string;
  entityIsTarget?: boolean;
}

interface QueryBuilderProps {
  onJobCreated: (jobId: string) => void;
  onQueryPreview?: (query: any) => void;
  initialTemplate?: QueryTemplate | null;
  onTemplateClear?: () => void;
  retryTweaks?: RetryTweaks | null;
  onRetryApplied?: () => void;
}

// Helper function to debounce
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
    {label.replace('biolink:', '')}
    <button
      type="button"
      onClick={onRemove}
      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

function pluralizeLastWord(text: string): string {
  const words = text.split(' ');
  let last = words[words.length - 1];
  if (last.endsWith('y') && !/[aeiou]y$/i.test(last)) {
    last = last.slice(0, -1) + 'ies';
  } else if (/(?:s|x|z|ch|sh)$/i.test(last)) {
    last = last + 'es';
  } else {
    last = last + 's';
  }
  words[words.length - 1] = last;
  return words.join(' ');
}

function getPredicatePhrase(pred: string): { plural: string; singular: string } {
  const entry = PREDICATE_PHRASES[pred];
  if (entry) return entry;
  const raw = pred.replace('biolink:', '').replace(/_/g, ' ');
  const words = raw.split(' ');
  const hasParticiple = words.some(w => w.endsWith('ed'));
  return {
    plural: hasParticiple ? `are ${raw}` : words[0].endsWith('s') && !words[0].endsWith('ss')
      ? [words[0].slice(0, -1), ...words.slice(1)].join(' ') : raw,
    singular: hasParticiple ? `is ${raw}` : raw,
  };
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onJobCreated, onQueryPreview, initialTemplate, onTemplateClear, retryTweaks, onRetryApplied }) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceCategory, setSourceCategory] = useState('biolink:Drug');
  const [targetCategory, setTargetCategory] = useState('biolink:Disease');
  const [predicate, setPredicate] = useState('biolink:treats');
  const [predicateSearch, setPredicateSearch] = useState('');
  const [showPredicateDropdown, setShowPredicateDropdown] = useState(false);

  // Biolink association map: "Subject|Object" -> valid predicates
  const [associationMap, setAssociationMap] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    biolinkAPI.getAssociations()
      .then(setAssociationMap)
      .catch(() => setAssociationMap(null));
  }, []);

  const validPredicates = associationMap
    ? (associationMap[`${sourceCategory}|${targetCategory}`] ?? PREDICATES)
    : PREDICATES;

  useEffect(() => {
    if (associationMap && !validPredicates.includes(predicate)) {
      const fallback = validPredicates.includes('biolink:related_to')
        ? 'biolink:related_to'
        : validPredicates[0] || 'biolink:related_to';
      setPredicate(fallback);
    }
  }, [sourceCategory, targetCategory, associationMap]);
  const [aspectQualifier, setAspectQualifier] = useState('');
  const [directionQualifier, setDirectionQualifier] = useState('');
  const [speciesQualifier, setSpeciesQualifier] = useState('');
  const [showParameters, setShowParameters] = useState(false);
  const [pvalueThreshold, setPvalueThreshold] = useState(DEFAULT_PVALUE);
  const [resultLength, setResultLength] = useState('');
  const [ruleLength, setRuleLength] = useState(DEFAULT_MAX_RULES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Node types to prioritize
  const [nodesToPrioritize, setNodesToPrioritize] = useState<string[]>([]);
  const [nodeTypeInput, setNodeTypeInput] = useState('');
  const [nodeTypeSuggestions, setNodeTypeSuggestions] = useState<string[]>([]);
  const [showNodeTypeSuggestions, setShowNodeTypeSuggestions] = useState(false);
  const nodeTypeInputRef = useRef<HTMLInputElement>(null);

  // Predicate constraints
  const [predicateConstraintStyle, setPredicateConstraintStyle] = useState<'exclude' | 'include'>('exclude');
  const [predicatesToConstrain, setPredicatesToConstrain] = useState<string[]>([
    'biolink:causes',
    'biolink:biomarker_for',
    'biolink:contraindicated_for',
    'biolink:contributes_to',
    'biolink:has_adverse_event',
    'biolink:causes_adverse_event',
  ]);
  const [predicateInput, setPredicateInput] = useState('');
  const [predicateSuggestions, setPredicateSuggestions] = useState<string[]>([]);
  const [showPredicateSuggestions, setShowPredicateSuggestions] = useState(false);
  const predicateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialTemplate) return;
    const [source, pred, target] = initialTemplate.value.split('-');
    setSourceCategory(source);
    setPredicate(pred);
    setTargetCategory(target);
    if (initialTemplate.exampleIsTarget) {
      setSourceId('');
      setTargetId(initialTemplate.example);
      setTargetNormalizedName(initialTemplate.exampleLabel || '');
      setSourceNormalizedName('');
    } else {
      setSourceId(initialTemplate.example);
      setTargetId('');
      setSourceNormalizedName(initialTemplate.exampleLabel || '');
      setTargetNormalizedName('');
    }
    setPvalueThreshold(initialTemplate.params?.pvalueThreshold ?? DEFAULT_PVALUE);
    setRuleLength(initialTemplate.params?.ruleLength ?? DEFAULT_MAX_RULES);
    onTemplateClear?.();
  }, [initialTemplate]);

  useEffect(() => {
    if (!retryTweaks) return;
    // Tweaks carry the full original query context, so apply everything
    if (retryTweaks.sourceCategory) setSourceCategory(retryTweaks.sourceCategory);
    if (retryTweaks.targetCategory) setTargetCategory(retryTweaks.targetCategory);
    if (retryTweaks.predicate) setPredicate(retryTweaks.predicate);
    if (retryTweaks.pvalueThreshold) setPvalueThreshold(retryTweaks.pvalueThreshold);
    if (retryTweaks.ruleLength) setRuleLength(retryTweaks.ruleLength);
    if (retryTweaks.entityId) {
      if (retryTweaks.entityIsTarget) {
        setTargetId(retryTweaks.entityId);
        setTargetNormalizedName(retryTweaks.entityName || '');
        setSourceId('');
        setSourceNormalizedName('');
      } else {
        setSourceId(retryTweaks.entityId);
        setSourceNormalizedName(retryTweaks.entityName || '');
        setTargetId('');
        setTargetNormalizedName('');
      }
    }
    onRetryApplied?.();
  }, [retryTweaks]);

  // Name resolution states
  const [isNormalizingSource, setIsNormalizingSource] = useState(false);
  const [isNormalizingTarget, setIsNormalizingTarget] = useState(false);
  const [sourceNormalizedName, setSourceNormalizedName] = useState('');
  const [targetNormalizedName, setTargetNormalizedName] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState<any[]>([]);
  const [targetSuggestions, setTargetSuggestions] = useState<any[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  // Handle node type input with suggestions
  const handleNodeTypeInputChange = (value: string) => {
    setNodeTypeInput(value);
    if (value.length > 0) {
      const filtered = NODE_CATEGORIES.filter(
        type => type.toLowerCase().includes(value.toLowerCase()) && !nodesToPrioritize.includes(type)
      );
      setNodeTypeSuggestions(filtered);
      setShowNodeTypeSuggestions(filtered.length > 0);
    } else {
      setNodeTypeSuggestions([]);
      setShowNodeTypeSuggestions(false);
    }
  };

  const addNodeType = (nodeType: string) => {
    const formatted = nodeType.startsWith('biolink:') ? nodeType : `biolink:${nodeType}`;
    if (!nodesToPrioritize.includes(formatted)) {
      setNodesToPrioritize([...nodesToPrioritize, formatted]);
    }
    setNodeTypeInput('');
    setShowNodeTypeSuggestions(false);
  };

  const removeNodeType = (nodeType: string) => {
    setNodesToPrioritize(nodesToPrioritize.filter(n => n !== nodeType));
  };

  // Handle predicate input with suggestions
  const handlePredicateInputChange = (value: string) => {
    setPredicateInput(value);
    if (value.length > 0) {
      const filtered = PREDICATES.filter(
        pred => pred.toLowerCase().includes(value.toLowerCase()) && !predicatesToConstrain.includes(pred)
      );
      setPredicateSuggestions(filtered);
      setShowPredicateSuggestions(filtered.length > 0);
    } else {
      setPredicateSuggestions([]);
      setShowPredicateSuggestions(false);
    }
  };

  const addPredicate = (pred: string) => {
    const formatted = pred.startsWith('biolink:') ? pred : `biolink:${pred}`;
    if (!predicatesToConstrain.includes(formatted)) {
      setPredicatesToConstrain([...predicatesToConstrain, formatted]);
    }
    setPredicateInput('');
    setShowPredicateSuggestions(false);
  };

  const removePredicate = (pred: string) => {
    setPredicatesToConstrain(predicatesToConstrain.filter(p => p !== pred));
  };

  // Autocomplete search function
  const searchNodes = async (query: string): Promise<any[]> => {
    if (!query || query.length < 2) return [];
    
    try {
      const response = await fetch(`https://name-resolution-sri.renci.org/lookup?string=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  };

  // Debounced search for source
  const handleSourceSearch = debounce(async (value: string) => {
    if (value.length < 2) {
      setSourceSuggestions([]);
      setShowSourceDropdown(false);
      return;
    }
    
    setIsNormalizingSource(true);
    const suggestions = await searchNodes(value);
    setSourceSuggestions(suggestions);
    setShowSourceDropdown(suggestions.length > 0);
    setIsNormalizingSource(false);
  }, 500);

  // Debounced search for target
  const handleTargetSearch = debounce(async (value: string) => {
    if (value.length < 2) {
      setTargetSuggestions([]);
      setShowTargetDropdown(false);
      return;
    }
    
    setIsNormalizingTarget(true);
    const suggestions = await searchNodes(value);
    setTargetSuggestions(suggestions);
    setShowTargetDropdown(suggestions.length > 0);
    setIsNormalizingTarget(false);
  }, 500);

  // Handle selecting a source suggestion
  const selectSourceSuggestion = (suggestion: any) => {
    setSourceId(suggestion.curie);
    setSourceNormalizedName(suggestion.label);
    setTargetId('');
    setTargetNormalizedName('');

    const types = suggestion.types || [];
    for (const type of types) {
      const biolinkType = type.startsWith('biolink:') ? type : `biolink:${type}`;
      if (NODE_CATEGORIES.includes(biolinkType)) {
        setSourceCategory(biolinkType);
        break;
      }
    }

    setShowSourceDropdown(false);
    setSourceSuggestions([]);
  };

  // Handle selecting a target suggestion
  const selectTargetSuggestion = (suggestion: any) => {
    setTargetId(suggestion.curie);
    setTargetNormalizedName(suggestion.label);
    setSourceId('');
    setSourceNormalizedName('');

    const types = suggestion.types || [];
    for (const type of types) {
      const biolinkType = type.startsWith('biolink:') ? type : `biolink:${type}`;
      if (NODE_CATEGORIES.includes(biolinkType)) {
        setTargetCategory(biolinkType);
        break;
      }
    }

    setShowTargetDropdown(false);
    setTargetSuggestions([]);
  };

  const buildTrapiQuery = () => {
    const qualifierConstraints = [];

    if (speciesQualifier) {
      qualifierConstraints.push({
        qualifier_set: [{
          qualifier_type_id: 'biolink:species_context_qualifier',
          qualifier_value: speciesQualifier,
        }],
      });
    }

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
  
    const query: any = {
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

    // ALWAYS include default parameters (p-value and predicate constraints)
    // Users can modify these when Advanced Parameters is expanded
    query.parameters = {};

    // P-value threshold - always include (default 1e-5)
    const parsedPvalue = parseFloat(pvalueThreshold);
    if (!isNaN(parsedPvalue)) {
      query.parameters.pvalue_threshold = parsedPvalue;
    }

    // Max results - only if specified and valid (no default)
    const parsedResultLength = parseInt(resultLength, 10);
    if (!isNaN(parsedResultLength) && parsedResultLength > 0) {
      query.parameters.max_results = parsedResultLength;
    }

    // Max rules - always include (default 100)
    const parsedRuleLength = parseInt(ruleLength, 10);
    if (!isNaN(parsedRuleLength) && parsedRuleLength > 0) {
      query.parameters.max_rules = parsedRuleLength;
    }

    // Node constraints - only if specified
    if (nodesToPrioritize.length > 0) {
      query.parameters.nodes_to_prioritize = nodesToPrioritize;
    }

    // Predicate constraints - always include defaults
    if (predicatesToConstrain.length > 0) {
      query.parameters.predicate_constraint_style = predicateConstraintStyle;
      query.parameters.predicate_constraints = predicatesToConstrain;
    }

    return query;
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
    speciesQualifier,
    showParameters,
    pvalueThreshold,
    resultLength,
    ruleLength,
    nodesToPrioritize,
    predicateConstraintStyle,
    predicatesToConstrain,
  ]);
  

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
      const query = buildTrapiQuery();
      
      if (onQueryPreview) {
        onQueryPreview(query);
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Live query description */}
        {(() => {
          const { plural, singular } = getPredicatePhrase(predicate);
          const srcCat = formatCategoryName(sourceCategory);
          const tgtCat = formatCategoryName(targetCategory);
          const src = sourceNormalizedName || sourceId;
          const tgt = targetNormalizedName || targetId;

          return (
            <div className="text-center py-2.5 px-4 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl border border-purple-100/60">
              <p className="text-sm text-slate-600">
                {src && !tgt ? (
                  <>
                    <span className="font-semibold text-fuchsia-700">{pluralizeLastWord(tgtCat)}</span>
                    {' '}that{' '}
                    <span className="font-semibold text-violet-700">{src}</span>
                    {' '}<span className="font-medium text-indigo-500 italic">{singular}</span>
                  </>
                ) : tgt && !src ? (
                  <>
                    <span className="font-semibold text-violet-700">{pluralizeLastWord(srcCat)}</span>
                    {' '}that{' '}<span className="font-medium text-indigo-500 italic">{plural}</span>
                    {' '}<span className="font-semibold text-fuchsia-700">{tgt}</span>
                  </>
                ) : src && tgt ? (
                  <>
                    <span className="font-semibold text-violet-700">{src}</span>
                    {' '}<span className="font-medium text-indigo-500 italic">{singular}</span>
                    {' '}<span className="font-semibold text-fuchsia-700">{tgt}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-violet-700">{pluralizeLastWord(srcCat)}</span>
                    {' '}that{' '}<span className="font-medium text-indigo-500 italic">{plural}</span>
                    {' '}<span className="font-semibold text-fuchsia-700">{pluralizeLastWord(tgtCat)}</span>
                  </>
                )}
              </p>
            </div>
          );
        })()}

        {/* Source → Predicate → Target */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Source Node */}
          <div className={`space-y-3 transition-opacity ${targetId ? 'opacity-40' : ''}`}>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              Source Node
            </label>

            <div className="relative">
              <div className={`flex items-center gap-2 w-full px-4 py-3 border rounded-xl transition-all ${targetId ? 'bg-slate-100 border-slate-200' : 'bg-white border-purple-100 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500'}`}>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => {
                    setSourceId(e.target.value);
                    setSourceNormalizedName('');
                    handleSourceSearch(e.target.value);
                    if (e.target.value) {
                      setTargetId('');
                      setTargetNormalizedName('');
                    }
                  }}
                  onFocus={() => sourceId.length >= 2 && sourceSuggestions.length > 0 && setShowSourceDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
                  disabled={!!targetId}
                  placeholder={targetId ? `Searching all ${pluralizeLastWord(formatCategoryName(sourceCategory))}` : 'e.g., Ibuprofen, CHEBI:5855'}
                  className="flex-1 min-w-0 bg-transparent outline-none placeholder-slate-400 text-sm"
                />
                {sourceNormalizedName && (
                  <span className="flex-shrink-0 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md truncate max-w-[45%]" title={sourceNormalizedName}>
                    {sourceNormalizedName}
                  </span>
                )}
                {isNormalizingSource && (
                  <Loader2 className="flex-shrink-0 w-4 h-4 text-purple-500 animate-spin" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showSourceDropdown && sourceSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {sourceSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => selectSourceSuggestion(suggestion)}
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
          </div>

          {/* Relationship Predicate */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-6 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded" />
              Predicate
            </label>
            <div className="relative">
              <input
                type="text"
                value={showPredicateDropdown ? predicateSearch : predicate.replace('biolink:', '').replace(/_/g, ' ')}
                onChange={(e) => {
                  setPredicateSearch(e.target.value);
                  setShowPredicateDropdown(true);
                }}
                onFocus={(e) => {
                  setPredicateSearch('');
                  setShowPredicateDropdown(true);
                  e.target.select();
                }}
                onBlur={() => setTimeout(() => {
                  setShowPredicateDropdown(false);
                  setPredicateSearch('');
                }, 200)}
                placeholder="Search predicates..."
                className="w-full px-3 py-3 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 font-medium text-sm"
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

              {showPredicateDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {validPredicates
                    .filter(p => p.replace('biolink:', '').replace(/_/g, ' ').toLowerCase().includes(predicateSearch.toLowerCase()))
                    .map((pred, idx) => (
                      <button
                        key={`pred-${pred}-${idx}`}
                        type="button"
                        onMouseDown={() => {
                          setPredicate(pred);
                          if (!QUALIFIED_PREDICATES.includes(pred)) {
                            setAspectQualifier('');
                            setDirectionQualifier('');
                          } else if (pred !== predicate) {
                            setDirectionQualifier('');
                          }
                          setShowPredicateDropdown(false);
                          setPredicateSearch('');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-purple-50 last:border-0 ${
                          pred === predicate
                            ? 'bg-purple-50 text-purple-700 font-semibold'
                            : 'hover:bg-purple-50 text-slate-700'
                        }`}
                      >
                        {pred.replace('biolink:', '').replace(/_/g, ' ')}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Target Node */}
          <div className={`space-y-3 transition-opacity ${sourceId ? 'opacity-40' : ''}`}>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
              Target Node
            </label>

            <div className="relative">
              <div className={`flex items-center gap-2 w-full px-4 py-3 border rounded-xl transition-all ${sourceId ? 'bg-slate-100 border-slate-200' : 'bg-white border-purple-100 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500'}`}>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    setTargetNormalizedName('');
                    handleTargetSearch(e.target.value);
                    if (e.target.value) {
                      setSourceId('');
                      setSourceNormalizedName('');
                    }
                  }}
                  onFocus={() => targetId.length >= 2 && targetSuggestions.length > 0 && setShowTargetDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTargetDropdown(false), 200)}
                  disabled={!!sourceId}
                  placeholder={sourceId ? `Searching all ${pluralizeLastWord(formatCategoryName(targetCategory))}` : 'e.g., Alzheimer, MONDO:0004975'}
                  className="flex-1 min-w-0 bg-transparent outline-none placeholder-slate-400 text-sm"
                />
                {targetNormalizedName && (
                  <span className="flex-shrink-0 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md truncate max-w-[45%]" title={targetNormalizedName}>
                    {targetNormalizedName}
                  </span>
                )}
                {isNormalizingTarget && (
                  <Loader2 className="flex-shrink-0 w-4 h-4 text-purple-500 animate-spin" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showTargetDropdown && targetSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {targetSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => selectTargetSuggestion(suggestion)}
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
          </div>
        </div>


        {/* Qualifiers - Only show for qualified predicates (affects, regulates) */}
        {QUALIFIED_PREDICATES.includes(predicate) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">
                Qualifiers available for "{predicate.replace('biolink:', '').replace(/_/g, ' ')}"
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">
                  Aspect Qualifier <span className="text-slate-400">(optional)</span>
                </label>
                <select
                  value={aspectQualifier}
                  onChange={(e) => setAspectQualifier(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-600 text-sm"
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
                  className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-600 text-sm"
                >
                  <option value="">None</option>
                  {(DIRECTION_QUALIFIERS_BY_PREDICATE[predicate] || []).map((qual, idx) => (
                    <option key={`direction-${qual}-${idx}`} value={qual}>
                      {qual}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-700">
                  {predicate === 'biolink:affects' 
                    ? 'Use "increased" or "decreased" for affects' 
                    : 'Use "upregulated" or "downregulated" for regulates'}
                </p>
              </div>
            </div>
          </div>
        )}

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
            <div className="mt-4 p-5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-5">
              {/* Active Defaults Summary */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                  <Info className="w-3 h-3" />
                  <span className="font-medium">Active Defaults:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {speciesQualifier ? (speciesQualifier === 'NCBITaxon:9606' ? 'Human' : speciesQualifier === 'NCBITaxon:10090' ? 'Mouse' : 'Rat') : 'All species'}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                    p-value: {pvalueThreshold}
                  </span>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-mono">
                    max_rules: {ruleLength}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                    Excluding {predicatesToConstrain.length} predicates
                  </span>
                </div>
              </div>

              {/* Basic Parameters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    P-value Threshold
                  </label>
                  <input
                    type="text"
                    value={pvalueThreshold}
                    onChange={(e) => setPvalueThreshold(e.target.value)}
                    placeholder="e.g., 1e-5"
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">Leave empty for backend default</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Max Results
                  </label>
                  <input
                    type="number"
                    value={resultLength}
                    onChange={(e) => setResultLength(e.target.value)}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                    min="1"
                    max="10000"
                  />
                  <p className="text-xs text-slate-500">Leave empty for all results</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Max Rules
                  </label>
                  <input
                    type="number"
                    value={ruleLength}
                    onChange={(e) => setRuleLength(e.target.value)}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                    min="1"
                    max="1000"
                  />
                  <p className="text-xs text-slate-500">Max enrichment rules to consider</p>
                </div>
              </div>

              {/* Species Context Qualifier */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Species Context
                </label>
                <select
                  value={speciesQualifier}
                  onChange={(e) => setSpeciesQualifier(e.target.value)}
                  className="w-full md:w-1/3 px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                >
                  <option value="">All Species</option>
                  <option value="NCBITaxon:9606">Human (NCBITaxon:9606)</option>
                  <option value="NCBITaxon:10090">Mouse (NCBITaxon:10090)</option>
                  <option value="NCBITaxon:10116">Rat (NCBITaxon:10116)</option>
                </select>
                <p className="text-xs text-slate-500">Constrain results to a specific organism</p>
              </div>

              {/* Node Types to Prioritize */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Node Types to Prioritize
                  <span className="text-slate-400 font-normal ml-1">(optional)</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  These node types will be prioritized in the enrichment analysis
                </p>
                
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      ref={nodeTypeInputRef}
                      type="text"
                      value={nodeTypeInput}
                      onChange={(e) => handleNodeTypeInputChange(e.target.value)}
                      onFocus={() => nodeTypeInput.length > 0 && setShowNodeTypeSuggestions(nodeTypeSuggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowNodeTypeSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && nodeTypeInput) {
                          e.preventDefault();
                          addNodeType(nodeTypeInput);
                        }
                      }}
                      placeholder="Type to search node types (e.g., Gene, Disease)..."
                      className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => nodeTypeInput && addNodeType(nodeTypeInput)}
                      className="px-3 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Node Type Suggestions Dropdown */}
                  {showNodeTypeSuggestions && nodeTypeSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {nodeTypeSuggestions.map((type, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={() => addNodeType(type)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors text-sm border-b border-purple-50 last:border-0"
                        >
                          <span className="text-purple-700">{type.replace('biolink:', '')}</span>
                          <span className="text-slate-400 text-xs ml-2">{type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Node Types */}
                {nodesToPrioritize.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {nodesToPrioritize.map((nodeType, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium"
                      >
                        {nodeType.replace('biolink:', '')}
                        <button
                          type="button"
                          onClick={() => removeNodeType(nodeType)}
                          className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Predicate Constraints */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Predicate Constraints
                    <span className="text-slate-400 font-normal ml-1">(optional)</span>
                  </label>
                  
                  {/* Constraint Style Toggle */}
                  <div className="flex items-center gap-2 bg-white border border-purple-200 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setPredicateConstraintStyle('exclude')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        predicateConstraintStyle === 'exclude'
                          ? 'bg-red-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Exclude
                    </button>
                    <button
                      type="button"
                      onClick={() => setPredicateConstraintStyle('include')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        predicateConstraintStyle === 'include'
                          ? 'bg-green-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Include Only
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500">
                  {predicateConstraintStyle === 'exclude' 
                    ? 'These predicates will be excluded from enrichment analysis'
                    : 'Only these predicates will be prioritized in enrichment analysis'
                  }
                </p>
                
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      ref={predicateInputRef}
                      type="text"
                      value={predicateInput}
                      onChange={(e) => handlePredicateInputChange(e.target.value)}
                      onFocus={() => predicateInput.length > 0 && setShowPredicateSuggestions(predicateSuggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowPredicateSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && predicateInput) {
                          e.preventDefault();
                          addPredicate(predicateInput);
                        }
                      }}
                      placeholder="Type to search predicates (e.g., treats, causes)..."
                      className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => predicateInput && addPredicate(predicateInput)}
                      className="px-3 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Predicate Suggestions Dropdown */}
                  {showPredicateSuggestions && predicateSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {predicateSuggestions.map((pred, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={() => addPredicate(pred)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors text-sm border-b border-purple-50 last:border-0"
                        >
                          <span className="text-purple-700">{pred.replace('biolink:', '').replace(/_/g, ' ')}</span>
                          <span className="text-slate-400 text-xs ml-2">{pred}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Predicates */}
                {predicatesToConstrain.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {predicatesToConstrain.map((pred, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                          predicateConstraintStyle === 'exclude'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {pred.replace('biolink:', '').replace(/_/g, ' ')}
                        <button
                          type="button"
                          onClick={() => removePredicate(pred)}
                          className={`rounded-full p-0.5 transition-colors ${
                            predicateConstraintStyle === 'exclude'
                              ? 'hover:bg-red-200'
                              : 'hover:bg-green-200'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
              Run Inference Analysis
            </>
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="flex items-start gap-2 px-4 py-3 bg-purple-50 rounded-xl border border-purple-100">
        <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-purple-700">
          Type a <strong>name or CURIE</strong> in either source or target field. Use <strong>Advanced Parameters</strong> to fine-tune the inference.
        </p>
      </div>
    </div>
  );
};