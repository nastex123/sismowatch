import { UserSession, KPIStats, SeismicEvent, TimeseriesPoint, AIReport, PipelineStatus, QuarantineRecord } from '../types';

const API_BASE = '/api';
const AUTH_BASE = '/auth';

export const apiService = {
  getAuthHeaders(): HeadersInit {
    const sessionStr = localStorage.getItem('sismowatch_session');
    if (!sessionStr) return {};
    try {
      const session: UserSession = JSON.parse(sessionStr);
      return {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      };
    } catch {
      return {};
    }
  },

  async login(email: string, password: string): Promise<UserSession> {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al iniciar sesión');
    }
    const data = await res.json();
    return {
      token: data.access_token,
      email: data.email,
      role: data.role,
      full_name: data.full_name
    };
  },

  async getKPIs(): Promise<KPIStats> {
    const res = await fetch(`${API_BASE}/kpis`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener KPIs');
    return res.json();
  },

  async getEvents(params: { page?: number; limit?: number; min_magnitude?: number; region?: string; tsunami_only?: boolean }): Promise<{ items: SeismicEvent[]; total_records: number; total_pages: number }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.min_magnitude !== undefined && params.min_magnitude !== null) query.append('min_magnitude', params.min_magnitude.toString());
    if (params.region) query.append('region', params.region);
    if (params.tsunami_only !== undefined && params.tsunami_only !== null) query.append('tsunami_only', params.tsunami_only.toString());

    const res = await fetch(`${API_BASE}/events?${query.toString()}`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('Error al cargar eventos');
    return res.json();
  },

  async getTimeseries(days: number = 7): Promise<TimeseriesPoint[]> {
    const res = await fetch(`${API_BASE}/stats/timeseries?days=${days}`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener series temporales');
    return res.json();
  },

  async getReports(): Promise<AIReport[]> {
    const res = await fetch(`${API_BASE}/reports`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener reportes');
    return res.json();
  },

  async getPipelineStatus(): Promise<PipelineStatus> {
    const res = await fetch(`${API_BASE}/pipeline/status`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener estado del pipeline');
    return res.json();
  },

  async getQuarantine(): Promise<QuarantineRecord[]> {
    const res = await fetch(`${API_BASE}/quality/quarantine`, { headers: this.getAuthHeaders() });
    if (!res.ok) {
      if (res.status === 403) throw new Error('Acceso denegado: solo disponible para rol Administrador.');
      throw new Error('Error al obtener registros en cuarentena');
    }
    return res.json();
  },

  async triggerBackfill(startDate: string, endDate: string, minMag: number): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/backfill`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ start_date: startDate, end_date: endDate, min_magnitude: minMag })
    });
    if (!res.ok) throw new Error('Error al disparar backfill');
    return res.json();
  },

  async regenerateReport(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/reports/regenerate`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Error al regenerar reporte');
    return res.json();
  },

  async sendChatMessage(prompt: string, provider: string = 'opencode'): Promise<any> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ prompt, provider })
    });
    if (!res.ok) throw new Error('Error al consultar al asistente');
    return res.json();
  }
};
