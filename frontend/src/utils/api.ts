import axios from 'axios';


const getApiBaseUrl = () => {
  // In production (edgar-test.apps.renci.org), use same domain
  if (window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.host}/api/v1`;
  }
  // In development, use localhost
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();


export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    // Send JSON, not form data (to match your backend)
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password,
    });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Enrichment API
export const enrichmentAPI = {
  submitAnalysis: async (query: any) => {
    const response = await api.post('/enrichment/analyze', query);
    return response.data;
  },
  
  getStatus: async (jobId: string) => {
    const response = await api.get(`/enrichment/status/${jobId}`);
    return response.data;
  },
  
  getResults: async (jobId: string) => {
    const response = await api.get(`/enrichment/results/${jobId}`);
    return response.data;
  },
  
  getHistory: async (limit = 10, offset = 0) => {
    const response = await api.get(`/enrichment/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};

// WebSocket connection for job updates
export const createJobWebSocket = (jobId: string, onMessage: (data: any) => void) => {
  // Dynamically determine WebSocket URL
  const getWsUrl = () => {
    if (window.location.hostname !== 'localhost') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
    return 'ws://localhost:8000';
  };
  
  const ws = new WebSocket(`${getWsUrl()}/ws/job/${jobId}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  return ws;
};

export const AC_URL = 'https://answercoalesce-test.apps.renci.org/query';

export const PREDICATES = ['biolink:treats', 'biolink:affects', 'biolink:regulates',
'biolink:associated_with', 'biolink:active_in', 'biolink:actively_involved_in',
'biolink:acts_upstream_of','biolink:acts_upstream_of_negative_effect',
'biolink:acts_upstream_of_or_within_negative_effect',
'biolink:acts_upstream_of_or_within_positive_effect',
'biolink:acts_upstream_of_positive_effect',
'biolink:affects_response_to',
'biolink:ameliorates',
'biolink:associated_with',
'biolink:binds',
'biolink:capable_of',
'biolink:catalyzes',
'biolink:causes',
'biolink:coexists_with',
'biolink:coexpressed_with',
'biolink:colocalizes_with',
'biolink:composed_primarily_of',
'biolink:contraindicated_for',
'biolink:contributes_to',
'biolink:correlated_with',
'biolink:decreases_response_to',
'biolink:derives_from',
'biolink:develops_from',
'biolink:directly_physically_interacts_with',
'biolink:disease_has_basis_in',
'biolink:disrupts',
'biolink:expressed_in',
'biolink:gene_associated_with_condition',
'biolink:gene_product_of',
'biolink:genetically_associated_with',
'biolink:genetically_interacts_with',
'biolink:has_adverse_event',
'biolink:has_input',
'biolink:has_output',
'biolink:has_part',
'biolink:has_participant',
'biolink:has_phenotype',
'biolink:homologous_to',
'biolink:in_taxon',
'biolink:increases_response_to',
'biolink:is_frameshift_variant_of',
'biolink:is_missense_variant_of',
'biolink:is_nearby_variant_of',
'biolink:is_non_coding_variant_of',
'biolink:is_nonsense_variant_of',
'biolink:is_splice_site_variant_of',
'biolink:is_synonymous_variant_of',
'biolink:located_in',
'biolink:negatively_correlated_with',
'biolink:occurs_in',
'biolink:overlaps',
'biolink:physically_interacts_with',
'biolink:positively_correlated_with',
'biolink:precedes',
'biolink:produces',
'biolink:regulates',
'biolink:related_to',
'biolink:similar_to',
'biolink:subclass_of'];


export const NODE_CATEGORIES = [
  'biolink:PhenotypicFeature',
  'biolink:Disease',
  'biolink:Gene',
  'biolink:BiologicalProcess',
  'biolink:ChemicalEntity',
  'biolink:Disease',
  'biolink:Gene',
  'biolink:Drug',
  'biolink:BiologicalProcess',
  'biolink:Pathway',
  'biolink:PhenotypicFeature'
];

export const COMMON_PHENOTYPES = [
  { id: 'HP:0000739', label: 'Anxiety' },
  { id: 'HP:0001288', label: 'Gait disturbance' },
  { id: 'HP:0001252', label: 'Hypotonia' },
  { id: 'HP:0001250', label: 'Seizure' },
  { id: 'HP:0000750', label: 'Delayed speech and language development' },
  { id: 'HP:0002378', label: 'Hand tremor' },
  { id: 'HP:0002019', label: 'Constipation' },
  { id: 'HP:0007146', label: 'Bilateral tonic-clonic seizure' },
];

export const COMMON_GENES = [
  { id: 'NCBIGene:5297', label: 'PI3KCB (Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Beta)' },
  { id: 'NCBIGene:5298', label: 'PI3KCG (Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Gamma)' },
  { id: 'NCBIGene:5290', label: 'PIK3CA (Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Alpha)' },
  { id: 'NCBIGene:5291', label: 'PIK3CB (Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Beta)' },
  { id: 'NCBIGene:7124', label: 'TNF (Tumor Necrosis Factor)' },
  { id: 'NCBIGene:3586', label: 'IL10 (Interleukin 10)' },
];

export const COMMON_DISEASES = [
  { id: 'MONDO:0007254', label: 'Breast Cancer' },
  { id: 'MONDO:0005148', label: 'Type 2 Diabetes Mellitus' },
  { id: 'MONDO:0008199', label: 'Parkinson Disease' },
  { id: 'MONDO:0004975', label: 'Alzheimer Disease' },
  { id: 'MONDO:0005301', label: 'Multiple Sclerosis' },
];

export const COMMON_CHEMICALS = [
  { id: 'CHEBI:4031', label: 'Cyclosporine' },
  { id: 'CHEBI:6801', label: 'Metformin' },
  { id: 'CHEBI:41423', label: 'Ibuprofen' },
  { id: 'CHEBI:3962', label: 'Curcumin' },
];

export const ASPECT_QUALIFIERS = [
  'activity_or_abundance',
  'activity',
  'abundance',
  'expression',
  'folding',
  'localization',
  'molecular_interaction',
  'molecular_modification',
  'metabolic_processing',
  'synthesis',
  'degradation',
  'secretion',
  'transport',
  'mutation_rate',
  'splicing',
  'uptake'
];

export const DIRECTION_QUALIFIERS = [
  'increased',
  'decreased',
  'upregulated',
  'downregulated'
];