import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../mlApi";

const starterPrompts = [
  "🤒 I have fever and body pain",
  "🩸 What are dengue warning signs?",
  "🦟 How to protect family from dengue mosquitoes?",
];

const ChatBox = ({ isOpen, onClose, patientData }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [listeningLang, setListeningLang] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isSecureOrigin, setIsSecureOrigin] = useState(true);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionCtorRef = useRef(null);

  const isSecureContext = () => {
    if (typeof window === "undefined") return false;
    const { hostname, protocol } = window.location;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    return Boolean(window.isSecureContext || protocol === "https:" || isLocalhost);
  };

  const buildRecognition = (SpeechRecognition) => {
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      const cleaned = transcript.trim();
      if (cleaned) {
        setInput(cleaned);
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error || "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceError("Microphone permission denied. Please allow microphone access.");
      } else if (code === "no-speech") {
        setVoiceError("No speech detected. Please try again.");
      } else if (code === "audio-capture") {
        setVoiceError("No microphone detected. Please check your audio device.");
      } else if (code === "network") {
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        const needsHttps = !isSecureContext();
        if (offline) {
          setVoiceError("You're offline. Connect to the internet and try again.");
        } else if (needsHttps) {
          setVoiceError("Voice input needs HTTPS or localhost. Open the site over HTTPS to use the microphone.");
        } else {
          setVoiceError("Network error. Speech service unreachable. Please try again.");
        }
        if (recognitionCtorRef.current) {
          recognitionRef.current = buildRecognition(recognitionCtorRef.current);
        }
      } else if (code === "aborted") {
        setVoiceError("");
      } else {
        setVoiceError(`Voice recognition failed (${code}). Please try again.`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const secureOrigin = isSecureContext();
    setIsSecureOrigin(secureOrigin);
    setIsSpeechSupported(Boolean(SpeechRecognition));
    recognitionCtorRef.current = SpeechRecognition || null;

    if (SpeechRecognition && secureOrigin) {
      try {
        recognitionRef.current = buildRecognition(SpeechRecognition);
      } catch (err) {
        console.error("SpeechRecognition initialization failed:", err);
        setIsSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const startListening = (lang) => {
    setVoiceError("");
    
    if (!isSpeechSupported) {
      setVoiceError("Voice is not supported in this browser. Please type your message.");
      return;
    }

    if (!isSecureOrigin) {
      setVoiceError("Voice input needs HTTPS or localhost. Open the site over HTTPS to use the microphone.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setVoiceError("You're offline. Connect to the internet and try again.");
      return;
    }

    if (!recognitionRef.current && recognitionCtorRef.current) {
      recognitionRef.current = buildRecognition(recognitionCtorRef.current);
    }

    if (!recognitionRef.current) {
      setVoiceError("Voice is not supported in this browser. Please type your message.");
      return;
    }

    // If currently listening, don't try to start again to prevent network/abort crashes
    if (isListening) {
      return;
    }

    try {
      recognitionRef.current.lang = lang;
      setListeningLang(lang);
      recognitionRef.current.start();
    } catch (err) {
      // Usually DOMException if already started
      console.error("Speech recognition start error:", err);
      // Try to recover
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const sendMessage = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || isSending) return;

    // Cancel any active speech synthesis when sending a new message
    window.speechSynthesis?.cancel();

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const data = await sendChatMessage({ message: text, history: nextMessages, patient_data: patientData });
      const reply = String(data?.reply || "").trim() || "Sorry, I could not respond right now.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch {
      const fallback = "Sorry, I could not respond right now.";
      setMessages([
        ...nextMessages,
        { role: "assistant", content: fallback },
      ]);
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
              onClick={() => setMessages([])}
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

        <div className="border-t border-white/10 p-4">
          <div className="mb-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/90">
              What can Smart Doctor help with today?
            </p>
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
          <div className="mb-3 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-teal-500/10 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startListening("bn-BD")}
                disabled={isListening || !isSpeechSupported || !isSecureOrigin}
                className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(56,189,248,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                🎤 Speak Bangla
              </button>
              <button
                type="button"
                onClick={() => startListening("en-US")}
                disabled={isListening || !isSpeechSupported || !isSecureOrigin}
                className="rounded-full border border-blue-300/35 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500/20 hover:shadow-[0_0_16px_rgba(96,165,250,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                🎤 Speak English
              </button>
              {isListening && (
                <button
                  type="button"
                  onClick={stopListening}
                  className="rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition-all duration-300 hover:bg-rose-500/20"
                >
                  Stop Recording
                </button>
              )}
            </div>

            {isListening && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-cyan-300/20 bg-black/20 px-3 py-2">
                <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                <span className="text-xs font-medium text-cyan-100">
                  Listening... {listeningLang === "bn-BD" ? "(Bangla)" : "(English)"}
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
            {isSecureOrigin && !isSpeechSupported && (
              <p className="mt-2 text-xs text-amber-200">
                Voice input is not supported on this browser. You can still type your message.
              </p>
            )}
            {voiceError && <p className="mt-2 text-xs text-rose-200">{voiceError}</p>}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              className="h-12 flex-1 resize-none rounded-xl border border-white/10 bg-[#111c33] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={handleSend}
              type="button"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
