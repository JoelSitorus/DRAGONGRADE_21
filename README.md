# 🔴 DragonGrade — Klasifikasi Kematangan Buah Naga

> Proyek Capstone Sains Data | MobileNetV2 Transfer Learning

---

## 📁 Struktur Project

```
DragonGrade/
├── app.py                                  ← Flask API + serve React frontend
├── requirements.txt                        ← Python dependencies (Python 3.13)
├── Procfile                                ← Gunicorn start command
├── runtime.txt                             ← Python 3.13.3
├── railway.toml                            ← Railway config (1 service)
├── setup_windows.ps1                       ← Script setup otomatis Windows
├── .gitignore
├── best_mobilenetv2_dragonfruit.keras      ← Model MobileNetV2
│
└── frontend/                               ← React + Vite + Tailwind
    ├── src/
    │   ├── pages/home/Index.tsx
    │   ├── lib/index.ts                    ← API calls ke /api/*
    │   └── ...
    ├── package.json
    └── vite.config.ts                      ← Proxy /api → localhost:5000 (dev only)
```

---

## 🖥️ Menjalankan di Localhost

### Setup Pertama (sekali saja)

Buka VS Code di folder `DragonGrade/`, buka terminal, jalankan:

```powershell
python -m venv venv --upgrade-deps
venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

```powershell
cd frontend
npm install
cd ..
```

> Jika `Activate.ps1` diblokir:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

### Setiap Kali Buka VS Code

**Terminal 1 — Backend:**
```powershell
venv\Scripts\Activate.ps1
python app.py
```
→ http://localhost:5000

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```
→ http://localhost:3000

---

## 🚀 Deploy ke Railway (1 Service)

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. Buat Project di Railway

1. Buka [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → pilih repo
3. Railway otomatis detect `railway.toml` → build frontend → start Flask
4. **Generate Domain** → dapat URL publik

**Tidak perlu environment variable apapun** — satu service, satu URL!

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/health` | Health check |
| POST | `/api/predict` | Prediksi gambar |
| GET | `/api/model-info` | Info model |
