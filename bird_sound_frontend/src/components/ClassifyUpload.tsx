import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, ChevronRight, Mic, MicOff, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import SimpleAudioPlayer from "components/AudioPlayer";
import { classifyApi } from "services/api";
import { ClassifyResponse, ClassifyPrediction } from "types/bird";
import loadingBirdAnimation from "assets/LoadingBird.json";

const ALLOWED_EXTENSIONS = [".wav", ".flac", ".mp3", ".ogg", ".m4a"];
const MAX_SECS = 60;

function getBestMimeType(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function mimeToExt(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  return "wav";
}

type MicState = "idle" | "requesting" | "recording" | "done" | "denied";

const ClassifyUpload: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [micHidden, setMicHidden] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [countdown, setCountdown] = useState(MAX_SECS);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  // Cleanup on unmount
  useEffect(() => () => {
    timerRef.current && clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const stopRecording = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setMicState("requesting");
    setError(null);
    setResult(null);
    setAudioUrl(null);
    setFile(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const denied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      setMicState(denied ? "denied" : "idle");
      if (!denied) setError("Could not access microphone: " + (err.message || err.name));
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const mime = getBestMimeType();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "audio/wav" });
      setFile(new File([blob], `recording.${mimeToExt(mime)}`, { type: mime || "audio/wav" }));
      setAudioUrl(URL.createObjectURL(blob));
      setMicState("done");
      setCountdown(MAX_SECS);
    };

    recorder.start(100);
    setMicState("recording");
    setCountdown(MAX_SECS);

    let secs = MAX_SECS;
    timerRef.current = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) { clearInterval(timerRef.current!); stopRecording(); }
    }, 1000);
  }, [stopRecording]);

  const handleMicClick = () => {
    if (micState === "recording") stopRecording();
    else startRecording();
  };

  const pickFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    setFile(f);
    setAudioUrl(URL.createObjectURL(f));
    setError(null);
    setResult(null);
  };

  const handleClassify = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await classifyApi.classify(file);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (pred: ClassifyPrediction, rank: number) => (
    <button
      key={pred.eBird}
      onClick={() => navigate(`/bird/${encodeURIComponent(pred.eBird)}`)}
      className="w-full flex items-center gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-left group"
    >
      <span className="text-xs text-white/30 font-mono w-5 shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{pred.eBird}</p>
        <p className="text-xs text-white/40">{(pred.confidence * 100).toFixed(1)}% confidence</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
    </button>
  );

  const isRecording = micState === "recording";

  return (
    <div>
      {/* ── Mic section ───────────────────────────────────────── */}
      {!micHidden && !showUpload && (
        <div className={`rounded-2xl p-8 flex flex-col items-center transition-colors duration-500 ${isRecording ? "bg-red-950/40" : "bg-white/5"}`}>

          {/* Button + ripple rings */}
          <div className="relative flex items-center justify-center mb-6">
            {isRecording && (
              <>
                <span className="absolute w-28 h-28 rounded-full bg-red-500/25 animate-ping" style={{ animationDuration: "1.4s" }} />
                <span className="absolute w-40 h-40 rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "0.35s" }} />
                <span className="absolute w-52 h-52 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "0.7s" }} />
              </>
            )}
            <button
              onClick={handleMicClick}
              disabled={micState === "requesting"}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none
                ${isRecording ? "w-24 h-24 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/60" : "w-16 h-16 bg-white/10 hover:bg-white/20"}
                ${micState === "requesting" ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
            >
              {isRecording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-7 h-7 text-white/70" />}
            </button>
          </div>

          {/* Status text */}
          {micState === "idle"      && <p className="text-sm text-white/50">Tap to record</p>}
          {micState === "requesting"&& <p className="text-sm text-white/50">Waiting for microphone…</p>}
          {micState === "done"      && <p className="text-sm text-white/50">Done — tap to record again</p>}
          {micState === "recording" && (
            <div className="text-center">
              <p className="text-sm text-red-400 font-medium">Recording — tap to stop</p>
              <p className="text-xs text-white/40 mt-1">{countdown}s remaining</p>
            </div>
          )}
          {micState === "denied" && (
            <div className="text-center">
              <p className="text-sm text-red-400">Microphone access denied.</p>
              <p className="text-xs text-white/40 mt-1">Allow it in your browser's site settings, then tap again.</p>
            </div>
          )}

          <div className="flex items-center gap-5 mt-5">
            <button onClick={() => setShowUpload(true)} className="text-xs text-white/30 hover:text-white/60 transition-colors underline">
              Try upload file?
            </button>
            <button onClick={() => setMicHidden(true)} className="text-xs text-white/20 hover:text-white/50 transition-colors">
              Hide
            </button>
          </div>
        </div>
      )}

      {/* Restore mic button (shown when hidden) */}
      {micHidden && !showUpload && (
        <button
          onClick={() => setMicHidden(false)}
          className="w-full py-2 rounded-xl text-xs text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
        >
          <Mic className="w-3 h-3" /> Use microphone
        </button>
      )}

      {/* ── Upload section ────────────────────────────────────── */}
      {showUpload && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Upload a file</p>
            <button
              onClick={() => { setShowUpload(false); setFile(null); setAudioUrl(null); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Close
            </button>
          </div>
          <div
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/40 transition-colors bg-white/5"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-3" />
            {file
              ? <p className="text-sm text-white font-medium">{file.name}</p>
              : <p className="text-sm text-white/50">Drop an audio file or click to browse</p>
            }
            <p className="text-xs text-white/30 mt-2">WAV · FLAC · MP3 · OGG · M4A</p>
          </div>
        </div>
      )}

      {/* ── Audio player ──────────────────────────────────────── */}
      {audioUrl && (
        <div className="mt-4">
          <SimpleAudioPlayer src={audioUrl} />
        </div>
      )}

      {/* ── Match button / loading ────────────────────────────── */}
      {loading ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Lottie animationData={loadingBirdAnimation} loop style={{ width: 120, height: 120 }} />
          <p className="text-sm text-white/50">Matching…</p>
        </div>
      ) : (
        <button
          onClick={handleClassify}
          disabled={!file}
          className="mt-4 w-full py-3 px-4 rounded-xl text-sm font-semibold transition-colors bg-white text-forest-900 hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
        >
          Match
        </button>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────── */}
      {result && (
        <div className="mt-6">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">Predictions — click to view bird</p>
          <div className="space-y-2">
            {result.top_predictions?.length
              ? result.top_predictions.map((p, i) => renderCard(p, i + 1))
              : renderCard({ eBird: result.eBird, confidence: result.confidence }, 1)
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassifyUpload;
