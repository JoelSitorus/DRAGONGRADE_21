"""
Jalankan script ini SEKALI di lokal kamu:
  python convert_to_tflite.py

Output: model_dragonfruit.tflite (~3-5MB, inference 5-10x lebih cepat dari .keras)

Requirements: pip install tensorflow
"""
import tensorflow as tf

MODEL_INPUT  = "best_mobilenetv2_dragonfruit.keras"
MODEL_OUTPUT = "model_dragonfruit.tflite"

print("Loading model...")
model = tf.keras.models.load_model(MODEL_INPUT)
model.summary()

print("\nConverting to TFLite (float32)...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

with open(MODEL_OUTPUT, "wb") as f:
    f.write(tflite_model)

size_mb = len(tflite_model) / 1024 / 1024
print(f"\n✓ Saved: {MODEL_OUTPUT} ({size_mb:.1f} MB)")
print("Upload file .tflite ini ke repo Railway kamu, lalu ganti app.py dengan versi TFLite.")
