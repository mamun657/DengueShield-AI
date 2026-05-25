import { useEffect, useRef, useState } from "react";
import api from "../api";
import { sendChatMessage } from "../mlApi";

const starterPrompts = [
  "🤒 I have fever and body pain",
  "🩸 What are dengue warning signs?",
  "🦟 How to protect family from dengue mosquitoes?",
];

const SuggestionsIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const ChevronDownIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  </svg>
);

const ChatBox = ({ isOpen, onClose, patientData }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isEntering, setIsEntering] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [listeningLang, setListeningLang] = useState("");
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isSecureOrigin, setIsSecureOrigin] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const MAX_RECORD_MS = 30000;

  const isSecureContext = () => {
    if (typeof window === "undefined") return false;
    const { hostname, protocol } = window.location;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    return Boolean(window.isSecureContext || protocol === "https:" || isLocalhost);
  };

  const pickRecorderMimeType = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  const releaseMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const transcribeRecording = async (blob, lang) => {
    setIsTranscribing(true);
    setVoiceError("");

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("lang", lang === "bn-BD" ? "bn" : "en");

    try {
      const response = await api.post("/speech/transcribe", formData);
      const transcript = String(response.data?.transcript || "").trim();

      if (response.data?.success && transcript) {
        setInput(transcript);
        return;
      }

      setVoiceError(response.data?.error || "Could not transcribe audio. Please try again.");
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        (typeof navigator !== "undefined" && navigator.onLine === false
          ? "You're offline. Connect to the internet and try again."
          : "Could not reach speech service. Ensure the backend is running on port 5000.");
      setVoiceError(message);
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsEntering(false);
      return;
    }
    const timer = setTimeout(() => setIsEntering(true), 20);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setSuggestionsExpanded(true);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      setSuggestionsExpanded(false);
    }
  }, [messages.length]);

  useEffect(() => {
    const secureOrigin = isSecureContext();
    const supported =
      secureOrigin &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";

    setIsSecureOrigin(secureOrigin);
    setIsVoiceSupported(supported);

    return () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      releaseMediaStream();
    };
  }, []);

  const stopListening = () => {
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      try {
        recorder.stop();
      } catch {
        releaseMediaStream();
        setIsListening(false);
      }
      return;
    }

    releaseMediaStream();
    setIsListening(false);
  };

  const startListening = async (lang) => {
    setVoiceError("");

    if (!isVoiceSupported) {
      if (!isSecureOrigin) {
        setVoiceError("Voice input needs HTTPS or localhost. Open the site over HTTPS to use the microphone.");
      } else {
        setVoiceError("Voice is not supported in this browser. Please type your message.");
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setVoiceError("You're offline. Connect to the internet and try again.");
      return;
    }

    if (isListening || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const activeLang = lang;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        releaseMediaStream();
        setIsListening(false);
        mediaRecorderRef.current = null;

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (!chunks.length) {
          setVoiceError("No audio captured. Please try again.");
          return;
        }

        const blobType = mimeType || recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: blobType });
        await transcribeRecording(blob, activeLang);
      };

      recorder.onerror = () => {
        setVoiceError("Recording failed. Please try again.");
        stopListening();
      };

      mediaRecorderRef.current = recorder;
      setListeningLang(lang);
      recorder.start(250);
      setIsListening(true);

      recordTimerRef.current = setTimeout(() => {
        stopListening();
      }, MAX_RECORD_MS);
    } catch (err) {
      releaseMediaStream();
      setIsListening(false);

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setVoiceError("Microphone permission denied. Please allow microphone access.");
      } else if (err?.name === "NotFoundError") {
        setVoiceError("No microphone detected. Please check your audio device.");
      } else {
        setVoiceError("Could not start recording. Please try again.");
      }
    }
  };

  const sendMessage = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || isSending) return;

    // Cancel any active speech synthesis when sending a new message
    window.speechSynthesis?.cancel();

    setSendError("");
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const data = await sendChatMessage({ message: text, history: nextMessages, patient_data: patientData });
      const reply = String(data?.reply || "").trim() || "Sorry, I could not respond right now.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      if (data?.warning && !reply.includes("According to the WHO guideline")) {
        setSendError("Smart Doctor is temporarily unavailable. Please try again in a moment.");
      }
    } catch (err) {
      const fallback = "Could not reach Smart Doctor right now. Please check your connection and try again.";
      setMessages([...nextMessages, { role: "assistant", content: fallback }]);
      setSendError(fallback);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const handleStarterClick = async (prompt) => {
    setInput(prompt);
    await sendMessage(prompt);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-end bg-black/50 p-4 transition-all duration-300 md:items-center ${
        isEntering ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`flex h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#0f172a] shadow-[0_20px_48px_rgba(2,6,23,0.52)] backdrop-blur-xl transition-all duration-300 ${
          isEntering ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.985]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-white">Smart Doctor</h3>
            <p className="text-xs text-slate-400">Ask about symptoms in Bangla or English</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-gray-200 transition hover:bg-white/10"
              onClick={() => {
                setMessages([]);
                setSuggestionsExpanded(true);
              }}
              type="button"
            >
              Clear chat
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-gray-200 transition hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-xs text-gray-400">
              Start a conversation about symptoms, prevention, or warning signs.
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}`}
              className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-gray-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              
              {/* Optional future-ready manual Listen button (uncomment to enable) */}
              {/* 
              {msg.role === "assistant" && (
                <button
                  type="button"
                  onClick={() => {
                    const isBangla = /[\u0980-\u09FF]/.test(msg.content);
                    speakReply(msg.content, isBangla ? "bn-BD" : "en-US");
                  }}
                  className="ml-2 mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 transition hover:text-cyan-300"
                >
                  🔊 Listen
                </button>
              )} 
              */}
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/10 px-4 py-2 text-xs text-gray-300">
                Typing...
              </div>
            </div>
          )}
        </div>

        <div className="relative shrink-0 border-t border-white/10 p-4 pt-3">
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
              suggestionsExpanded ? "mb-3 grid-rows-[1fr] opacity-100" : "mb-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div
              className={`min-h-0 overflow-hidden ${suggestionsExpanded ? "" : "pointer-events-none"}`}
            >
              <section className="space-y-3" aria-hidden={!suggestionsExpanded}>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/90">
                      What can Smart Doctor help with today?
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuggestionsExpanded(false)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label="Hide suggestions"
                      title="Hide suggestions"
                    >
                      <ChevronDownIcon />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleStarterClick(prompt)}
                  disabled={isSending}
                  className="rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 px-3 py-1.5 text-xs text-cyan-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200/55 hover:bg-cyan-400/15 hover:shadow-[0_0_20px_rgba(45,212,191,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-teal-500/10 p-3">
                  <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startListening("bn-BD")}
                disabled={isListening || isTranscribing || !isVoiceSupported || !isSecureOrigin}
                className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(56,189,248,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                🎤 Speak Bangla
              </button>
              <button
                type="button"
                onClick={() => startListening("en-US")}
                disabled={isListening || isTranscribing || !isVoiceSupported || !isSecureOrigin}
                className="rounded-full border border-blue-300/35 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500/20 hover:shadow-[0_0_16px_rgba(96,165,250,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                🎤 Speak English
              </button>
              {isListening && (
                <button
                  type="button"
                  onClick={stopListening}
                  disabled={isTranscribing}
                  className="rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition-all duration-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stop Recording
                </button>
              )}
            </div>

            {(isListening || isTranscribing) && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-cyan-300/20 bg-black/20 px-3 py-2">
                <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                <span className="text-xs font-medium text-cyan-100">
                  {isTranscribing
                    ? "Transcribing..."
                    : `Listening... ${listeningLang === "bn-BD" ? "(Bangla)" : "(English)"}`}
                </span>
                <div className="ml-auto flex items-end gap-1">
                  <span className="h-2 w-1 animate-pulse rounded bg-cyan-200/80" />
                  <span className="h-3 w-1 animate-pulse rounded bg-cyan-300/80 [animation-delay:120ms]" />
                  <span className="h-4 w-1 animate-pulse rounded bg-cyan-400/80 [animation-delay:240ms]" />
                  <span className="h-3 w-1 animate-pulse rounded bg-cyan-300/80 [animation-delay:360ms]" />
                </div>
              </div>
            )}

            {!isSecureOrigin && (
              <p className="mt-2 text-xs text-amber-200">
                Voice input needs HTTPS or localhost. Open the site over HTTPS to use the microphone.
              </p>
            )}
            {isSecureOrigin && !isVoiceSupported && (
              <p className="mt-2 text-xs text-amber-200">
                Voice input is not supported on this browser. You can still type your message.
              </p>
            )}
            {isVoiceSupported && (
              <p className="mt-2 text-xs text-slate-400">
                Tap Speak, say your message, then tap Stop Recording.
              </p>
            )}
            {voiceError && <p className="mt-2 text-xs text-rose-200">{voiceError}</p>}
                </div>
              </section>
            </div>
          </div>

          <div className={`relative ${!suggestionsExpanded ? "pt-1" : ""}`}>
            {!suggestionsExpanded && (
              <button
                type="button"
                onClick={() => setSuggestionsExpanded(true)}
                className={`absolute -top-11 right-14 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/35 bg-[#1e293b]/95 text-cyan-200 shadow-[0_4px_20px_rgba(2,6,23,0.45)] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-cyan-200/55 hover:bg-cyan-500/15 hover:shadow-[0_0_18px_rgba(56,189,248,0.35)] sm:right-16 ${
                  isEntering ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
                aria-label="Show suggestions and voice controls"
                aria-expanded={false}
                title="Suggestions & voice"
              >
                <SuggestionsIcon className="h-4 w-4" />
              </button>
            )}

            {sendError && (
            <p className="mb-2 text-xs font-medium text-rose-200">
              {sendError}
            </p>
          )}
          <div className="flex items-end gap-2">
              <textarea
                className="h-12 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#111c33] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your message..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                onClick={handleSend}
                type="button"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
