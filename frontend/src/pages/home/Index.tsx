import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Microscope, BarChart2, ClipboardList,
  Upload, Camera, ChevronRight, Download,
  RefreshCw, CheckCircle2, Cpu, Target, Grid2x2, Database,
  AlertTriangle, Wifi, WifiOff, X, ZoomIn,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  type ScreenId,
  type PredictionClass,
  type PredictionResult,
  type HistoryItem,
  CLASS_META,
  DEMO_HISTORY,
  predictImage,
  checkHealth,
} from '@/lib/index';

/* ── NAV ── */
const NAV: { id: ScreenId; icon: React.ReactNode; label: string }[] = [
  { id: 'home',    icon: <Home size={18} />,         label: 'Beranda'  },
  { id: 'predict', icon: <Microscope size={18} />,   label: 'Prediksi' },
  { id: 'result',  icon: <BarChart2 size={18} />,    label: 'Hasil'    },
  { id: 'history', icon: <ClipboardList size={18} />, label: 'Riwayat' },
];

/* ════════════════════════════════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════════════════════════════════ */
function Sidebar({ active, onNav }: { active: ScreenId; onNav: (s: ScreenId) => void }) {
  return (
    <aside
      className="sidebar-desktop flex-shrink-0 flex flex-col h-full"
      style={{
        width: '240px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: 'linear-gradient(135deg,#e84b6a,#ff8fa3)' }}
        >
          🔴
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            DragonGrade
          </div>
          <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            AI Fruit Classifier
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const isActive = active === item.id || (item.id === 'predict' && active === 'result');
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150"
              style={{
                fontSize: '0.9375rem',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'var(--brand-500)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-mid)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-500)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span style={{ color: isActive ? '#fff' : 'inherit' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Model info */}
      <div className="px-2.5 pb-4">
        <div className="rounded-lg p-3" style={{ background: 'var(--brand-light)', border: '1px solid var(--brand-mid)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            Model Info
          </div>
          {[
            { Icon: Cpu,     text: 'MobileNetV2'   },
            { Icon: Target,  text: '3 Kelas Output' },
            { Icon: Grid2x2, text: 'Input 224×224'  },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brand-500)' }} />
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════
   TOPBAR
   ════════════════════════════════════════════════════════════════ */
function Topbar({ screen, backendOk }: { screen: ScreenId; backendOk: boolean | null }) {
  const meta: Record<ScreenId, { title: string; sub: string }> = {
    home:    { title: 'Beranda',        sub: 'Selamat datang di DragonGrade' },
    predict: { title: 'Prediksi',       sub: 'Upload atau scan buah naga untuk dianalisis' },
    result:  { title: 'Hasil Analisis', sub: 'Klasifikasi kematangan buah naga' },
    history: { title: 'Riwayat',        sub: 'Semua prediksi yang pernah dilakukan' },
  };
  const { title, sub } = meta[screen];

  return (
    <header
      className="main-topbar flex-shrink-0 flex items-center justify-between px-5 md:px-6"
      style={{
        height: '60px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: backendOk === null
              ? 'var(--bg-base)'
              : backendOk ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${backendOk === null ? 'var(--border)' : backendOk ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: backendOk === null ? 'var(--text-muted)' : backendOk ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9375rem',
          }}
        >
          {backendOk ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span className="hidden sm:inline">
            {backendOk === null ? 'Checking…' : backendOk ? 'Backend OK' : 'Offline'}
          </span>
        </div>

        <span
          className="hidden sm:inline-block px-2.5 py-1 rounded-full"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '0.9375rem',
            fontWeight: 500,
          }}
        >
          MobileNetV2 · ImageNet
        </span>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════
   CLASS BADGE
   ════════════════════════════════════════════════════════════════ */
function ClassBadge({ cls }: { cls: PredictionClass }) {
  const m = CLASS_META[cls];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold"
      style={{
        fontSize: '0.9375rem',
        background: m.bgClass,
        color: m.color,
        border: `1px solid ${m.dot}55`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.labelID}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
   HOME SCREEN
   ════════════════════════════════════════════════════════════════ */
function HomeScreen({ onNavigate }: { onNavigate: (s: ScreenId) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">

      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden p-5 md:p-6"
        style={{
          background: 'linear-gradient(130deg, #ff8fa3 0%, #e84b6a 45%, #c5185a 100%)',
          minHeight: '200px',
        }}
      >
        <div className="absolute top-0 right-0 rounded-full opacity-20" style={{ width: '140px', height: '140px', background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-24 rounded-full opacity-10" style={{ width: '90px', height: '90px', background: 'radial-gradient(circle,#fff,transparent)', transform: 'translateY(30%)' }} />

        <div className="relative z-10">
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Computer Vision · MobileNetV2 · Transfer Learning
          </div>
          <h2 style={{ fontSize: 'clamp(1.375rem, 3.5vw, 1.625rem)', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '0.4rem' }}>
            Klasifikasi Kematangan<br />Buah Naga
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.75)', marginBottom: '0.9rem', lineHeight: 1.5 }}>
            Berbasis Citra RGB menggunakan Deep Learning & Transfer Learning.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {['3 Kelas Prediksi', '224×224 Input', 'Transfer Learning', 'ImageNet Pretrained'].map((tag) => (
              <span key={tag} style={{ fontSize: '0.9375rem', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => onNavigate('predict')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full"
            style={{ background: '#fff', color: 'var(--brand-500)', fontSize: '0.9375rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Mulai Analisis <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Class Cards */}
      <div>
        <SectionTitle>Kelas Klasifikasi</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(Object.entries(CLASS_META) as [PredictionClass, typeof CLASS_META[PredictionClass]][]).filter(([cls]) => cls !== 'unknown').map(([cls, m]) => (
            <div
              key={cls}
              className="rounded-2xl p-3.5 transition-all duration-150 cursor-pointer"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ background: m.bgClass }}>
                <div className="w-3 h-3 rounded-full" style={{ background: m.dot }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', textTransform: 'capitalize', marginBottom: '2px' }}>{cls}</div>
              <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div>
        <SectionTitle>Cara Penggunaan</SectionTitle>
        <div className="space-y-2">
          {[
            { n: 1, title: 'Upload Foto Buah Naga', desc: 'Unggah gambar RGB dari galeri atau kamera perangkat Anda (JPG/PNG)', color: 'var(--brand-500)' },
            { n: 2, title: 'Atau Gunakan Kamera Langsung', desc: 'Aktifkan fitur live scan untuk analisis real-time via webcam', color: 'var(--brand-500)' },
            { n: 3, title: 'Dapatkan Hasil Klasifikasi', desc: 'Model MobileNetV2 memproses citra dan menampilkan prediksi + confidence score', color: 'var(--success)' },
          ].map(({ n, title, desc, color }) => (
            <div key={n} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0 mt-0.5"
                style={{ background: color, fontSize: '1rem' }}
              >
                {n}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{title}</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { Icon: Cpu,     val: 'MobileNetV2', key: 'Arsitektur Model'  },
          { Icon: Target,  val: '3 Kelas',     key: 'Output Klasifikasi' },
          { Icon: Grid2x2, val: '224×224',     key: 'Ukuran Input'       },
          { Icon: Database,val: 'ImageNet',    key: 'Pretrained Weights' },
        ].map(({ Icon, val, key }) => (
          <div key={key} className="rounded-2xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Icon size={18} style={{ color: 'var(--brand-500)', marginBottom: '6px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{val}</div>
            <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>{key}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PREDICT SCREEN
   ════════════════════════════════════════════════════════════════ */
function PredictScreen({
  onResult,
  backendOk,
}: {
  onResult: (r: PredictionResult, file: File) => void;
  backendOk: boolean | null;
}) {
  const [tab,        setTab]        = useState<'upload' | 'camera'>('upload');
  const [file,       setFile]       = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [camActive,  setCamActive]  = useState(false);
  const [camSrc,     setCamSrc]     = useState<string | null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null); setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setError(null); setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function startCamera() {
    // getUserMedia hanya bisa di HTTPS atau localhost
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser tidak mendukung akses kamera. Pastikan menggunakan HTTPS (https://...) bukan HTTP.');
      return;
    }
    try {
      // Coba kamera belakang dulu (untuk HP), fallback ke kamera mana saja
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      } catch {
        // Fallback: kamera default tanpa constraint facingMode
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamActive(true); setCamSrc(null);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Izin kamera ditolak. Klik ikon kamera/gembok di address bar browser dan izinkan akses kamera.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera yang terhubung.');
      } else if (e.name === 'NotReadableError') {
        setError('Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain yang menggunakan kamera lalu coba lagi.');
      } else if (e.name === 'SecurityError') {
        setError('Kamera diblokir karena koneksi tidak aman. Gunakan HTTPS (https://IP:3000) bukan HTTP.');
      } else {
        setError(`Kamera tidak bisa diakses: ${e.message || 'error tidak diketahui'}.`);
      }
    }
  }

  function captureFrame() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCamSrc(dataUrl);
    canvas.toBlob((blob) => {
      if (blob) setFile(new File([blob], 'captured.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCamActive(false);
  }

  function retakeCamera() {
    setCamSrc(null); setFile(null); startCamera();
  }

  async function handleAnalyze() {
    if (!file) return;
    setError(null); setLoading(true);
    try {
      const result = await predictImage(file);
      onResult(result, file);
    } catch (err) {
      setError((err as Error).message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  const hasInput = !!file;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">

        {/* LEFT: Input */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4 md:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-grad)' }}>
                <Camera size={18} color="#fff" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Input Citra Buah</h3>
            </div>

            {/* Tabs */}
            <div
              className="flex p-0.5 rounded-xl mb-4"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
            >
              {(['upload', 'camera'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className="flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={{
                    fontSize: '1.0625rem',
                    background: tab === t ? 'var(--brand-500)' : 'transparent',
                    color: tab === t ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'upload' ? <><Upload size={18} /> Import Gambar</> : <><Camera size={18} /> Scan Langsung</>}
                </button>
              ))}
            </div>

            {/* Upload tab */}
            {tab === 'upload' && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="rounded-2xl cursor-pointer transition-all duration-150 p-5 text-center"
                  style={{ border: '2px dashed #f0a8b8', background: '#fff9fa' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand-500)';
                    (e.currentTarget as HTMLDivElement).style.background  = 'var(--brand-light)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#f0a8b8';
                    (e.currentTarget as HTMLDivElement).style.background  = '#fff9fa';
                  }}
                >
                  {previewSrc ? (
                    <div className="space-y-2">
                      <img src={previewSrc} alt="preview" className="max-h-48 mx-auto rounded-xl shadow object-contain" />
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold"
                        style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', fontSize: '0.9375rem' }}
                      >
                        <CheckCircle2 size={15} /> Gambar terpilih — klik untuk ganti
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'var(--brand-grad)' }}>
                        <Upload size={26} color="#fff" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Klik atau seret gambar ke sini
                        </p>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Format: JPG, PNG, WEBP · Maks 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Camera tab — Scanner UI matching screenshot */}
            {tab === 'camera' && (
              <div>
                {/* Scanner Viewport */}
                <div
                  className="scan-viewport"
                  style={{ minHeight: '180px', maxHeight: '240px' }}
                >
                  {/* Live video */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ display: camActive ? 'block' : 'none', maxHeight: '240px' }}
                  />

                  {/* Captured frame */}
                  {camSrc && !camActive && (
                    <img src={camSrc} alt="captured" className="w-full h-full object-cover" style={{ maxHeight: '240px' }} />
                  )}

                  {/* Idle state — scanner frame (matches screenshot exactly) */}
                  {!camActive && !camSrc && (
                    <div style={{ position: 'relative', width: '100px', height: '75px' }}>
                      {/* Corner brackets */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '14px', height: '14px', borderTop: '2px solid var(--brand-500)', borderLeft: '2px solid var(--brand-500)', borderRadius: '2px 0 0 0' }} />
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '14px', height: '14px', borderTop: '2px solid var(--brand-500)', borderRight: '2px solid var(--brand-500)', borderRadius: '0 2px 0 0' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '14px', height: '14px', borderBottom: '2px solid var(--brand-500)', borderLeft: '2px solid var(--brand-500)', borderRadius: '0 0 0 2px' }} />
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', borderBottom: '2px solid var(--brand-500)', borderRight: '2px solid var(--brand-500)', borderRadius: '0 0 2px 0' }} />
                      {/* Scan line */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '2px',
                          right: '2px',
                          height: '1.5px',
                          background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)',
                          top: '4px',
                          opacity: 0.7,
                          animation: 'scanMove 2s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}

                  {/* "Arahkan kamera..." label */}
                  {!camActive && !camSrc && (
                    <p style={{ position: 'absolute', bottom: '8px', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                      Arahkan kamera ke buah naga
                    </p>
                  )}

                  {/* Scanner overlay when active */}
                  {camActive && (
                    <>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(254,242,244,0.4) 0%, transparent 20%, transparent 80%, rgba(254,242,244,0.4) 100%)' }} />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div style={{ position: 'relative', width: '70%', height: '65%' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '14px', height: '14px', borderTop: '2px solid var(--brand-500)', borderLeft: '2px solid var(--brand-500)', borderRadius: '2px 0 0 0' }} />
                          <div style={{ position: 'absolute', top: 0, right: 0, width: '14px', height: '14px', borderTop: '2px solid var(--brand-500)', borderRight: '2px solid var(--brand-500)', borderRadius: '0 2px 0 0' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '14px', height: '14px', borderBottom: '2px solid var(--brand-500)', borderLeft: '2px solid var(--brand-500)', borderRadius: '0 0 0 2px' }} />
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', borderBottom: '2px solid var(--brand-500)', borderRight: '2px solid var(--brand-500)', borderRadius: '0 0 2px 0' }} />
                          <div
                            style={{
                              position: 'absolute', left: '2px', right: '2px', height: '1.5px',
                              background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)',
                              top: '4px', opacity: 0.8,
                              animation: 'scanMove 2s ease-in-out infinite',
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Capture success overlay */}
                  {camSrc && !camActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ background: 'rgba(22,163,74,0.07)' }}>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
                        <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>Gambar Ter-scan</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scanning status */}
                {camActive && (
                  <div className="mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.9375rem', color: 'var(--success)', fontWeight: 600 }}>Scanning aktif…</span>
                    </div>
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Posisikan buah dalam bingkai</span>
                  </div>
                )}

                {/* Camera action button — matches screenshot style */}
                <div className="mt-2 flex gap-2">
                  {!camActive && !camSrc && (
                    <button
                      onClick={startCamera}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(90deg,#059669,#34d399)', fontSize: '0.9375rem', border: 'none', cursor: 'pointer' }}
                    >
                      <Camera size={15} /> Aktifkan Kamera
                    </button>
                  )}
                  {camActive && (
                    <button
                      onClick={captureFrame}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-1.5"
                      style={{ background: 'var(--brand-grad-h)', fontSize: '0.9375rem', border: 'none', cursor: 'pointer' }}
                    >
                      <ZoomIn size={15} /> Ambil Gambar
                    </button>
                  )}
                  {camSrc && (
                    <>
                      <button
                        onClick={retakeCamera}
                        className="flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-1.5"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '1.0625rem', cursor: 'pointer' }}
                      >
                        <RefreshCw size={18} /> Scan Ulang
                      </button>
                      <div
                        className="flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5"
                        style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', fontSize: '0.9375rem' }}
                      >
                        <CheckCircle2 size={15} /> Siap Dianalisis
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preprocessing tags */}
          <div className="rounded-xl p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Preprocessing Otomatis
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Resize 224×224', 'Rescale 1/255', 'RGB Conversion', 'Expand Dims'].map((tag) => (
                <span key={tag} className="font-semibold" style={{ fontSize: '0.9375rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--brand-light)', color: 'var(--brand-500)', border: '1px solid var(--brand-mid)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Analyze CTA */}
        <div>
          <div
            className="rounded-2xl p-4 md:p-5 flex flex-col"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: '340px' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                <BarChart2 size={18} style={{ color: 'var(--brand-500)' }} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Siap Dianalisis</h3>
            </div>

            {backendOk === false && (
              <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
                <WifiOff size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '1rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                  Backend tidak terhubung. Jalankan Flask server di port 5000.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
                <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '1rem', color: 'var(--danger)', lineHeight: 1.5 }}>{error}</p>
                <button onClick={() => setError(null)} style={{ marginLeft: 'auto', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-3">
              {loading ? (
                <div className="space-y-3">
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: '3px solid var(--brand-mid)', borderTopColor: 'var(--brand-500)', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ fontSize: '1rem', color: 'var(--brand-500)', fontWeight: 600, animation: 'pulse-brand 1.5s ease-in-out infinite' }}>
                    Memproses citra dengan MobileNetV2…
                  </p>
                  <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Resize → Rescale → Predict</p>
                </div>
              ) : (
                <>
                  <div className="w-18 h-18 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                    <Microscope size={32} style={{ color: 'var(--text-faint)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '4px' }}>
                      {hasInput ? 'Gambar Siap Dianalisis' : 'Mulai Klasifikasi'}
                    </p>
                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: 1.5, margin: '0 auto' }}>
                      {hasInput
                        ? 'Klik tombol di bawah untuk menjalankan prediksi MobileNetV2.'
                        : 'Upload foto buah naga terlebih dahulu, lalu klik tombol analisis.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!hasInput || loading || backendOk === false}
              className="btn-brand w-full py-3 font-bold"
              style={{ borderRadius: '0.75rem', fontSize: '1rem' }}
            >
              {loading ? 'Menganalisis…' : 'MULAI KLASIFIKASI →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PROBABILITY BAR
   ════════════════════════════════════════════════════════════════ */
function ProbBar({ label, pct, color, grad }: { label: string; pct: number; color: string; grad: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{(pct * 100).toFixed(2)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: grad }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECOMMENDATION TEXT
   ════════════════════════════════════════════════════════════════ */
function RecommendationText({ text, color, dot }: { text: string; color: string; dot: string }) {
  const hasNumberedPoints = /\(\d+\)/.test(text);
  if (hasNumberedPoints) {
    const parts = text.split(/(?=\(\d+\))/);
    const intro  = parts[0].trim();
    const points = parts.slice(1);
    return (
      <div>
        {intro && <p style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '0.5rem' }}>{intro}</p>}
        <div className="space-y-1.5">
          {points.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold" style={{ width: 16, height: 16, minWidth: 16, background: dot, fontSize: '1rem', marginTop: '1px' }}>{i + 1}</div>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{point.replace(/^\(\d+\)\s*/, '').trim()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <p style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>{text}</p>;
}

/* ════════════════════════════════════════════════════════════════
   RESULT SCREEN
   ════════════════════════════════════════════════════════════════ */
function ResultScreen({
  result,
  imageSrc,
  onReset,
  onSaveHistory,
}: {
  result: PredictionResult | null;
  imageSrc: string | null;
  onReset: () => void;
  onSaveHistory: () => void;
}) {
  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-18 h-18 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
            <BarChart2 size={32} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Belum ada hasil. Mulai dari halaman Prediksi.</p>
          <button onClick={onReset} className="btn-brand px-5 py-2.5 text-sm" style={{ borderRadius: '0.75rem', fontSize: '1rem' }}>
            Ke Halaman Prediksi
          </button>
        </div>
      </div>
    );
  }

  const m   = CLASS_META[result.label];
  const p   = result.probabilities;
  const pct = (result.confidence * 100).toFixed(1);

  function handleDownload() {
    const text = [
      '═══════════════════════════════════════════',
      '     DragonGrade — Laporan Klasifikasi     ',
      '═══════════════════════════════════════════',
      `Timestamp    : ${new Date(result.timestamp).toLocaleString('id-ID')}`,
      `Prediksi     : ${result.label.toUpperCase()}`,
      `Confidence   : ${pct}%`,
      `Mature   : ${(p.mature   * 100).toFixed(2)}%`,
      `Immature : ${(p.immature * 100).toFixed(2)}%`,
      `Defect   : ${(p.defect   * 100).toFixed(2)}%`,
      `Status Validasi: ${result.label === 'unknown' ? 'Bukan Buah Naga' : 'Valid'}`,
      `Rekomendasi  : ${result.recommendation}`,
      '═══════════════════════════════════════════',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `dragonfruit_result_${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
        {/* LEFT */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.9rem' }}>
              Hasil Prediksi
            </div>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: m.bgClass, border: `1px solid ${m.dot}44` }}>
                {imageSrc
                  ? <img src={imageSrc} alt="result" className="w-full h-full object-cover" />
                  : <div className="w-5 h-5 rounded-full" style={{ background: m.dot }} />
                }
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Terdeteksi sebagai</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: m.color, textTransform: 'capitalize', lineHeight: 1.2 }}>{result.label === 'unknown' ? 'Bukan Buah Naga' : result.label}</div>
                <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{result.label === 'unknown' ? 'Objek Tidak Valid' : 'Dragon Fruit'}</div>
                <ClassBadge cls={result.label} />
              </div>
            </div>

            {/* Confidence */}
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center mb-1.5">
                <span style={{ fontSize: '1.0625rem', color: 'var(--text-secondary)' }}>
                  {result.label === 'unknown' ? 'Keyakinan Bukan Buah Naga' : 'Tingkat Kepercayaan'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-500)' }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--brand-grad-h)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-3 rounded-xl p-3" style={{ background: m.bgClass, border: `1px solid ${m.dot}44` }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: m.color, marginBottom: '6px' }}>
                Rekomendasi
              </div>
              <RecommendationText text={result.recommendation} color={m.color} dot={m.dot} />
            </div>
          </motion.div>

          <div className="flex gap-2">
            <button onClick={onReset} className="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5" style={{ borderRadius: '0.75rem', fontSize: '1.0625rem' }}>
              <RefreshCw size={15} /> Analisis Baru
            </button>
            <button
              onClick={() => { onSaveHistory(); handleDownload(); }}
              className="btn-brand flex-1 py-2 flex items-center justify-center gap-1.5"
              style={{ borderRadius: '0.75rem', fontSize: '1.0625rem' }}
            >
              <Download size={15} /> Simpan Hasil
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Distribusi Probabilitas
            </div>
            <ProbBar label="Mature Dragon Fruit"   pct={p.mature}   color="#16a34a" grad="linear-gradient(90deg,#16a34a,#4ade80)" />
            <ProbBar label="Immature Dragon Fruit" pct={p.immature} color="#d97706" grad="linear-gradient(90deg,#d97706,#fbbf24)" />
            <ProbBar label="Defect Dragon Fruit"   pct={p.defect}   color="#dc2626" grad="linear-gradient(90deg,#dc2626,#f87171)" />
            {result.label === 'unknown' && (
              <div className="mt-4 p-3 rounded-xl border border-dashed border-gray-400 bg-gray-50 flex items-center gap-2">
                <AlertTriangle size={18} className="text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">Sistem yakin: Objek bukan buah naga (probabilitas kelas 0% — penolakan sebelum klasifikasi).</span>
              </div>
            )}
          </motion.div>

          {/* Mini prob cards */}
          <div className="grid grid-cols-3 gap-2">
            {(['mature', 'immature', 'defect'] as PredictionClass[]).map((cls) => {
              const mm  = CLASS_META[cls];
              const val = p[cls];
              return (
                <div key={cls} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-base)', border: `1px solid ${result.label === cls ? mm.dot + '55' : 'var(--border)'}` }}>
                  <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5" style={{ background: mm.dot }} />
                  <div style={{ fontSize: '1.0625rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: mm.color }}>
                    {(val * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '1px', textTransform: 'capitalize' }}>{cls}</div>
                </div>
              );
            })}
          </div>

          {/* Timestamp */}
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              Dianalisis pada:{' '}
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {new Date(result.timestamp).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HISTORY SCREEN
   ════════════════════════════════════════════════════════════════ */
function HistoryScreen({ items }: { items: HistoryItem[] }) {
  function HistRow({ item }: { item: HistoryItem }) {
    const m = CLASS_META[item.label];
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150 cursor-pointer"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
      >
        {item.previewSrc ? (
          <img src={item.previewSrc} alt={item.filename} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: m.bgClass }}>
            {m.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.filename}
          </div>
          <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '1px', fontFamily: 'var(--font-mono)' }}>
            {item.time} · Conf. {item.confidence.toFixed(1)}%
          </div>
        </div>
        <ClassBadge cls={item.label} />
      </div>
    );
  }

  function exportCSV() {
    const header = 'Filename,Time,Label,Confidence';
    const rows   = items.map((i) => `${i.filename},${i.time},${i.label},${i.confidence}`);
    const blob   = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a'); a.href = url; a.download = 'riwayat_prediksi.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 max-w-3xl mx-auto w-full">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-18 h-18 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
            <ClipboardList size={32} style={{ color: 'var(--text-faint)' }} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '1rem' }}>Belum ada riwayat prediksi</p>
            <p style={{ fontSize: '1rem', color: 'var(--text-faint)', marginTop: '4px' }}>
              Prediksi pertama Anda akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <SectionTitle>Riwayat Prediksi</SectionTitle>
            <div className="space-y-1.5">{items.map((item) => <HistRow key={item.id} item={item} />)}</div>
          </div>
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
              Total prediksi: <strong style={{ color: 'var(--text-primary)' }}>{items.length}</strong>
            </span>
            <button
              onClick={exportCSV}
              className="px-3 py-1 rounded-full font-semibold transition-all"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', fontSize: '0.9375rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-500)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              Export CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ════════════════════════════════════════════════════════════════ */
function MobileNav({ active, onNav }: { active: ScreenId; onNav: (s: ScreenId) => void }) {
  return (
    <nav
      className="mobile-nav fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3"
      style={{
        background: 'rgba(255,248,245,0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--sidebar-border)',
      }}
    >
      {NAV.map((item) => {
        const isActive = active === item.id || (item.id === 'predict' && active === 'result');
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all"
            style={{ color: isActive ? 'var(--brand-500)' : 'var(--text-muted)', minWidth: '60px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {item.icon}
            <span style={{ fontSize: '1rem', fontWeight: 500 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Section Title Helper ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════ */
export default function DragonGradeApp() {
  const [screen,    setScreen]    = useState<ScreenId>('home');
  const [result,    setResult]    = useState<PredictionResult | null>(null);
  const [imageSrc,  setImageSrc]  = useState<string | null>(null);
  const [history,   setHistory]   = useState<HistoryItem[]>([]);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setBackendOk);
    const id = setInterval(() => checkHealth().then(setBackendOk), 15_000);
    return () => clearInterval(id);
  }, []);

  const handleResult = useCallback((r: PredictionResult, file: File) => {
    setResult(r);
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    setScreen('result');
  }, []);

  const handleReset = useCallback(() => {
    setResult(null); setImageSrc(null); setScreen('predict');
  }, []);

  const handleSaveHistory = useCallback(() => {
    if (!result) return;
    const now  = new Date();
    const item: HistoryItem = {
      id:         `hist-${Date.now()}`,
      filename:   imageSrc ? 'captured_image.jpg' : 'unknown.jpg',
      time:       now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      confidence: result.confidence * 100,
      label:      result.label,
      previewSrc: imageSrc ?? undefined,
    };
    setHistory((prev) => [item, ...prev]);
  }, [result, imageSrc]);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', background: 'var(--bg-base)' }}
    >
      <Sidebar active={screen} onNav={setScreen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar screen={screen} backendOk={backendOk} />

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="flex-1 flex flex-col min-h-0"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex-1 flex flex-col min-h-0" style={{ paddingBottom: 'clamp(72px, 10vh, 80px)' }}>
              {screen === 'home'    && <HomeScreen    onNavigate={setScreen} />}
              {screen === 'predict' && <PredictScreen onResult={handleResult} backendOk={backendOk} />}
              {screen === 'result'  && <ResultScreen  result={result} imageSrc={imageSrc} onReset={handleReset} onSaveHistory={handleSaveHistory} />}
              {screen === 'history' && <HistoryScreen items={history} />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <MobileNav active={screen} onNav={setScreen} />
    </div>
  );
}
