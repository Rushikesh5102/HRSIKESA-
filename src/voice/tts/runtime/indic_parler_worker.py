"""
HṚṢĪKEŚA (हृषीकेश) — Indic Parler-TTS Native Python Worker
Communicates via JSON Lines protocol over stdin/stdout.
Supports:
- ai4bharat/indic-parler-tts
- Dynamic acoustic captions
- Multi-speaker & multi-lingual synthesis (English, Hindi, Marathi, Sanskrit)
- Lazy loading and auto-idle unloading for 16GB RAM laptops
- Memory telemetry via psutil
"""

import sys
import os
import json
import time
import gc
import threading
import traceback
import psutil

# Ensure stdout is flushed on every print
def send_response(resp):
    sys.stdout.write(json.dumps(resp) + "\n")
    sys.stdout.flush()

PRIMARY_MODEL_ID = os.environ.get("INDIC_PARLER_MODEL_ID", "ai4bharat/indic-parler-tts")
FALLBACK_MODEL_ID = os.environ.get("PARLER_FALLBACK_MODEL_ID", "parler-tts/parler-tts-mini-v1")
IDLE_TIMEOUT_SECONDS = int(os.environ.get("TTS_IDLE_TIMEOUT_SECONDS", "60"))

# State
model = None
tokenizer = None
desc_tokenizer = None
current_model_id = None
is_loading = False
last_used_timestamp = 0
inference_lock = threading.Lock()

def get_memory_mb():
    try:
        proc = psutil.Process()
        return round(proc.memory_info().rss / (1024 * 1024), 1)
    except Exception:
        return 0.0

def unload_model():
    global model, tokenizer, desc_tokenizer, current_model_id
    with inference_lock:
        if model is not None:
            sys.stderr.write(f"[IndicParlerWorker] Unloading model {current_model_id} from RAM...\n")
            model = None
            tokenizer = None
            desc_tokenizer = None
            current_model_id = None
            gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass
            sys.stderr.write(f"[IndicParlerWorker] Model unloaded. Current RAM: {get_memory_mb()} MB\n")

def idle_checker_thread():
    while True:
        time.sleep(10)
        if model is not None and IDLE_TIMEOUT_SECONDS > 0:
            idle_duration = time.time() - last_used_timestamp
            if idle_duration > IDLE_TIMEOUT_SECONDS:
                sys.stderr.write(f"[IndicParlerWorker] Idle timeout reached ({idle_duration:.1f}s > {IDLE_TIMEOUT_SECONDS}s).\n")
                unload_model()

# Start background idle monitor
t_idle = threading.Thread(target=idle_checker_thread, daemon=True)
t_idle.start()

def load_model(target_model_id=None, hf_token=None):
    global model, tokenizer, desc_tokenizer, current_model_id, is_loading, last_used_timestamp
    with inference_lock:
        if model is not None and (target_model_id is None or current_model_id == target_model_id):
            last_used_timestamp = time.time()
            return True, current_model_id, "Model already loaded"

        is_loading = True
        try:
            import torch
            from transformers import AutoTokenizer
            from parler_tts import ParlerTTSForConditionalGeneration

            target = target_model_id or PRIMARY_MODEL_ID
            token = hf_token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")

            sys.stderr.write(f"[IndicParlerWorker] Loading model '{target}' (RAM before: {get_memory_mb()} MB)...\n")
            t0 = time.time()

            try:
                tok = AutoTokenizer.from_pretrained(target, token=token)
                gen_model = ParlerTTSForConditionalGeneration.from_pretrained(
                    target,
                    token=token,
                    torch_dtype=torch.float32
                )
                dtok = AutoTokenizer.from_pretrained(gen_model.config.text_encoder._name_or_path, token=token)
            except Exception as first_err:
                err_str = str(first_err)
                if ("gated" in err_str.lower() or "401" in err_str or "unauthorized" in err_str.lower()) and target != FALLBACK_MODEL_ID:
                    # Gated repository requires acceptance or token
                    sys.stderr.write(f"[IndicParlerWorker] Notice: Model '{target}' is gated on Hugging Face. Trying local/open fallback '{FALLBACK_MODEL_ID}'...\n")
                    try:
                        tok = AutoTokenizer.from_pretrained(FALLBACK_MODEL_ID)
                        gen_model = ParlerTTSForConditionalGeneration.from_pretrained(
                            FALLBACK_MODEL_ID,
                            torch_dtype=torch.float32
                        )
                        dtok = AutoTokenizer.from_pretrained(gen_model.config.text_encoder._name_or_path)
                        target = FALLBACK_MODEL_ID
                    except Exception as fallback_err:
                        raise first_err
                else:
                    raise first_err

            model = gen_model
            tokenizer = tok
            desc_tokenizer = dtok
            current_model_id = target
            last_used_timestamp = time.time()
            load_duration = time.time() - t0
            sys.stderr.write(f"[IndicParlerWorker] Successfully loaded '{target}' in {load_duration:.2f}s (RAM: {get_memory_mb()} MB)\n")
            return True, target, f"Loaded in {load_duration:.2f}s"
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            return False, target_model_id or PRIMARY_MODEL_ID, str(e)
        finally:
            is_loading = False

