
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseConfigured,
  getMissingFirebaseConfigKeys,
} from "@/lib/firebase";

type Role = "student" | "parent" | "teacher";
type ProfileStatus = "checking" | "ready" | "error";

function generateSixDigits() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getDashboardPath(role: Role) {
  switch (role) {
    case "student":
      return "/home";
    case "parent":
      return "/parent";
    case "teacher":
      return "/teacher";
    default:
      return "/onboarding";
  }
}

// Extract useful details from Firebase and JavaScript errors.
function describeError(err: any) {
  return {
    name: err?.name ?? "Unknown",
    code: err?.code ?? "unknown",
    message: err?.message ?? String(err),
    stack: err?.stack ?? "No stack available",
    stringValue: String(err),
  };
}

function getFriendlyError(err: any) {
  const code = String(err?.code || "");

  if (code.includes("permission-denied")) {
    return "Firebase permission denied. Check your Firestore security rules.";
  }

  if (
    code.includes("unavailable") ||
    code.includes("failed-precondition") ||
    code.includes("deadline-exceeded")
  ) {
    return "Firestore server is unavailable. Check your internet connection and Firebase project settings.";
  }

  if (code.includes("unauthenticated")) {
    return "Your login session has expired. Please log in again.";
  }

  if (code.includes("already-exists")) {
    return "This profile or code already exists. Please try again.";
  }

  return err?.message || String(err) || "Something went wrong.";
}

