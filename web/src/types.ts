export type TimeRange = '24h' | '7d' | '30d';

export interface UserSession {
  token: string;
  email: string;
  role: 'viewer' | 'admin';
  full_name: string;
}

export interface KPIStats {
  events_24h: number;
  events_count?: number;
  max_magnitude: number;
  avg_magnitude: number;
  tsunami_alerts: number;
  quality_score: number;
  last_event_time: string | null;
  last_updated_at: string;
  time_range?: TimeRange;
}

export interface SeismicEvent {
  id: string;
  mag: number | null;
  place: string;
  time_utc: string;
  latitude: number;
  longitude: number;
  depth_km: number;
  tsunami: number;
  sig: number;
  status: string;
  mag_type: string;
  type: string;
  url?: string;
  z_score_mag?: number;
  is_swarm?: boolean;
}

export interface TimeseriesPoint {
  hour_bucket: string;
  event_count: number;
  avg_magnitude: number;
  max_magnitude: number;
}

export interface AIReport {
  id: number;
  report_date: string;
  executive_summary: string;
  notable_events: any[];
  active_zones: any[];
  computed_metrics: any;
  model_name: string;
  tokens_used: number;
  latency_ms: number;
  cost_usd: number;
  created_at: string;
}

export interface QualityMetric {
  id: number;
  batch_id: string;
  evaluated_records: number;
  passed_records: number;
  failed_records: number;
  quality_score: number;
  executed_at: string;
}

export interface PipelineStatus {
  last_ingested_at: string | null;
  last_event_time_utc: string | null;
  last_gold_updated_at?: string | null;
  is_pipeline_fresh: boolean;
  quality_history: QualityMetric[];
}

export interface QuarantineRecord {
  id: number;
  raw_id: string;
  rejection_reason: string;
  failed_at: string;
  raw_payload: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  engine?: string;
  gold_reference?: any;
}
