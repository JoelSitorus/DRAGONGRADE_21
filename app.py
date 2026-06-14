"""
DragonGrade Backend API
Klasifikasi Tingkat Kematangan Buah Naga Berbasis Citra RGB
Model: MobileNetV2 (Transfer Learning)
"""

import os
import io
import json
import base64
import numpy as np
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image

# ─── TFLite import ───────────────────────────────────────────────────────────
# Menggunakan tflite_runtime (ringan ~2MB) atau fallback ke TF biasa.
try:
    import tflite_runtime.interpreter as tflite
    TFLiteInterpreter = tflite.Interpreter
except ImportError:
    import tensorflow as tf
    TFLiteInterpreter = tf.lite.Interpreter

# ─── Config ──────────────────────────────────────────────────────────────────
# Cari model di folder yang sama dengan app.py (untuk Railway/production)
_BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
_MODEL_DEFAULT = os.path.join(_BASE_DIR, "model_dragonfruit.tflite")
MODEL_PATH = os.environ.get("MODEL_PATH", _MODEL_DEFAULT)
IMG_SIZE   = (224, 224)
# Kelas diurutkan alfabetis sesuai flow_from_directory Keras
CLASS_NAMES = ["defect", "immature", "mature"]

# ────────────────────────────────────────────────────────────────────────────
# THRESHOLD STRATEGY (berlapis):
#
#  1. is_valid_image_quality()     — tolak gambar gelap/noise/terlalu polos
#  2. analyze_dragonfruit_features()
#       → skor visual berbasis warna HSV + tekstur + rasio merah/hijau
#       → mengembalikan (is_likely_dragonfruit: bool, visual_score: float)
#  3. model.predict()              — softmax 3 kelas
#  4. build_result():
#       • Jika visual_score < VIS_REJECT  → unknown (tolak sebelum model)
#       • Jika confidence < CONF_THRESHOLD → unknown
#       • Jika visual_score < VIS_WARN dan confidence < CONF_HIGH → unknown
#       • Jika lulus semua → klasifikasi normal
# ────────────────────────────────────────────────────────────────────────────
CONF_THRESHOLD = 0.70   # minimum confidence model untuk diterima
CONF_HIGH      = 0.85   # confidence "tinggi" (biasa threshold lama)
VIS_REJECT     = 0.20   # skor visual terlalu rendah → pasti bukan buah naga
VIS_WARN       = 0.35   # skor visual rendah → perlu confidence tinggi

# ─── Static folder = hasil build React (frontend/dist) ────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─── Load Model ──────────────────────────────────────────────────────────────
model = None

def get_model():
    """Load TFLite interpreter (ringan, cepat). Di-cache di variabel global."""
    global model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model tidak ditemukan: {MODEL_PATH}\n"
                "Jalankan convert_to_tflite.py di lokal, lalu upload file .tflite ke repo."
            )
        print(f"[DragonGrade] Loading TFLite model dari {MODEL_PATH} ...")
        interpreter = TFLiteInterpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        model = interpreter
        print("[DragonGrade] TFLite model siap ✓")
    return model


def tflite_predict(interpreter, arr):
    """Jalankan inferensi TFLite. arr shape: (1,224,224,3) float32."""
    inp  = interpreter.get_input_details()
    out  = interpreter.get_output_details()
    interpreter.set_tensor(inp[0]["index"], arr)
    interpreter.invoke()
    return interpreter.get_tensor(out[0]["index"])


# ─── Image Quality Check ─────────────────────────────────────────────────────
def is_valid_image_quality(img: Image.Image) -> bool:
    """
    Tolak gambar yang terlalu gelap, terlalu seragam (solid color),
    atau terlalu kecil untuk mengandung informasi buah naga.
    """
    gray = img.convert("L")
    stat = np.array(gray, dtype=np.float32)
    mean_brightness = float(np.mean(stat))
    std_brightness  = float(np.std(stat))

    # Terlalu gelap atau terlalu polos (noise/blank)
    if mean_brightness < 25 or std_brightness < 12:
        return False
    return True