export default function OnboardingPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profileStatus, setProfileStatus] =
    useState<ProfileStatus>("checking");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("8");
  const [studentCode, setStudentCode] = useState("");

  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedRole, setGeneratedRole] = useState<Role | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check whether this user already has a role profile.
  const checkProfile = useCallback(
    async (currentUser: User) => {
      setLoading(true);
      setProfileStatus("checking");
      setError("");

      try {
        const userRef = doc(getFirebaseDb(), "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data();
          const savedRole = profile.role;

          if (
            savedRole === "student" ||
            savedRole === "parent" ||
            savedRole === "teacher"
          ) {
            router.replace(getDashboardPath(savedRole));
            return;
          }

          throw new Error(
            "Your user document exists but does not contain a valid role."
          );
        }

        setProfileStatus("ready");
      } catch (err: any) {
        const details = describeError(err);

        console.error(
          "========== VIDYA AI PROFILE CHECK ERROR =========="
        );
        console.error("Error name:", details.name);
        console.error("Error code:", details.code);
        console.error("Error message:", details.message);
        console.error("Error stack:", details.stack);
        console.error("Original error object:", err);
        console.error("Error string:", details.stringValue);
        console.error(
          "========== END PROFILE CHECK ERROR =========="
        );

        setError(
          `${details.code}: ${getFriendlyError(err)}`
        );
        setProfileStatus("error");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // Listen for Firebase authentication changes.
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.error(
        "Firebase is not configured. Missing env vars: " +
          getMissingFirebaseConfigKeys().join(", ")
      );
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        router.replace("/login");
        return;
      }

      setUser(currentUser);
      setName((previous) => previous || currentUser.displayName || "");

      await checkProfile(currentUser);
    });

    return () => unsubscribe();
  }, [router, checkProfile]);

  // Create student profile and unique six-digit code.
  const createStudentProfile = async (currentUser: User) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = generateSixDigits();

      const codeRef = doc(getFirebaseDb(), "studentCodes", code);
      const studentRef = doc(getFirebaseDb(), "students", currentUser.uid);
      const userRef = doc(getFirebaseDb(), "users", currentUser.uid);

      const created = await runTransaction(getFirebaseDb(), async (transaction) => {
        const existingCode = await transaction.get(codeRef);

        if (existingCode.exists()) {
          return false;
        }

        transaction.set(codeRef, {
          studentUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        transaction.set(
          studentRef,
          {
            uid: currentUser.uid,
            name: name.trim(),
            email: currentUser.email || "",
            village: village.trim(),
            school: school.trim(),
            grade,
            studentCode: code,
            questionsAsked: 0,
            completedLessons: [],
            quizScore: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        transaction.set(
          userRef,
          {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: name.trim(),
            role: "student",
            studentCode: code,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return true;
      });

      if (created) return code;
    }

    throw new Error("Could not generate a unique student code. Try again.");
  };

  // Create teacher profile and unique teacher code.
  const createTeacherProfile = async (currentUser: User) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = `TCH-${generateSixDigits()}`;

      const codeRef = doc(getFirebaseDb(), "teacherCodes", code);
      const teacherRef = doc(getFirebaseDb(), "teachers", currentUser.uid);
      const userRef = doc(getFirebaseDb(), "users", currentUser.uid);

      const created = await runTransaction(getFirebaseDb(), async (transaction) => {
        const existingCode = await transaction.get(codeRef);

        if (existingCode.exists()) {
          return false;
        }

        transaction.set(codeRef, {
          teacherUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        transaction.set(
          teacherRef,
          {
            uid: currentUser.uid,
            name: name.trim(),
            email: currentUser.email || "",
            school: school.trim(),
            village: village.trim(),
            teacherCode: code,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        transaction.set(
          userRef,
          {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: name.trim(),
            role: "teacher",
            teacherCode: code,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return true;
      });

      if (created) return code;
    }

    throw new Error("Could not generate a unique teacher code. Try again.");
  };

  // Link parent account to the student using the student's code.
  const linkParentToStudent = async (currentUser: User) => {
    const normalizedCode = studentCode.trim();

    const codeRef = doc(getFirebaseDb(), "studentCodes", normalizedCode);
    const userRef = doc(getFirebaseDb(), "users", currentUser.uid);

    const linkedStudentUid = await runTransaction(
      getFirebaseDb(),
      async (transaction) => {
        // Read the code document before writing anything.
        const codeSnap = await transaction.get(codeRef);

        if (!codeSnap.exists()) {
          throw new Error("Invalid student code. Please check the code.");
        }

        const codeData = codeSnap.data();
        const studentUid = codeData.studentUid;

        if (!studentUid || typeof studentUid !== "string") {
          throw new Error("This student code is not valid.");
        }

        // Use the actual student UID as the link document ID.
        const parentStudentRef = doc(
          getFirebaseDb(),
          "parents",
          currentUser.uid,
          "students",
          studentUid
        );

        transaction.set(
          parentStudentRef,
          {
            studentUid,
            studentCode: normalizedCode,
            linkedAt: serverTimestamp(),
          },
          { merge: true }
        );

        transaction.set(
          userRef,
          {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: name.trim(),
            role: "parent",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return studentUid;
      }
    );

    return linkedStudentUid;
  };

  // Handle onboarding form submission.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setError("Please log in again.");
      return;
    }

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (role === "student" && (!village.trim() || !school.trim())) {
      setError("Please enter your village and school name.");
      return;
    }

    if (role === "teacher" && !school.trim()) {
      setError("Please enter your school name.");
      return;
    }

    if (role === "parent" && !/^\d{6}$/.test(studentCode.trim())) {
      setError("Please enter a valid 6-digit student code.");
      return;
    }

    setSubmitting(true);

    try {
      if (role === "student") {
        const code = await createStudentProfile(user);

        setGeneratedCode(code);
        setGeneratedRole("student");
        setSuccess("Student profile created successfully.");
      } else if (role === "teacher") {
        const code = await createTeacherProfile(user);

        setGeneratedCode(code);
        setGeneratedRole("teacher");
        setSuccess("Teacher profile created successfully.");
      } else {
        await linkParentToStudent(user);

        setGeneratedCode("");
        setGeneratedRole("parent");
        setSuccess("Parent account linked successfully.");
      }
    } catch (err: any) {
      const details = describeError(err);

      console.error(
        "========== VIDYA AI ONBOARDING SUBMISSION ERROR =========="
      );
      console.error("Error name:", details.name);
      console.error("Error code:", details.code);
      console.error("Error message:", details.message);
      console.error("Error stack:", details.stack);
      console.error("Original error object:", err);
      console.error(
        "========== END ONBOARDING SUBMISSION ERROR =========="
      );

      setError(getFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const retryProfileCheck = async () => {
    if (!user) {
      router.replace("/login");
      return;
    }

    await checkProfile(user);
  };

  const continueToDashboard = () => {
    if (generatedRole) {
      router.replace(getDashboardPath(generatedRole));
    }
  };

  const handleLogout = async () => {
    try {
      await getFirebaseAuth().signOut();
      router.replace("/login");
    } catch (err: any) {
      console.error("VIDYA AI LOGOUT ERROR:", err);
      setError(getFriendlyError(err));
    }
  };

  // Loading screen.
  if (loading || profileStatus === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 px-5 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400" />
          <h1 className="text-xl font-bold">Vidya AI</h1>
          <p className="mt-2 text-sm text-slate-300">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  // Error screen.
  if (profileStatus === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 px-5 py-10 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="text-2xl font-bold">Connection problem</h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            We could not check your Vidya AI profile. Check your internet
            connection and Firebase configuration, then retry.
          </p>

          {error && (
            <div className="mt-5 break-words rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={retryProfileCheck}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Retry
          </button>

          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-3 w-full rounded-xl border border-white/15 px-5 py-3 font-medium text-white hover:bg-white/10"
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  // Success screen.
  if (generatedRole) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 px-5 py-10 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl">
            ✓
          </div>

          <h1 className="text-2xl font-bold">
            {generatedRole === "student"
              ? "Student Account Created"
              : generatedRole === "teacher"
                ? "Teacher Account Created"
                : "Parent Account Linked"}
          </h1>

          <p className="mt-3 text-sm text-slate-300">{success}</p>

          {generatedCode && (
            <div className="mt-7 rounded-xl border border-blue-400/20 bg-blue-500/10 p-5">
              <p className="text-sm text-blue-200">
                Your {generatedRole} code
              </p>

              <p className="mt-2 text-3xl font-bold tracking-widest">
                {generatedCode}
              </p>

              <p className="mt-3 text-xs text-slate-300">
                Save this code safely for future reference.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(generatedCode).catch((err) => {
                      console.error("COPY CODE ERROR:", err);
                    });
                  }
                }}
                className="mt-4 rounded-lg border border-blue-300/30 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/20"
              >
                Copy Code
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={continueToDashboard}
            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Continue to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Main onboarding form.
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-blue-400">
              VIDYA AI
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Welcome to Vidya AI
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Complete your profile to continue.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Logout
          </button>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl sm:p-8">
          <h2 className="text-xl font-semibold">Choose your account type</h2>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {(["student", "parent", "teacher"] as Role[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setRole(item);
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-xl border px-3 py-4 text-center text-sm font-semibold capitalize transition ${
                  role === item
                    ? "border-blue-400 bg-blue-500/20 text-blue-200"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="mb-1 block text-2xl">
                  {item === "student"
                    ? "🎓"
                    : item === "parent"
                      ? "👨‍👩‍👧"
                      : "👩‍🏫"}
                </span>
                {item}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              />
            </div>

            {role === "student" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Village / Town
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(event) => setVillage(event.target.value)}
                    placeholder="Enter your village or town"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={school}
                    onChange={(event) => setSchool(event.target.value)}
                    placeholder="Enter your school name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Class / Grade
                  </label>
                  <select
                    value={grade}
                    onChange={(event) => setGrade(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-400"
                  >
                    {["6", "7", "8", "9", "10"].map((value) => (
                      <option key={value} value={value}>
                        Class {value}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {role === "teacher" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={school}
                    onChange={(event) => setSchool(event.target.value)}
                    placeholder="Enter your school name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Village / Town
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(event) => setVillage(event.target.value)}
                    placeholder="Enter your village or town"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
                  />
                </div>
              </>
            )}

            {role === "parent" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Student Code
                </label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(event) =>
                    setStudentCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="Enter your child's 6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 tracking-widest text-white outline-none placeholder:tracking-normal placeholder:text-slate-500 focus:border-blue-400"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Ask your child for the student code shown in their account.
                </p>
              </div>
            )}

            {error && (
              <div className="break-words rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Please wait..."
                : role === "parent"
                  ? "Link Student Account"
                  : "Create My Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            By continuing, you agree to use Vidya AI for educational purposes.
          </p>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          Vidya AI · The Last-Mile Tutor
        </p>
      </div>
    </main>
  );
}
