"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface Lesson {
  id: string;
  chapter: string;
  title: string;
  teluguSubtitle: string;
  summary: string;
  exampleProblem: string;
  exampleSolution: string;
}

interface QuizQuestion {
  id: number;
  lessonId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface StudentProfile {
  id: string;
  name: string;
  school: string;
  grade: string;
  completedLessons: string[];
  quizScore: number;
  questionsAsked: number;
}

const LESSONS: Lesson[] = [
  {
    id: "rational-numbers",
    chapter: "Chapter 1",
    title: "Rational Numbers (Akaraneeya Sankhyalu)",
    teluguSubtitle: "Properties of p/q form numbers & Number Line representation",
    summary:
      "A number that can be written in the form p/q, where p and q are integers and q is not equal to 0, is called a Rational Number. Example: 3/4, -5/7, 0.",
    exampleProblem: "Find the additive inverse of -7/19 and verify it.",
    exampleSolution:
      "Step 1: The additive inverse of a/b is -a/b.\nStep 2: For -7/19, changing the sign gives +7/19.\nStep 3: Check: (-7/19) + (7/19) = 0.",
  },
  {
    id: "linear-equations",
    chapter: "Chapter 2",
    title: "Linear Equations in One Variable (Ekachararaasi Rekheeya Sameekaranaalu)",
    teluguSubtitle: "Solving equations with variables on both sides",
    summary:
      "An algebraic equation with highest power of the variable equal to 1 is a linear equation. We balance both Left Hand Side (LHS) and Right Hand Side (RHS).",
    exampleProblem: "Solve for x: 3x + 5 = 2x + 12",
    exampleSolution:
      "Step 1: Bring variable terms to LHS: 3x - 2x = 12 - 5\nStep 2: Simplify both sides: x = 7\nStep 3: Verify: 3(7)+5 = 26 and 2(7)+12 = 26. Correct!",
  },
  {
    id: "squares-roots",
    chapter: "Chapter 5",
    title: "Squares and Square Roots (Vargaalu mariyu Vargamoolaalu)",
    teluguSubtitle: "Finding square roots using Prime Factorization",
    summary:
      "When a natural number m can be expressed as n^2, m is a square number. Pairing prime factors helps us quickly find the square root.",
    exampleProblem: "Find the square root of 144 using prime factorization.",
    exampleSolution:
      "Step 1: Factorize 144 = 2 x 2 x 2 x 2 x 3 x 3\nStep 2: Group into pairs = (2x2) x (2x2) x (3x3)\nStep 3: Take one from each pair = 2 x 2 x 3 = 12.",
  },
];

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    lessonId: "rational-numbers",
    question: "Which of the following is NOT a rational number?",
    options: ["0 / 5", "-3 / 8", "7 / 0", "12"],
    correctIndex: 2,
    explanation: "Division by zero (7/0) is undefined, so it is not a rational number.",
  },
  {
    id: 2,
    lessonId: "linear-equations",
    question: "If 5x - 3 = 17, what is the value of x?",
    options: ["3", "4", "5", "20"],
    correctIndex: 1,
    explanation: "5x = 17 + 3 => 5x = 20 => x = 20 / 5 = 4.",
  },
  {
    id: 3,
    lessonId: "squares-roots",
    question: "What is the square root of 225?",
    options: ["13", "14", "15", "25"],
    correctIndex: 2,
    explanation: "15 x 15 = 225, so the square root of 225 is 15.",
  },
];

const INITIAL_PROFILES: StudentProfile[] = [
  {
    id: "ravi",
    name: "Ravi Kumar",
    school: "ZPHS Mangalagiri, AP",
    grade: "Class 8 - Section A",
    completedLessons: ["rational-numbers"],
    quizScore: 2,
    questionsAsked: 4,
  },
  {
    id: "ananya",
    name: "Ananya Devi",
    school: "ZPHS Mangalagiri, AP",
    grade: "Class 8 - Section B",
    completedLessons: [],
    quizScore: 0,
    questionsAsked: 1,
  },
];