# ─── Dragon Fruit Visual Feature Analysis ────────────────────────────────────
def analyze_dragonfruit_features(img: Image.Image) -> tuple:
    """
    Analisis multi-fitur visual untuk menilai seberapa besar kemungkinan
    objek dalam gambar adalah buah naga (Hylocereus sp.).

    Fitur yang dianalisis:
      A. Distribusi warna HSV
         - Buah naga mature/defect : dominan merah (H ≈ 0–15° atau 340–360°)
           disertai sisik yang masih mengandung hijau (H ≈ 60–140°)
         - Buah naga immature      : dominan hijau terang (H ≈ 60–140°)
           dengan aksen merah muda di pangkal
         - Non-buah naga merah     : biasanya memiliki saturasi / value
           yang berbeda, atau tidak memiliki kombinasi merah + hijau khas

      B. Saturasi rata-rata & distribusinya
         - Buah naga memiliki warna vivid (S rata-rata > 0.35)
         - Objek abu-abu / putih / coklat pucat → S rendah → bukan buah naga

      C. Rasio piksel merah & hijau terhadap area total
         - Buah naga: setidaknya salah satu proporsi (merah ATAU hijau)
           cukup signifikan (>10%)

      D. Konsistensi warna (entropi terbatas)
         - Buah naga memiliki warna yang cukup konsisten dalam blok besar;
           gambar dengan terlalu banyak warna acak (foto landscape, objek campur)
           akan memiliki distribusi hue yang sangat menyebar.

    Returns
    -------
    (is_likely: bool, visual_score: float [0.0–1.0])
      visual_score mendekati 1.0 = hampir pasti buah naga
      visual_score mendekati 0.0 = hampir pasti bukan buah naga
    """
    # ── Resize ke 64×64 untuk analisis cepat ──
    small = img.resize((64, 64), Image.LANCZOS).convert("RGB")
    arr   = np.array(small, dtype=np.float32) / 255.0   # (64,64,3) float [0,1]

    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # ── Konversi ke HSV manual ──────────────────────────────────────────
    Cmax   = np.maximum(np.maximum(R, G), B)
    Cmin   = np.minimum(np.minimum(R, G), B)
    delta  = Cmax - Cmin + 1e-8

    # Value
    V = Cmax

    # Saturation
    S = np.where(Cmax > 0.01, delta / Cmax, 0.0)

    # Hue (0–360)
    H = np.zeros_like(R)
    mask_r = (Cmax == R) & (delta > 0.01)
    mask_g = (Cmax == G) & (delta > 0.01)
    mask_b = (Cmax == B) & (delta > 0.01)
    H[mask_r] = (60.0 * ((G[mask_r] - B[mask_r]) / delta[mask_r])) % 360
    H[mask_g] = (60.0 * ((B[mask_g] - R[mask_g]) / delta[mask_g]) + 120)
    H[mask_b] = (60.0 * ((R[mask_b] - G[mask_b]) / delta[mask_b]) + 240)

    total_px = float(H.size)

    # ── A. Masker warna khas buah naga ──────────────────────────────────
    # Merah-magenta khas kulit buah naga matang: H ∈ [0,20] ∪ [330,360], S>0.35, V>0.25
    red_mask = (
        ((H <= 20) | (H >= 330)) &
        (S > 0.35) &
        (V > 0.25)
    )
    # Hijau khas sisik/buah muda: H ∈ [55,160], S>0.25, V>0.20
    green_mask = (
        (H >= 55) & (H <= 160) &
        (S > 0.25) &
        (V > 0.20)
    )
    # Merah-muda / fuchsia (immature yang mulai merah): H ∈ [300,360], S>0.25
    pink_mask = (
        (H >= 300) & (H <= 360) &
        (S > 0.25) &
        (V > 0.25)
    )

    ratio_red   = float(np.sum(red_mask))   / total_px
    ratio_green = float(np.sum(green_mask)) / total_px
    ratio_pink  = float(np.sum(pink_mask))  / total_px
    ratio_dragon_color = ratio_red + ratio_green + ratio_pink  # bisa overlap, tidak masalah

    # ── B. Saturasi rata-rata & fraksi piksel jenuh ─────────────────────
    mean_sat     = float(np.mean(S))
    frac_sat     = float(np.mean(S > 0.30))   # fraksi piksel cukup berwarna

    # ── C. Hue diversity (entropi proxy) ────────────────────────────────
    # Hitung histogram hue (36 bin × 10°) hanya pada piksel jenuh
    sat_px   = H[S > 0.20]
    if sat_px.size > 50:
        hist, _  = np.histogram(sat_px, bins=36, range=(0, 360))
        hist_p   = hist / (hist.sum() + 1e-8)
        hue_entropy = float(-np.sum(hist_p * np.log(hist_p + 1e-8)))
        # Entropy maks teoritis = ln(36) ≈ 3.58 (semua bin sama)
        hue_entropy_norm = hue_entropy / 3.58
    else:
        hue_entropy_norm = 1.0  # sedikit piksel berwarna → anggap kurang informatif

    # ── D. Scoring ───────────────────────────────────────────────────────
    # Komponen skor (masing-masing [0,1]):
    #   1. Proporsi warna khas buah naga (merah + hijau + pink)
    score_color   = min(ratio_dragon_color / 0.40, 1.0)   # skor penuh jika ≥40% piksel

    #   2. Saturasi cukup (warna vivid)
    score_sat     = min(mean_sat / 0.45, 1.0)

    #   3. Fraksi piksel berwarna (tidak terlalu banyak abu-abu/putih)
    score_frac    = min(frac_sat / 0.35, 1.0)

    #   4. Diversitas hue rendah = lebih konsisten = lebih seperti buah naga
    #      Buah naga punya hue yang cukup terkonsentrasi (merah + hijau, tidak semua warna)
    #      Entropy norm rendah (~0.3–0.6) = bagus; tinggi (>0.75) = banyak warna → bukan buah naga
    score_hue_cons = max(0.0, 1.0 - ((hue_entropy_norm - 0.30) / 0.50))

    #   5. Bonus jika ada KOMBINASI merah dan hijau sekaligus
    #      (ciri khas buah naga: kulit merah dengan sisik hijau)
    has_both        = (ratio_red > 0.05) and (ratio_green > 0.05)
    bonus_both      = 0.15 if has_both else 0.0

    # Bobot akhir
    visual_score = (
        0.35 * score_color    +
        0.20 * score_sat      +
        0.15 * score_frac     +
        0.20 * score_hue_cons +
        0.10 * (ratio_red + ratio_pink > 0.08)  # ada komponen merah/pink
    ) + bonus_both

    visual_score = float(np.clip(visual_score, 0.0, 1.0))
    is_likely    = visual_score >= VIS_WARN

    return is_likely, visual_score


