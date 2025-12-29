// User types
export interface User {
  id: string;
  username: string;
  email?: string;
}

// Authentication types
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Job types
export enum JobStatus {
  IDLE = 'idle',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Job {
  job_id: string;
  status: JobStatus;
  progress: number;
  message?: string;
  ws_url?: string;
  created_at: string;
  completed_at?: string;
}

// TRAPI types
export interface QualifierSet {
  qualifier_type_id: string;
  qualifier_value: string;
}

export interface QualifierConstraint {
  qualifier_set: QualifierSet[];
}

export interface NodeConstraints {
  ids?: string[];
  categories: string[];
  set_interpretation?: string;
  constraints?: any[];
  is_set?: boolean;
}

export interface Edge {
  subject: string;
  object: string;
  predicates: string[];
  knowledge_type?: string;
  attribute_constraints?: any[];
  qualifier_constraints?: QualifierConstraint[];
}

export interface QueryGraph {
  nodes: Record<string, NodeConstraints>;
  edges: Record<string, Edge>;
}

export interface QueryMessage {
  query_graph: QueryGraph;
}

export interface EnrichmentParameters {
  pvalue_threshold?: number;
  result_length?: number;
  predicates_to_exclude?: string[];
}

export interface EnrichmentRequest {
  message: QueryMessage;
  parameters?: EnrichmentParameters;
}

// Results types
export interface Node {
  id: string;
  name?: string;
  categories?: string[];
  attributes?: any[];
}

export interface ResultEdge {
  subject: string;
  object: string;
  predicate?: string;
  sources?: any[];
  attributes?: any[];
}

export interface KnowledgeGraph {
  nodes: Record<string, Node>;
  edges: Record<string, ResultEdge>;
}

export interface NodeBinding {
  id: string;
  query_id?: string;
  attributes?: any[];
}

export interface EdgeBinding {
  id: string;
  attributes?: any[];
}

export interface Analysis {
  resource_id?: string;
  edge_bindings?: Record<string, EdgeBinding[]>;
  score?: number;
  support_graphs?: string[];
  attributes?: any[];
}

export interface Result {
  node_bindings: Record<string, NodeBinding[]>;
  analyses: Analysis[];
}

export interface Log {
  level: string;
  message: string;
  timestamp?: string;
  code?: string;
}

export interface EnrichmentResults {
  message?: {
    query_graph?: QueryGraph;
    knowledge_graph?: KnowledgeGraph;
    results?: Result[];
  };
  results?: Result[];
  knowledge_graph?: KnowledgeGraph;
  auxiliary_graphs?: Record<string, any>;
  logs?: Log[];
  parameters?: Record<string, any>;
}