// Real-Time 60fps 3D Siri Glass Sphere Canvas Component
function SiriGlassOrb({
  isListening,
  isSpeaking,
  loadingAI,
  onClick,
}: {
  isListening: boolean;
  isSpeaking: boolean;
  loadingAI: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      const speed = isListening ? 0.055 : isSpeaking ? 0.065 : loadingAI ? 0.045 : 0.015;
      const pulse = isListening
        ? 1 + Math.sin(time * 2.5) * 0.08
        : isSpeaking
        ? 1 + Math.sin(time * 3.2) * 0.1
        : 1 + Math.sin(time) * 0.02;

      time += speed;

      const size = 280;
      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = 104 * pulse;

      ctx.clearRect(0, 0, size, size);

      // Outer subtle ambient halo
      const halo = ctx.createRadialGradient(cx, cy, baseRadius * 0.85, cx, cy, baseRadius * 1.28);
      halo.addColorStop(0, isSpeaking ? "rgba(168, 85, 247, 0.35)" : "rgba(56, 189, 248, 0.28)");
      halo.addColorStop(1, "rgba(6, 6, 18, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.28, 0, Math.PI * 2);
      ctx.fill();

      // Clip inside glass sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.clip();

      // Deep dark indigo glass interior
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseRadius);
      bgGrad.addColorStop(0, "#171c47");
      bgGrad.addColorStop(0.7, "#0b0e29");
      bgGrad.addColorStop(1, "#1c2559");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // Additive screen blending for overlapping 3D light ribbons
      ctx.globalCompositeOperation = "screen";

      const petals = [
        {
          color1: "#34d399",
          color2: "rgba(16, 185, 129, 0)",
          angle: time * 0.9 - 2.1,
          rx: baseRadius * 0.55,
          ry: baseRadius * 0.28,
          dist: baseRadius * 0.34,
        },
        {
          color1: "#38bdf8",
          color2: "rgba(14, 165, 233, 0)",
          angle: -time * 0.7 + 2.8,
          rx: baseRadius * 0.62,
          ry: baseRadius * 0.3,
          dist: baseRadius * 0.36,
        },
        {
          color1: "#3b82f6",
          color2: "rgba(37, 99, 235, 0)",
          angle: time * 0.6 - 0.3,
          rx: baseRadius * 0.75,
          ry: baseRadius * 0.48,
          dist: baseRadius * 0.3,
        },
        {
          color1: "#e879f9",
          color2: "rgba(192, 38, 211, 0)",
          angle: -time * 0.85 + 1.4,
          rx: baseRadius * 0.65,
          ry: baseRadius * 0.36,
          dist: baseRadius * 0.35,
        },
      ];

      petals.forEach((p) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(p.angle);
        ctx.scale(1, p.ry / p.rx);

        const grad = ctx.createRadialGradient(p.dist, 0, 4, p.dist, 0, p.rx);
        grad.addColorStop(0, p.color1);
        grad.addColorStop(0.65, p.color1 + "99");
        grad.addColorStop(1, p.color2);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.dist, 0, p.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Luminous White Center Singularity Starburst
      const coreGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, baseRadius * 0.45);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      coreGrad.addColorStop(0.22, "rgba(186, 230, 253, 0.75)");
      coreGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Inner glass edge reflection
      ctx.globalCompositeOperation = "source-over";
      const innerRim = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.84,
        cx,
        cy,
        baseRadius
      );
      innerRim.addColorStop(0, "rgba(255, 255, 255, 0)");
      innerRim.addColorStop(0.85, "rgba(125, 211, 252, 0.22)");
      innerRim.addColorStop(1, "rgba(224, 242, 254, 0.75)");
      ctx.fillStyle = innerRim;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Crisp Glass Sphere Outer Rim Line
      const rimStroke = ctx.createLinearGradient(
        cx - baseRadius,
        cy - baseRadius,
        cx + baseRadius,
        cy + baseRadius
      );
      rimStroke.addColorStop(0, "rgba(186, 230, 253, 0.9)");
      rimStroke.addColorStop(0.5, "rgba(99, 102, 241, 0.45)");
      rimStroke.addColorStop(1, "rgba(216, 180, 254, 0.85)");

      ctx.strokeStyle = rimStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isListening, isSpeaking, loadingAI]);

  return (
    <button
      onClick={onClick}
      aria-label="Talk to Vidya AI"
      className="relative flex items-center justify-center focus:outline-none cursor-pointer group"
    >
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="w-60 h-60 sm:w-64 sm:h-64 transition-transform duration-300 group-hover:scale-105"
      />
    </button>
  );
}