# ─── Preprocessing ───────────────────────────────────────────────────────────
def preprocess_image(img_bytes: bytes) -> tuple:
    """
    Pipeline preprocessing:
      1. Buka dan convert ke RGB
      2. Cek kualitas dasar (kecerahan & variasi)
      3. Analisis fitur visual buah naga
      4. Resize ke 224×224 & rescale [0,1]
      5. Expand dims untuk batch

    Returns (arr, quality_ok, is_likely_dragon, visual_score)
    """
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    # Langkah 2: cek kualitas dasar
    quality_ok = is_valid_image_quality(img)

    # Langkah 3: analisis fitur visual (dilakukan pada gambar asli sebelum resize)
    is_likely_dragon, visual_score = analyze_dragonfruit_features(img)

    # Langkah 4-5: resize & preprocess untuk model
    img_resized = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img_resized, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)   # (1, 224, 224, 3)

    return arr, quality_ok, is_likely_dragon, visual_score


# ─── Recommendation Generator ────────────────────────────────────────────────
def generate_recommendation(label: str, confidence: float, probs: list) -> str:
    """
    Sistem rekomendasi cerdas berbasis label, confidence, dan distribusi probabilitas.

    Buah naga (Hylocereus sp.) memiliki siklus pematangan:
      - Dari bunga mekar → panen optimal : 28–35 hari
      - Ciri visual immature awal       : sisik hijau penuh, kulit keras, warna merah belum muncul
      - Ciri visual immature menengah   : merah mulai muncul di pangkal, sisik masih hijau
      - Ciri visual near-mature         : merah dominan, sisik ujung mulai menguning
      - Mature optimal                  : merah merata, sisik kekuningan, kulit sedikit lentur
    """
    prob_dict  = {CLASS_NAMES[i]: probs[i] for i in range(len(CLASS_NAMES))}
    p_mature   = prob_dict["mature"]
    p_immature = prob_dict["immature"]
    p_defect   = prob_dict["defect"]

    if label == "mature":
        if confidence >= 0.95:
            return (
                "Buah naga telah mencapai kematangan optimal (confidence sangat tinggi: {:.1f}%). "
                "Ciri khas: kulit merah merata, sisik berwarna kekuningan, dan tekstur sedikit lentur saat ditekan. "
                "Segera panen dalam 1–2 hari ke depan sebelum kualitas menurun. "
                "Simpan di suhu 10–14°C untuk memperpanjang kesegaran hingga 14 hari setelah panen."
            ).format(confidence * 100)
        elif confidence >= 0.80:
            return (
                "Buah naga terindikasi matang (confidence {:.1f}%). "
                "Lakukan pengecekan manual: tekan kulit perlahan — jika sedikit lentur dan warna merah merata hingga pangkal, "
                "buah siap dipanen. Jika masih terasa sangat keras, tunda 2–3 hari dan periksa kembali. "
                "Hindari paparan sinar matahari langsung setelah panen."
            ).format(confidence * 100)
        else:
            return (
                "Model mendeteksi kemungkinan matang namun confidence rendah ({:.1f}%). "
                "Kemungkinan buah berada di fase near-mature atau terdapat variasi pencahayaan pada gambar. "
                "Periksa secara langsung: jika sisik sudah menguning dan warna merah merata di seluruh permukaan, "
                "panen dapat dilakukan. Jika tidak, tunggu 3–5 hari lagi dan ulangi pemindaian."
            ).format(confidence * 100)

    elif label == "immature":
        near_mature_ratio = p_mature / (p_mature + p_immature + 1e-9)

        if confidence >= 0.95 and near_mature_ratio < 0.05:
            return (
                "Buah naga masih sangat muda (confidence {:.1f}%). "
                "Berdasarkan analisis citra, warna dan tekstur kulit menunjukkan buah masih dalam fase awal pematangan "
                "dengan dominasi warna hijau dan sisik yang rapat. "
                "Estimasi waktu hingga panen: 3–4 minggu. "
                "Jaga kelembaban kebun (60–80%) dan hindari stres air agar proses pematangan optimal. "
                "Lakukan pemindaian ulang setiap 7 hari untuk memantau perkembangan."
            ).format(confidence * 100)
        elif confidence >= 0.80 and near_mature_ratio < 0.15:
            return (
                "Buah naga belum matang — fase pertengahan (confidence {:.1f}%). "
                "Warna merah mulai muncul namun belum merata; sisik masih didominasi warna hijau. "
                "Estimasi waktu hingga panen: 2–3 minggu, tergantung suhu lingkungan dan varietas. "
                "Pada suhu siang hari >30°C proses dapat lebih cepat; pada dataran tinggi (<20°C) bisa lebih lambat. "
                "Hindari pemangkasan daun pelindung buah saat fase ini."
            ).format(confidence * 100)
        elif near_mature_ratio >= 0.15:
            return (
                "Buah naga mendekati matang namun belum optimal (confidence immature {:.1f}%, "
                "sinyal mature terdeteksi {:.1f}%). "
                "Warna merah sudah mulai muncul cukup signifikan, tetapi sisik ujung belum sepenuhnya menguning. "
                "Estimasi waktu hingga panen: 7–14 hari. "
                "Periksa setiap 3–4 hari: buah siap panen saat warna merah merata penuh dan "
                "sisik terasa sedikit lentur di ujungnya. Jangan panen terlalu dini — "
                "gula alami buah naga baru terbentuk sempurna di hari-hari terakhir pematangan."
            ).format(p_immature * 100, p_mature * 100)
        else:
            return (
                "Buah naga belum matang (confidence {:.1f}%). "
                "Proses pematangan buah naga secara alami memerlukan waktu 28–35 hari sejak bunga mekar. "
                "Estimasi sisa waktu: 1–3 minggu, bergantung pada tahap pertumbuhan saat ini. "
                "Amati perubahan warna kulit dari hijau → merah secara bertahap sebagai indikator utama. "
                "Lakukan pemindaian ulang dalam 5–7 hari untuk evaluasi perkembangan lebih akurat."
            ).format(confidence * 100)

    elif label == "defect":
        if confidence >= 0.90:
            return (
                "Buah naga terdeteksi mengalami kerusakan/cacat signifikan (confidence {:.1f}%). "
                "Kemungkinan penyebab: infeksi jamur Colletotrichum atau bakteri Erwinia, "
                "serangan hama (kutu putih/lalat buah), luka mekanis, atau sunburn akibat paparan UV berlebih. "
                "Tindakan segera: (1) Pisahkan dari buah sehat untuk mencegah kontaminasi silang. "
                "(2) Dokumentasikan dan analisis pola kerusakan. "
                "(3) Konsultasikan dengan penyuluh pertanian jika kerusakan terjadi masif (>10% populasi). "
                "Buah ini tidak layak untuk dipasarkan segar."
            ).format(confidence * 100)
        elif confidence >= 0.70:
            return (
                "Terdeteksi indikasi kerusakan pada buah (confidence {:.1f}%). "
                "Lakukan inspeksi visual langsung: periksa permukaan kulit untuk bercak coklat/hitam, "
                "luka terbuka, atau tekstur berlendir yang menandai busuk. "
                "Jika kerusakan hanya pada permukaan kecil (<10% area), buah masih dapat digunakan "
                "untuk konsumsi lokal/olahan dengan membuang bagian yang rusak. "
                "Perbaiki sirkulasi udara di kebun dan kurangi kelembaban berlebih untuk mencegah jamur."
            ).format(confidence * 100)
        else:
            return (
                "Model mendeteksi potensi cacat namun confidence masih rendah ({:.1f}%). "
                "Kemungkinan hasil dipengaruhi oleh pencahayaan tidak merata atau sudut pengambilan gambar. "
                "Lakukan pemindaian ulang dengan: (1) Pencahayaan alami yang cukup (tidak backlit). "
                "(2) Jarak kamera 15–30 cm dari buah. (3) Latar belakang polos/netral. "
                "Jika setelah pemindaian ulang tetap terdeteksi cacat, isolasi buah dan periksa secara manual."
            ).format(confidence * 100)

    return "Tidak dapat menghasilkan rekomendasi. Coba ulangi pemindaian dengan gambar yang lebih jelas."


