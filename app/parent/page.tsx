
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

type Student = {
  uid: string;
  name: string;
  village?: string;
  school?: string;
  grade?: string;
  studentCode?: string;
  questionsAsked?: number;
  completedLessons?: string[];
  quizScore?: number;
};

export default function ParentDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentCode, setStudentCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState("");
  const [parentUid, setParentUid] = useState("");

  useEffect(() => {
    let unsubscribeStudents: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await getDoc(doc(db, "users", user.uid));

        if (!profile.exists() || profile.data().role !== "parent") {
          router.replace("/onboarding");
          return;
        }

        setParentUid(user.uid);

        unsubscribeStudents?.();

        unsubscribeStudents = onSnapshot(
          collection(db, "parents", user.uid, "students"),
          async (links) => {
            try {
              const records = await Promise.all(
                links.docs.map(async (link) => {
                  const snap = await getDoc(
                    doc(db, "students", link.id)
                  );

                  if (!snap.exists()) return null;

                  return {
                    uid: snap.id,
                    ...snap.data(),
                  } as Student;
                })
              );

              setStudents(
                records.filter(
                  (item): item is Student => item !== null
                )
              );

              setLoading(false);
            } catch (error) {
              console.error(error);
              setMessage("Unable to load student progress.");
              setLoading(false);
            }
          },
          (error) => {
            console.error(error);
            setMessage("Unable to access linked students.");
            setLoading(false);
          }
        );
      } catch (error) {
        console.error(error);
        setMessage("Unable to verify your account.");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStudents?.();
    };
  }, [router]);

  async function linkStudent() {
    if (!parentUid || !/^\d{6}$/.test(studentCode)) {
      setMessage("Please enter a valid six-digit Student ID.");
      return;
    }

    setLinking(true);
    setMessage("");

    try {
      const codeRef = doc(db, "studentCodes", studentCode);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        throw new Error("Student ID not found. Please check it.");
      }

      const studentUid = codeSnap.data().studentUid as string;

      if (!studentUid) {
        throw new Error("This Student ID is not linked to a profile.");
      }

      const studentSnap = await getDoc(
        doc(db, "students", studentUid)
      );

      if (!studentSnap.exists()) {
        throw new Error("Student profile not found.");
      }

      await setDoc(
        doc(db, "parents", parentUid, "students", studentUid),
        {
          studentUid,
          studentCode,
          linkedAt: serverTimestamp(),
        }
      );

      setStudentCode("");
      setMessage("Student linked successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to link student."
      );
    } finally {
      setLinking(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-5xl">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-cyan-300">
              VIDYA AI
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Parent Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Monitor your child's learning progress.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm"
          >
            Logout
          </button>
        </header>

        <section className="mt-7 rounded-2xl bg-white p-5 text-slate-900">
          <h2 className="text-lg font-bold">
            Link your child
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter the six-digit Student ID shared by your child.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3"
              placeholder="Enter Student ID"
              inputMode="numeric"
              maxLength={6}
              value={studentCode}
              onChange={(e) =>
                setStudentCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
            />

            <button
              disabled={linking || studentCode.length !== 6}
              onClick={linkStudent}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {linking ? "Linking..." : "Link Student"}
            </button>
          </div>

          {message && (
            <p className="mt-3 text-sm text-indigo-700">
              {message}
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Linked Students
          </h2>

          {loading ? (
            <p className="mt-5 text-slate-400">
              Loading student progress...
            </p>
          ) : students.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="font-semibold">
                No students linked yet.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Enter your child's Student ID above.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {students.map((student) => (
                <article
                  key={student.uid}
                  className="rounded-2xl bg-white p-5 text-slate-900 shadow-lg"
                >
                  <h3 className="text-xl font-bold">
                    {student.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {student.village || "Location not added"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {student.school || "School not added"}
                  </p>

                  <div className="mt-3 inline-block rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
                    {student.grade || "Class not added"} · ID{" "}
                    {student.studentCode || "—"}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-2xl font-black">
                        {student.questionsAsked || 0}
                      </p>
                      <p className="text-xs text-slate-500">
                        Questions
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-2xl font-black">
                        {(student.completedLessons || []).length}
                      </p>
                      <p className="text-xs text-slate-500">
                        Lessons
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-2xl font-black">
                        {student.quizScore || 0}
                      </p>
                      <p className="text-xs text-slate-500">
                        Quiz Score
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Progress is updated when student activity is
                    saved to Firebase.
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