export default function VidyaAIApp() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<"tutor" | "lessons" | "quiz" | "parent">("tutor");
  const [profiles, setProfiles] = useState<StudentProfile[]>(INITIAL_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("ravi");
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(LESSONS[0]);

  const [question, setQuestion] = useState<string>("");
  const [latestAnswer, setLatestAnswer] = useState<string>("");
  const [lastUserPrompt, setLastUserPrompt] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceLang, setVoiceLang] = useState<"te-IN" | "en-IN">("te-IN");

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentStudent =
    profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthUser(currentUser);
      setCheckingAuth(false);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const savedProfiles = localStorage.getItem("vidya_ai_profiles");
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles) as StudentProfile[]);
      } catch {
        // Ignore invalid saved profile data.
      }
    }
  }, []);

  const saveProfiles = (updated: StudentProfile[]) => {
    setProfiles(updated);
    localStorage.setItem("vidya_ai_profiles", JSON.stringify(updated));
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const markLessonComplete = (lessonId: string) => {
    const updated = profiles.map((p) => {
      if (p.id !== currentStudent.id) return p;
      const already = p.completedLessons.includes(lessonId);
      return {
        ...p,
        completedLessons: already
          ? p.completedLessons
          : [...p.completedLessons, lessonId],
      };
    });
    saveProfiles(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const base64Data = result.split(",")[1];
      setImageBase64(base64Data);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const askTutor = async (customPrompt?: string) => {
    const finalQuestion = customPrompt ?? question;
    if (!finalQuestion.trim() && !imageBase64) return;

    setLastUserPrompt(finalQuestion || "Math problem photo");
    setQuestion("");
    setLoadingAI(true);
    setLatestAnswer("");

    saveProfiles(
      profiles.map((p) =>
        p.id === currentStudent.id
          ? { ...p, questionsAsked: p.questionsAsked + 1 }
          : p
      )
    );

    if (offlineMode) {
      setTimeout(() => {
        const offlineReply = `Offline Mode (${selectedLesson.title}):\n${selectedLesson.exampleSolution}`;
        setLatestAnswer(offlineReply);
        speakText(offlineReply);
        setLoadingAI(false);
        setImageBase64(null);
        setImagePreview(null);
      }, 400);
      return;
    }

    try {
      const payload = JSON.stringify({
        question: finalQuestion,
        imageBase64,
        mimeType,
        lessonContext: `${selectedLesson.chapter}: ${selectedLesson.title} (Language: ${
          voiceLang === "te-IN" ? "Telugu" : "English"
        })`,
      });

      let res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (res.status === 404) {
        res = await fetch("/api/auth/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      }

      const data = (await res.json()) as { reply?: string };
      const aiReply =
        data.reply || "Unable to fetch answer. Please try again.";
      setLatestAnswer(aiReply);
      speakText(aiReply);
    } catch {
      setLatestAnswer(
        "Connection error. Please check if the dev server is running."
      );
    } finally {
      setLoadingAI(false);
      setImageBase64(null);
      setImagePreview(null);
      setMimeType(null);
    }
  };

  const startVoiceInput = () => {
    if (isSpeaking) stopSpeaking();

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onstart: () => void;
        onend: () => void;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onstart: () => void;
        onend: () => void;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        start: () => void;
      };
    };

    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Voice input works in Google Chrome or Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = voiceLang;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      void askTutor(transcript);
    };
    recognition.start();
  };

  const handleQuizSubmit = () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) score += 1;
    });
    setQuizSubmitted(true);
    saveProfiles(
      profiles.map((p) =>
        p.id === currentStudent.id ? { ...p, quizScore: score } : p
      )
    );
  };

  if (checkingAuth || !authUser) {
    return (
      <main className="min-h-screen bg-[#07111f] flex items-center justify-center text-white">
        Loading your Vidya AI account...
      </main>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        activeTab === "tutor"
          ? "bg-[#060614] text-white"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Bar */}
      <header
        className={`px-4 py-3 border-b ${
          activeTab === "tutor"
            ? "bg-[#060614] border-white/10 text-white"
            : "bg-indigo-700 border-indigo-800 text-white"
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold px-2 py-0.5 rounded text-[11px]">
              CLASS 8
            </span>
            <h1 className="text-lg font-bold tracking-tight">Vidya AI</h1>
            <span className="hidden sm:inline text-xs text-slate-400">
              {authUser.displayName || authUser.email}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/15"
              aria-label="Switch Student Profile"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900">
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setOfflineMode(!offlineMode)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
                offlineMode
                  ? "bg-amber-400 text-slate-950"
                  : "bg-emerald-500/90 text-white"
              }`}
            >
              {offlineMode ? "Offline: ON" : "Online"}
            </button>

            <button
              onClick={handleLogout}
              className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        className={`border-b sticky top-0 z-20 ${
          activeTab === "tutor"
            ? "bg-[#060614]/95 border-white/10"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          {[
            { id: "tutor", label: "AI Voice & Photo Tutor" },
            { id: "lessons", label: "Math Lessons" },
            { id: "quiz", label: "Practice Quiz" },
            { id: "parent", label: "Parent / Teacher" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "lessons" | "tutor" | "quiz" | "parent")
              }
              className={`px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? activeTab === "tutor"
                    ? "border-cyan-400 text-cyan-300"
                    : "border-indigo-600 text-indigo-700"
                  : activeTab === "tutor"
                  ? "border-transparent text-slate-400 hover:text-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* TAB 1: REAL-TIME 3D SIRI GLASS SPHERE CANVAS + CURVED SEARCH BAR */}
      {activeTab === "tutor" && (
        <main className="flex-1 flex flex-col justify-between items-center px-4 py-5 bg-[#060614]">
          {/* Language Pill */}
          <div className="w-full max-w-2xl flex justify-between items-center">
            <span className="text-xs text-slate-400">
              {selectedLesson.chapter}
            </span>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
              <button
                onClick={() => setVoiceLang("te-IN")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  voiceLang === "te-IN"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Telugu
              </button>
              <button
                onClick={() => setVoiceLang("en-IN")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  voiceLang === "en-IN"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Center Stage: Exact 3D Siri Glass Sphere Canvas */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 w-full max-w-2xl">
            <SiriGlassOrb
              isListening={isListening}
              isSpeaking={isSpeaking}
              loadingAI={loadingAI}
              onClick={isSpeaking ? stopSpeaking : startVoiceInput}
            />

            <p className="mt-2 text-xs sm:text-sm text-cyan-200/80 tracking-wide text-center">
              {isListening
                ? "Listening..."
                : isSpeaking
                ? "Speaking... (Tap orb to stop)"
                : loadingAI
                ? "Thinking..."
                : "Tap the orb to speak"}
            </p>

            {/* Clean Response Card */}
            {latestAnswer && (
              <div className="mt-4 w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-left space-y-2 max-h-48 overflow-y-auto">
                {lastUserPrompt && (
                  <p className="text-xs text-cyan-300 font-medium">
                    You: {lastUserPrompt}
                  </p>
                )}
                <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {latestAnswer}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => speakText(latestAnswer)}
                    className="text-xs font-semibold text-cyan-300 hover:underline"
                  >
                    Listen Again
                  </button>
                  <button
                    onClick={() => setLatestAnswer("")}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Curved Gemini / ChatGPT Search Bar */}
          <div className="w-full max-w-2xl space-y-2">
            {imagePreview && (
              <div className="mx-auto w-fit flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
                <img
                  src={imagePreview}
                  alt="Attached math"
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span className="text-xs text-cyan-200">Photo attached</span>
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setImageBase64(null);
                  }}
                  className="text-xs text-rose-400 font-bold ml-1"
                >
                  x
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-3 py-2 shadow-2xl focus-within:border-cyan-400/70 transition">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload Math Photo"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg font-bold text-cyan-300 transition shrink-0"
              >
                +
              </button>

              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void askTutor()}
                placeholder="Ask Vidya AI..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 px-2 focus:outline-none"
              />

              <button
                onClick={startVoiceInput}
                title="Speak Doubt"
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                  isListening
                    ? "bg-rose-500 text-white"
                    : "bg-white/10 hover:bg-white/20 text-cyan-300"
                }`}
              >
                Mic
              </button>

              <button
                onClick={() => void askTutor()}
                disabled={loadingAI}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 hover:opacity-90 disabled:opacity-40 flex items-center justify-center text-slate-950 font-extrabold text-sm transition shrink-0"
                aria-label="Send Question"
              >
                ^
              </button>
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: LESSONS */}
      {activeTab === "lessons" && (
        <main className="max-w-5xl w-full mx-auto p-4 flex-1">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase text-slate-500">
                Class 8 Syllabus (Offline Cached)
              </h2>
              {LESSONS.map((lesson) => {
                const isDone = currentStudent.completedLessons.includes(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedLesson.id === lesson.id
                        ? "bg-indigo-50 border-indigo-500 shadow-sm"
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs text-indigo-600 font-semibold">
                      <span>{lesson.chapter}</span>
                      {isDone && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm mt-1">{lesson.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {lesson.teluguSubtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-2 border-b pb-3">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    {selectedLesson.chapter}
                  </span>
                  <h2 className="text-xl font-bold mt-0.5">
                    {selectedLesson.title}
                  </h2>
                </div>
                <button
                  onClick={() => speakText(selectedLesson.summary)}
                  className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-200"
                >
                  Listen Audio
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-700">
                  Key Concept
                </h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {selectedLesson.summary}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-900">
                  Solved Textbook Example
                </h3>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  Q: {selectedLesson.exampleProblem}
                </p>
                <pre className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap font-sans mt-2 bg-white p-3 rounded border border-amber-100">
                  {selectedLesson.exampleSolution}
                </pre>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => markLessonComplete(selectedLesson.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  {currentStudent.completedLessons.includes(selectedLesson.id)
                    ? "Lesson Completed"
                    : "Mark Lesson Complete"}
                </button>
                <button
                  onClick={() => {
                    setActiveTab("tutor");
                    void askTutor(
                      `Explain ${selectedLesson.title} in simple Telugu with a new example.`
                    );
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  Ask Voice Orb
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* TAB 3: QUIZ */}
      {activeTab === "quiz" && (
        <main className="max-w-5xl w-full mx-auto p-4 flex-1">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold">
                  Class 8 Quick Practice Quiz
                </h2>
                <p className="text-xs text-slate-500">
                  Works 100% offline - Instant step-by-step feedback
                </p>
              </div>
              {quizSubmitted && (
                <span className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-sm">
                  Score: {currentStudent.quizScore} / {QUIZ_QUESTIONS.length}
                </span>
              )}
            </div>

            {QUIZ_QUESTIONS.map((q, index) => (
              <div key={q.id} className="p-4 rounded-lg bg-slate-50 border space-y-2">
                <p className="font-semibold text-sm">
                  {index + 1}. {q.question}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === optIdx;
                    let btnStyle = "bg-white border-slate-300 text-slate-800";
                    if (quizSubmitted) {
                      if (optIdx === q.correctIndex) {
                        btnStyle =
                          "bg-emerald-100 border-emerald-600 text-emerald-900 font-semibold";
                      } else if (isSelected) {
                        btnStyle = "bg-red-100 border-red-500 text-red-900";
                      }
                    } else if (isSelected) {
                      btnStyle =
                        "bg-indigo-100 border-indigo-600 text-indigo-900 font-semibold";
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={quizSubmitted}
                        onClick={() =>
                          setSelectedAnswers({ ...selectedAnswers, [q.id]: optIdx })
                        }
                        className={`text-left px-3 py-2 rounded border text-sm transition ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && (
                  <p className="text-xs text-slate-600 pt-1">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}

            <div className="flex gap-3">
              {!quizSubmitted ? (
                <button
                  onClick={handleQuizSubmit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg text-sm"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-lg text-sm"
                >
                  Retake Quiz
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* TAB 4: PARENT / TEACHER VIEW */}
      {activeTab === "parent" && (
        <main className="max-w-5xl w-full mx-auto p-4 flex-1">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold">
                Parent & Teacher Progress Monitor
              </h2>
              <p className="text-xs text-slate-500">
                Shared-device family & classroom learning overview
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {profiles.map((student) => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base">{student.name}</h3>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                      {student.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{student.school}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-lg font-bold text-emerald-600">
                        {student.completedLessons.length}/{LESSONS.length}
                      </div>
                      <div className="text-[11px] text-slate-500">Lessons</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-lg font-bold text-indigo-600">
                        {student.quizScore}/{QUIZ_QUESTIONS.length}
                      </div>
                      <div className="text-[11px] text-slate-500">Quiz Score</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-lg font-bold text-amber-600">
                        {student.questionsAsked}
                      </div>
                      <div className="text-[11px] text-slate-500">AI Doubts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}