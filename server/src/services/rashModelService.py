import logging
import threading
import importlib
from pathlib import Path
from typing import Dict, Optional

import numpy as np
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parents[2] / "dengue_model.h5"
_MODEL = None
_MODEL_ERROR = None
_MODEL_LOCK = threading.Lock()
_TF_MODULE = None
_TF_LOAD_MODEL = None


def _load_tensorflow_modules():
    global _TF_MODULE, _TF_LOAD_MODEL
    if _TF_MODULE is not None and _TF_LOAD_MODEL is not None:
        return _TF_MODULE, _TF_LOAD_MODEL

    try:
        tf_module = importlib.import_module("tensorflow")
        keras_models_module = importlib.import_module("tensorflow.keras.models")
        _TF_MODULE = tf_module
        _TF_LOAD_MODEL = getattr(keras_models_module, "load_model")
        return _TF_MODULE, _TF_LOAD_MODEL
    except Exception as exc:
        raise RuntimeError(f"TensorFlow dependency unavailable: {exc}") from exc


def _ensure_model_ready(model, tf_module):
    """
    Ensure Sequential models are graph-ready so model.inputs/model.outputs exist.
    """
    has_inputs = bool(getattr(model, "inputs", None))
    has_outputs = bool(getattr(model, "outputs", None))
    if has_inputs and has_outputs:
        return model

    try:
        dummy_input = tf_module.random.normal((1, 224, 224, 3))
        model(dummy_input, training=False)
    except TypeError:
        # Some TF/Keras versions do not accept training kwarg here.
        model(dummy_input)

    has_inputs = bool(getattr(model, "inputs", None))
    has_outputs = bool(getattr(model, "outputs", None))
    if not (has_inputs and has_outputs):
        raise RuntimeError("Model graph is not ready: inputs/outputs unavailable after warm-up pass.")
    return model


def load_model():
    global _MODEL, _MODEL_ERROR
    if _MODEL is not None:
        return _MODEL
    if _MODEL_ERROR:
        raise RuntimeError(_MODEL_ERROR)

    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        try:
            if not MODEL_PATH.exists():
                raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
            tf_module, tf_load_model = _load_tensorflow_modules()
            _MODEL = tf_load_model(str(MODEL_PATH))
            _ensure_model_ready(_MODEL, tf_module)
            logger.info("Rash model loaded from %s", MODEL_PATH)
            return _MODEL
        except Exception as exc:
            _MODEL_ERROR = f"Failed to load rash model: {exc}"
            logger.exception("Rash model load failed")
            raise


def preprocess_image(image_path: str) -> np.ndarray:
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img = img.resize((224, 224))
            img_array = np.asarray(img, dtype=np.float32) / 255.0
            return np.expand_dims(img_array, axis=0)
    except UnidentifiedImageError as exc:
        raise ValueError("Invalid image file") from exc
    except Exception as exc:
        raise ValueError("Failed to process image") from exc


def _find_last_conv_layer_name(model) -> str:
    for layer in reversed(model.layers):
        output_shape = getattr(layer, "output_shape", None)
        if isinstance(output_shape, list) and output_shape:
            output_shape = output_shape[0]
        if output_shape is not None and len(output_shape) == 4:
            return layer.name
    raise ValueError("No convolutional layer found for Grad-CAM.")


def _build_gradcam_heatmap(
    img_array: np.ndarray, model, layer_name: str, pred_index: Optional[int] = None
) -> np.ndarray:
    tf, _tf_load_model = _load_tensorflow_modules()
    _ensure_model_ready(model, tf)
    # Rebuild a fresh functional graph from Sequential layers to avoid
    # Keras 3 connectivity issues with legacy .h5 Sequential exports.
    inputs = tf.keras.Input(shape=(224, 224, 3), name="gradcam_input")
    x = inputs
    conv_output_tensor = None

    for layer in model.layers:
        x = layer(x)
        if layer.name == layer_name:
            conv_output_tensor = x

    if conv_output_tensor is None:
        raise ValueError(f"Target conv layer '{layer_name}' is not connected in rebuilt graph.")

    final_prediction_tensor = x
    grad_model = tf.keras.models.Model(
        inputs=inputs,
        outputs=[conv_output_tensor, final_prediction_tensor],
        name="gradcam_wrapper_model",
    )

    with tf.GradientTape() as tape:
        conv_output, predictions = grad_model(img_array)
        if pred_index is None:
            pred_index = int(tf.argmax(predictions[0]))
        class_channel = predictions[:, pred_index]

    grads = tape.gradient(class_channel, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_output = conv_output[0]
    heatmap = tf.reduce_sum(conv_output * pooled_grads, axis=-1)
    heatmap = tf.maximum(heatmap, 0)
    max_val = tf.math.reduce_max(heatmap)
    if float(max_val) > 0:
        heatmap /= max_val
    return heatmap.numpy()


def _apply_jet_colormap(grayscale_heatmap: np.ndarray) -> np.ndarray:
    # grayscale_heatmap expected range: [0, 1]
    h = np.clip(grayscale_heatmap, 0, 1)
    r = np.clip(1.5 - np.abs(4 * h - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * h - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * h - 1), 0, 1)
    return np.stack([r, g, b], axis=-1)


def _save_gradcam_overlay(original_image_path: str, heatmap: np.ndarray, output_path: Path, alpha: float = 0.42) -> None:
    with Image.open(original_image_path) as img:
        original = img.convert("RGB")
    original_np = np.asarray(original, dtype=np.float32) / 255.0

    heatmap_img = Image.fromarray(np.uint8(np.clip(heatmap, 0, 1) * 255)).resize(
        original.size, Image.Resampling.BILINEAR
    )
    heatmap_np = np.asarray(heatmap_img, dtype=np.float32) / 255.0
    colored_heatmap = _apply_jet_colormap(heatmap_np)

    overlay = np.clip((1.0 - alpha) * original_np + alpha * colored_heatmap, 0, 1)
    overlay_img = Image.fromarray((overlay * 255).astype(np.uint8))
    overlay_img.save(output_path, format="PNG")


def predict_rash(
    image_path: str, output_dir: Optional[str] = None, output_prefix: Optional[str] = None
) -> Dict[str, object]:
    model = load_model()
    img_array = preprocess_image(image_path)
    prediction = model.predict(img_array)

    try:
        score = float(prediction[0][0])
    except Exception as exc:
        raise ValueError("Invalid model prediction output") from exc

    if score > 0.5:
        result = "NON_DENGUE"
        confidence = score * 100
    else:
        result = "DENGUE"
        confidence = (1 - score) * 100

    gradcam_filename = None
    if output_dir:
        try:
            output_directory = Path(output_dir)
            output_directory.mkdir(parents=True, exist_ok=True)
            conv_layer_name = _find_last_conv_layer_name(model)
            heatmap = _build_gradcam_heatmap(img_array, model, conv_layer_name)
            filename_prefix = output_prefix or Path(image_path).stem
            gradcam_filename = f"{filename_prefix}_gradcam.png"
            gradcam_path = output_directory / gradcam_filename
            _save_gradcam_overlay(image_path, heatmap, gradcam_path)
        except Exception as exc:
            logger.exception(
                "Grad-CAM generation failed: %s | model_inputs=%s model_outputs=%s",
                exc,
                bool(getattr(model, "inputs", None)),
                bool(getattr(model, "outputs", None)),
            )

    return {
        "prediction": result,
        "confidence": round(confidence, 2),
        "gradcam_filename": gradcam_filename,
    }


try:
    load_model()
except Exception:
    pass
