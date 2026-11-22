
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured,
  getMissingFirebaseConfigKeys,
} from "@/lib/firebase";

import {
  collection,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

type Material = {
  id: string;
  title: string;
  type: string;
  url: string;
  fileName: string;
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacher, setTeacher] = useState<any>(null);
  const [items, setItems] = useState<Material[]>([]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Study Material");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.error(
        "Firebase is not configured. Missing env vars: " +
          getMissingFirebaseConfigKeys().join(", ")
      );
      return undefined;
    }

    let unsubscribeMaterials: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await getDoc(doc(getFirebaseDb(), "users", user.uid));

        if (!profile.exists() || profile.data().role !== "teacher") {
          router.replace("/onboarding");
          return;
        }

        setTeacher(profile.data());

        unsubscribeMaterials?.();

        const materialsQuery = query(
          collection(getFirebaseDb(), "teachers", user.uid, "materials"),
          orderBy("createdAt", "desc")
        );

        unsubscribeMaterials = onSnapshot(
          materialsQuery,
          (snapshot) => {
            setItems(
              snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
              } as Material))
            );

            setLoading(false);
          },
          (error) => {
            console.error(error);
            setMessage("Unable to load your materials.");
            setLoading(false);
          }
        );
      } catch (error) {
        console.error(error);
        setMessage("Unable to verify teacher account.");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMaterials?.();
    };
  }, [router]);

  async function uploadMaterial() {
    const user = getFirebaseAuth().currentUser;

    if (!user || !file || !title.trim()) {
      setMessage("Please enter a title and select a file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setMessage("File size must be 20 MB or less.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const storage = getFirebaseStorage();

      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const path =
        `teacher-materials/${user.uid}/` +
        `${Date.now()}-${safeName}`;

      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);

      await addDoc(
        collection(getFirebaseDb(), "teachers", user.uid, "materials"),
        {
          title: title.trim(),
          type,
          url,
          fileName: file.name,
          storagePath: path,
          createdAt: serverTimestamp(),
        }
      );

      setTitle("");
      setFile(null);

      const fileInput = document.getElementById(
        "material-file"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      setMessage("Material uploaded successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await signOut(getFirebaseAuth());
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-5xl">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-cyan-300">
              VIDYA AI · TEACHER SPACE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Teacher Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Welcome, {teacher?.displayName || "Teacher"}
            </p>

            <p className="mt-1 text-sm text-cyan-300">
              Teacher Code: {teacher?.teacherCode || "—"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm"
          >
            Logout
          </button>
        </header>

        <section className="mt-8 rounded-2xl bg-white p-5 text-slate-900 shadow-xl sm:p-7">
          <div>
            <h2 className="text-xl font-bold">
              Upload Learning Materials
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Upload your own notes, textbooks, PDFs, worksheets
              and test papers.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Material Title
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 p-3"
                placeholder="Example: Class 8 Mathematics Chapter 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Material Category
              </label>

              <select
                className="w-full rounded-xl border border-slate-300 p-3"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {[
                  "Study Material",
                  "Textbook",
                  "PDF Notes",
                  "Test Paper",
                  "Worksheet",
                  "Question Paper",
                  "Reference Book",
                  "Other",
                ].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Select File
              </label>

              <input
                id="material-file"
                className="w-full rounded-xl border border-slate-300 p-3"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
              />

              <p className="mt-2 text-xs text-slate-500">
                Supported: PDF, Word, PowerPoint, TXT and Images.
                Maximum size: 20 MB.
              </p>

              {file && (
                <p className="mt-2 text-sm text-indigo-700">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <button
              disabled={busy || !file || !title.trim()}
              onClick={uploadMaterial}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Uploading..." : "Upload Material"}
            </button>

            {message && (
              <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
                {message}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">
            My Uploaded Materials
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Materials uploaded through your teacher account.
          </p>

          {loading ? (
            <p className="mt-5 text-slate-400">
              Loading materials...
            </p>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="font-semibold">
                No materials uploaded yet.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Upload your first learning material above.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-xs font-semibold text-cyan-300">
                    {item.type}
                  </p>

                  <h3 className="mt-2 text-lg font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-2 break-all text-xs text-slate-400">
                    {item.fileName}
                  </p>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Open Material
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