def check_status(hf_token=None):
    token = hf_token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    
    # Check if primary model is gated or accessible
    primary_status = "UNKNOWN"
    try:
        from huggingface_hub import model_info
        info = model_info(PRIMARY_MODEL_ID, token=token)
        primary_status = "AVAILABLE"
    except Exception as e:
        err_msg = str(e).lower()
        if "401" in err_msg or "gated" in err_msg or "unauthorized" in err_msg:
            primary_status = "NOT_CONFIGURED"
        else:
            primary_status = "NOT_AVAILABLE"

    return {
        "primaryModel": PRIMARY_MODEL_ID,
        "primaryStatus": primary_status,
        "isGated": True,
        "hasToken": bool(token),
        "activeModel": current_model_id,
        "isLoaded": model is not None,
        "isLoading": is_loading,
        "memoryMB": get_memory_mb(),
        "idleTimeoutSeconds": IDLE_TIMEOUT_SECONDS,
        "fallbackModel": FALLBACK_MODEL_ID
    }

def synthesize_text(params):
    global last_used_timestamp
    text = params.get("text", "").strip()
    caption = params.get("caption", "").strip()
    output_path = params.get("outputPath")
    speaker = params.get("speaker", "Rohit")
    language = params.get("language", "en")
    hf_token = params.get("hfToken")

    if not text:
        return {"success": False, "error": "Text cannot be empty"}

    if not caption:
        caption = f"An Indian speaker named {speaker} speaks in a calm, clear, and natural conversational tone with refined quality."

    # Ensure model is loaded
    if model is None:
        ok, loaded_id, msg = load_model(hf_token=hf_token)
        if not ok:
            return {
                "success": False,
                "error": f"Failed to load model: {msg}",
                "status": "NOT_CONFIGURED" if ("gated" in msg.lower() or "401" in msg) else "FAILED",
                "modelId": loaded_id
            }

    with inference_lock:
        last_used_timestamp = time.time()
        import soundfile as sf
        import torch

        t_start = time.time()

        # Tokenize text and description
        input_ids = tokenizer(text, return_tensors="pt").input_ids
        desc_input_ids = desc_tokenizer(caption, return_tensors="pt").input_ids

        # Run conditional generation
        generation = model.generate(input_ids=desc_input_ids, prompt_input_ids=input_ids)
        audio_arr = generation.cpu().numpy().squeeze()
        gen_duration_ms = int((time.time() - t_start) * 1000)

        # Output audio file
        if not output_path:
            os.makedirs("data/audio", exist_ok=True)
            output_path = f"data/audio/tts_{int(time.time() * 1000)}.wav"

        resolved_out = os.path.abspath(output_path)
        os.makedirs(os.path.dirname(resolved_out), exist_ok=True)

        sample_rate = getattr(model.config, "sampling_rate", 24000)
        sf.write(resolved_out, audio_arr, sample_rate)

        audio_duration_ms = int((len(audio_arr) / sample_rate) * 1000)
        last_used_timestamp = time.time()

        return {
            "success": True,
            "audioFilePath": resolved_out,
            "durationMs": audio_duration_ms,
            "generationDurationMs": gen_duration_ms,
            "sampleRate": sample_rate,
            "modelUsed": current_model_id,
            "speaker": speaker,
            "language": language,
            "caption": caption,
            "memoryMB": get_memory_mb()
        }

def main():
    sys.stderr.write("[IndicParlerWorker] Initialized and waiting for commands on stdin.\n")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id", str(time.time()))
            cmd = req.get("cmd", "")
            params = req.get("params", {})

            if cmd == "status":
                status_info = check_status(params.get("hfToken"))
                send_response({"id": req_id, "success": True, **status_info})

            elif cmd == "load":
                ok, target, msg = load_model(params.get("modelId"), params.get("hfToken"))
                send_response({
                    "id": req_id,
                    "success": ok,
                    "modelId": target,
                    "message": msg,
                    "memoryMB": get_memory_mb()
                })

            elif cmd == "unload":
                unload_model()
                send_response({
                    "id": req_id,
                    "success": True,
                    "message": "Model unloaded",
                    "memoryMB": get_memory_mb()
                })

            elif cmd == "synthesize":
                result = synthesize_text(params)
                send_response({"id": req_id, **result})

            else:
                send_response({"id": req_id, "success": False, "error": f"Unknown command: {cmd}"})

        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            send_response({"id": "err", "success": False, "error": str(e)})

if __name__ == "__main__":
    main()