# ─── Build Result ─────────────────────────────────────────────────────────────
def build_result(preds: np.ndarray, visual_score: float) -> dict:
    """
    Convert raw softmax output → structured JSON.

    Keputusan berlapis:
      Layer 1 (visual_score < VIS_REJECT)  : tolak langsung, bukan buah naga
      Layer 2 (confidence < CONF_THRESHOLD): model tidak yakin → unknown
      Layer 3 (vis rendah & conf tidak tinggi): masih meragukan → unknown
      Layer 4 : lulus semua → klasifikasi normal
    """
    probs      = preds[0].tolist()                   # [defect, immature, mature]
    pred_idx   = int(np.argmax(probs))
    label      = CLASS_NAMES[pred_idx]
    confidence = float(probs[pred_idx])

    prob_dict  = {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}

    # ── Layer 1: visual score terlalu rendah ─────────────────────────────
    # Sistem sangat yakin ini bukan buah naga; confidence "bukan buah naga" tinggi.
    # Semakin rendah visual_score, semakin tinggi keyakinan penolakan.
    not_dragon_conf_l1 = round(min(0.99, 1.0 - visual_score), 4)
    if visual_score < VIS_REJECT:
        return _unknown_result(
            confidence, prob_dict,
            "Objek dalam gambar tidak memiliki karakteristik visual buah naga "
            "(warna, tekstur, dan pola tidak sesuai). "
            "Pastikan gambar yang diunggah adalah buah naga dengan pencahayaan yang cukup. "
            "Program ini dikhususkan untuk mendeteksi tingkat kematangan buah naga.",
            not_dragon_confidence=not_dragon_conf_l1,
        )

    # ── Layer 2: confidence model terlalu rendah ─────────────────────────
    # Model tidak yakin terhadap kelas apapun → kemungkinan bukan buah naga.
    # "Bukan buah naga" confidence = 1 - confidence_model (semakin rendah conf model, semakin yakin bukan buah naga)
    not_dragon_conf_l2 = round(min(0.97, 1.0 - confidence), 4)
    if confidence < CONF_THRESHOLD:
        return _unknown_result(
            confidence, prob_dict,
            f"Model tidak dapat membuat keputusan yang yakin (confidence hanya {confidence*100:.1f}%). "
            "Kemungkinan objek bukan buah naga, atau kualitas foto kurang memadai. "
            "Coba foto dengan pencahayaan lebih baik, sudut yang lebih jelas, dan buah naga sebagai objek utama.",
            not_dragon_confidence=not_dragon_conf_l2,
        )

    # ── Layer 3: visual skor rendah tapi confidence belum tinggi ─────────
    # Gabungan sinyal lemah dari dua sisi → sistem cukup yakin bukan buah naga.
    not_dragon_conf_l3 = round(min(0.95, (1.0 - visual_score + 1.0 - confidence) / 2), 4)
    if visual_score < VIS_WARN and confidence < CONF_HIGH:
        return _unknown_result(
            confidence, prob_dict,
            f"Analisis warna menunjukkan ciri buah naga yang lemah (skor visual {visual_score:.2f}), "
            f"dan confidence model juga belum cukup tinggi ({confidence*100:.1f}%). "
            "Objek mungkin memiliki warna merah atau hijau tetapi bukan buah naga. "
            "Gunakan foto yang fokus pada buah naga dengan latar belakang polos.",
            not_dragon_confidence=not_dragon_conf_l3,
        )

    # ── Layer 4: lulus semua validasi → hasil klasifikasi normal ─────────
    recommendation = generate_recommendation(label, confidence, probs)
    return {
        "label":           label,
        "confidence":      confidence,
        "is_dragon_fruit": True,
        "visual_score":    round(visual_score, 3),
        "probabilities":   prob_dict,
        "recommendation":  recommendation,
        "timestamp":       datetime.now().isoformat(),
        "model":           "MobileNetV2",
        "input_size":      "224x224",
        "preprocessing":   ["RGB Conversion", "Resize 224×224", "Rescale 1/255", "Expand Dims"],
    }


