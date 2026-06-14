// ─── Types ────────────────────────────────────────────────────────────────────
export type ScreenId = 'home' | 'predict' | 'result' | 'history';

export type PredictionClass = 'mature' | 'immature' | 'defect' | 'unknown';

export interface PredictionResult {
  label:          PredictionClass;
  confidence:     number;
  is_dragon_fruit: boolean;
  probabilities:  { mature: number; immature: number; defect: number };
  recommendation: string;
  timestamp:      string;
}

export interface HistoryItem {
  id:         string;
  filename:   string;
  time:       string;
  confidence: number;
  label:      PredictionClass;
  previewSrc?: string;
}

// ─── Class Metadata ───────────────────────────────────────────────────────────
export const CLASS_META: Record<PredictionClass, {
  label:    string;
  labelID:  string;
  desc:     string;
  color:    string;
  bgClass:  string;
  dot:      string;
  gradBar:  string;
  emoji:    string;
}> = {
  mature: {
    label:   'Mature Dragon Fruit',
    labelID: 'Buah Matang',
    desc:    'Buah sudah matang optimal dan siap dipanen',
    color:   '#10b981',
    bgClass: 'rgba(16,185,129,0.12)',
    dot:     '#10b981',
    gradBar: 'linear-gradient(90deg,#10b981,#34d399)',
    emoji:   '🟢',
  },
  immature: {
    label:   'Immature Dragon Fruit',
    labelID: 'Buah Belum Matang',
    desc:    'Buah belum mencapai kematangan optimal',
    color:   '#f59e0b',
    bgClass: 'rgba(245,158,11,0.12)',
    dot:     '#f59e0b',
    gradBar: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
    emoji:   '🟡',
  },
  defect: {
    label:   'Defect Dragon Fruit',
    labelID: 'Buah Cacat',
    desc:    'Buah cacat atau rusak, tidak layak dipasarkan',
    color:   '#ef4444',
    bgClass: 'rgba(239,68,68,0.12)',
    dot:     '#ef4444',
    gradBar: 'linear-gradient(90deg,#ef4444,#f87171)',
    emoji:   '🔴',
  },
  unknown: {
    label:   'Non-Dragon Fruit',
    labelID: 'Bukan Buah Naga',
    desc:    'Objek tidak terdeteksi sebagai buah naga',
    color:   '#6b7280',
    bgClass: 'rgba(107,114,128,0.12)',
    dot:     '#6b7280',
    gradBar: 'linear-gradient(90deg,#6b7280,#9ca3af)',
    emoji:   '⚠️',
  },
};

// ─── Mock history (demo) ──────────────────────────────────────────────────────
export const DEMO_HISTORY: HistoryItem[] = [];

// ─── API ──────────────────────────────────────────────────────────────────────
// API_BASE selalu /api — di localhost proxy Vite forward ke Flask :5000,
// di Railway Flask langsung serve frontend sekaligus, jadi /api resolve ke server yang sama.
const API_BASE = '/api';

export async function predictImage(file: File): Promise<PredictionResult> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || 'Prediksi gagal');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Prediksi gagal');

  const r = data.result;
  return {
    label:          r.label as PredictionClass,
    confidence:     r.confidence,
    is_dragon_fruit: r.is_dragon_fruit ?? true,
    probabilities: {
      mature:   r.probabilities.mature   ?? 0,
      immature: r.probabilities.immature ?? 0,
      defect:   r.probabilities.defect   ?? 0,
    },
    recommendation: r.recommendation,
    timestamp:      r.timestamp,
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch { return false; }
}