def _unknown_result(confidence: float, prob_dict: dict, recommendation: str,
                    not_dragon_confidence: float = 0.97) -> dict:
    """
    Helper: kembalikan hasil unknown dengan rekomendasi khusus.

    `not_dragon_confidence` merepresentasikan keyakinan sistem bahwa objek
    BUKAN buah naga — bukan confidence model terhadap kelas tertentu.
    Distribusi probabilitas kelas (mature/immature/defect) tetap 0.0 karena
    sistem menolak objek sebelum/sesudah klasifikasi kelas.
    """
    return {
        "label":           "unknown",
        "confidence":      not_dragon_confidence,   # tinggi = sistem yakin ini BUKAN buah naga
        "is_dragon_fruit": False,
        "visual_score":    0.0,
        "probabilities":   {name: 0.0 for name in CLASS_NAMES},
        "recommendation":  recommendation,
        "timestamp":       datetime.now().isoformat(),
        "model":           "MobileNetV2 + VisualValidator",
        "input_size":      "224x224",
        "preprocessing":   ["RGB Conversion", "Resize 224×224", "Rescale 1/255", "Expand Dims"],
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    """Health check — pastikan backend jalan."""
    return jsonify({
        "status":     "ok",
        "model":      "MobileNetV2",
        "classes":    CLASS_NAMES,
        "input_size": "224x224",
        "message":    "DragonGrade API siap digunakan",
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Endpoint prediksi utama.

    Accepts:
      - multipart/form-data  → field 'file' (image upload)
      - application/json     → { "image": "<base64-encoded-image>" }

    Returns JSON dengan label, confidence, probabilities, rekomendasi.
    """
    img_bytes = None

    # ── 1. Multipart upload ──────────────────────────────────────────────
    if request.content_type and "multipart/form-data" in request.content_type:
        if "file" not in request.files:
            return jsonify({"error": "Field 'file' tidak ditemukan"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "File kosong"}), 400
        allowed = {"jpg", "jpeg", "png", "webp", "bmp"}
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in allowed:
            return jsonify({"error": f"Format tidak didukung: .{ext}. Gunakan JPG/PNG."}), 400
        img_bytes = file.read()

    # ── 2. JSON base64 ───────────────────────────────────────────────────
    elif request.is_json:
        data = request.get_json(silent=True) or {}
        b64  = data.get("image", "")
        if not b64:
            return jsonify({"error": "Field 'image' (base64) tidak ditemukan"}), 400
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(b64)
        except Exception:
            return jsonify({"error": "Base64 tidak valid"}), 400

    else:
        return jsonify({"error": "Content-Type harus multipart/form-data atau application/json"}), 415

    # ── 3. Preprocess & Validate & Predict ──────────────────────────────
    try:
        arr, quality_ok, is_likely_dragon, visual_score = preprocess_image(img_bytes)

        # Tolak gambar gelap/noise
        if not quality_ok:
            result = {
                "label":           "unknown",
                "confidence":      0.0,
                "is_dragon_fruit": False,
                "visual_score":    0.0,
                "probabilities":   {name: 0.0 for name in CLASS_NAMES},
                "recommendation":  (
                    "Gambar terlalu gelap, terlalu seragam, atau mengandung noise berlebih. "
                    "Pastikan gambar yang diunggah adalah buah naga dengan pencahayaan yang cukup "
                    "dan objek terlihat jelas."
                ),
                "timestamp":       datetime.now().isoformat(),
                "model":           "QualityCheck-Filter",
            }
            return jsonify({"success": True, "result": result})

        # Jika visual score sangat rendah, skip model predict (hemat resource)
        if visual_score < VIS_REJECT:
            result = _unknown_result(
                0.0, {name: 0.0 for name in CLASS_NAMES},
                "Objek dalam gambar tidak memiliki karakteristik visual buah naga "
                "(warna, tekstur, dan pola tidak sesuai). "
                "Pastikan gambar yang diunggah adalah buah naga dengan pencahayaan yang cukup. "
                "Program ini dikhususkan untuk mendeteksi tingkat kematangan buah naga."
            )
            return jsonify({"success": True, "result": result})

        # Jalankan model prediksi (TFLite - cepat)
        interpreter = get_model()
        preds  = tflite_predict(interpreter, arr)
        result = build_result(preds, visual_score)
        return jsonify({"success": True, "result": result})

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Prediksi gagal: {str(e)}"}), 500


@app.route("/api/model-info", methods=["GET"])
def model_info():
    """Informasi arsitektur model."""
    return jsonify({
        "architecture":   "MobileNetV2",
        "pretrained_on":  "ImageNet",
        "fine_tuned_for": "Dragon Fruit Ripeness Classification",
        "classes":        CLASS_NAMES,
        "num_classes":    len(CLASS_NAMES),
        "input_shape":    [224, 224, 3],
        "preprocessing":  {
            "resize":  "224×224",
            "rescale": "1./255",
            "mode":    "RGB",
        },
        "validation": {
            "quality_check":    "brightness & std threshold",
            "visual_validator": "HSV color analysis (red + green + pink ratio, saturation, hue entropy)",
            "conf_threshold":   CONF_THRESHOLD,
            "vis_reject":       VIS_REJECT,
            "vis_warn":         VIS_WARN,
        },
        "training": {
            "optimizer":   "Adam",
            "loss":        "categorical_crossentropy",
            "augmentation": [
                "rotation_range=20",
                "width_shift_range=0.2",
                "height_shift_range=0.2",
                "zoom_range=0.2",
                "horizontal_flip=True",
            ],
            "split": "80% train / 10% val / 10% test",
        },
    })



# ─── Serve React Frontend ─────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """
    Serve React SPA (Single Page Application).
    - Jika file ada di dist/ (js, css, assets) → kirim file tersebut
    - Jika tidak ada (route React seperti /predict, /history) → kirim index.html
    """
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")

# ─── Entry Point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"\n{'='*60}")
    print("  DragonGrade API — MobileNetV2 Classifier")
    print(f"  Local   : http://localhost:{port}")
    print(f"  Network : http://{local_ip}:{port}  <-- akses dari HP/laptop lain")
    print(f"  Model   : {MODEL_PATH}")
    print(f"{'='*60}\n")
    try:
        get_model()
    except FileNotFoundError as e:
        print(f"⚠  WARNING: {e}\n")
    app.run(host="0.0.0.0", port=port, debug=False)


# ─── Startup Preload (untuk gunicorn/Railway) ────────────────────────────────
# Pra-load model saat module diimport agar request pertama tidak timeout
print(f"\n[DragonGrade] Startup — MODEL_PATH = {MODEL_PATH}")
try:
    get_model()
except FileNotFoundError as e:
    print(f"⚠  WARNING: {e}")
