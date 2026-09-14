import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  Home,
  LogIn,
  LogOut,
  User,
  Upload,
} from "lucide-react";
import {
  getCurrentProfile,
  requestPasswordReset,
  saveDataUpdateSubmission,
  signInWithUsername,
  signOutUser,
  signUpUser,
  updatePasswordAfterRecovery,
} from "./lib/api";

const STEPS = [
  {
    title: "Data Diri & Kependudukan",
    fields: [
      ["nik", "NIK", "text", true],
      ["noKK", "Nomor KK", "text", true],
      ["namaKK", "Nama Kepala Keluarga", "text", true],
      ["jumlahAnggota", "Jumlah Anggota Keluarga", "number", true],
      ["alamat", "Alamat Lengkap", "textarea", true],
    ],
  },
  {
    title: "Pekerjaan & Pendapatan",
    fields: [
      ["statusKerja", "Status Pekerjaan Kepala Keluarga", "text", true],
      ["pendapatan", "Perkiraan Pendapatan Rumah Tangga per Bulan", "number", true],
      ["punyaUsaha", "Memiliki Usaha", "select", true, ["Tidak", "Ya"]],
      ["npwp", "Memiliki NPWP", "select", true, ["Tidak", "Ya"]],
    ],
  },
  {
    title: "Aset & Kepemilikan",
    fields: [
      ["statusRumah", "Status Tempat Tinggal", "select", true, ["Milik sendiri", "Kontrak/sewa", "Menumpang", "Lainnya"]],
      ["kepemilikanTanah", "Kepemilikan Tanah", "select", true, ["Milik sendiri", "Tidak memiliki", "Lainnya"]],
      ["jumlahMotor", "Jumlah Sepeda Motor", "number", true],
      ["jumlahMobil", "Jumlah Mobil", "number", true],
      ["ternak", "Memiliki Ternak", "select", true, ["Tidak", "Ya"]],
    ],
  },
  {
    title: "Kondisi Tempat Tinggal",
    fields: [
      ["lantai", "Jenis Lantai", "text", true],
      ["dinding", "Jenis Dinding", "text", true],
      ["atap", "Jenis Atap", "text", true],
      ["airMinum", "Sumber Air Minum", "text", true],
      ["sanitasi", "Kondisi Sanitasi/Jamban", "text", true],
      ["bahanBakar", "Bahan Bakar Memasak", "text", true],
    ],
  },
  {
    title: "Data Listrik",
    fields: [
      ["idPelanggan", "ID Pelanggan / Nomor Meter", "text", true],
      ["jenisMeteran", "Jenis Meteran", "select", true, ["Token/prabayar", "Pascabayar"]],
      ["dayaListrik", "Daya Listrik", "text", true],
    ],
  },
  {
    title: "Pendidikan",
    fields: [
      ["pendidikanKK", "Pendidikan Terakhir Kepala Keluarga", "text", true],
      ["anakSekolah", "Jumlah Anak yang Sedang Sekolah", "number", true],
    ],
  },
  {
    title: "Kesehatan & Disabilitas",
    fields: [
      ["sakitKronis", "Ada Anggota Keluarga dengan Penyakit Kronis", "select", true, ["Tidak", "Ya"]],
      ["disabilitas", "Ada Anggota Keluarga dengan Disabilitas", "select", true, ["Tidak", "Ya"]],
    ],
  },
  {
    title: "Riwayat Bantuan Sosial",
    fields: [
      ["bansos", "Bantuan Sosial yang Diterima", "text", true],
      ["pkh", "Menerima PKH", "select", true, ["Tidak", "Ya"]],
      ["pkhTahunMulai", "Tahun Mulai Menerima PKH", "number", false],
    ],
  },
  {
    title: "Pengeluaran Rumah Tangga",
    fields: [
      ["pengeluaranPangan", "Perkiraan Pengeluaran Pangan per Bulan", "number", true],
      ["pengeluaranNonPangan", "Perkiraan Pengeluaran Non-Pangan per Bulan", "number", true],
    ],
  },
];

const FILE_FIELDS = [
  { key: "kkFile", label: "Kartu Keluarga (KK)", required: true, accept: ".jpg,.jpeg,.png,.pdf" },
  { key: "stnkBpkbFile", label: "STNK atau BPKB Kendaraan", required: false, accept: ".jpg,.jpeg,.png,.pdf" },
  { key: "salaryFile", label: "Bukti Penghasilan/Gaji", required: false, accept: ".jpg,.jpeg,.png,.pdf" },
  { key: "electricityFile", label: "Bukti Listrik / Token", required: true, accept: ".jpg,.jpeg,.png,.pdf" },
  { key: "houseFrontFile", label: "Foto Tampak Depan Rumah", required: true, accept: ".jpg,.jpeg,.png" },
  { key: "livingRoomFile", label: "Foto Ruang Keluarga/Ruang Tamu", required: true, accept: ".jpg,.jpeg,.png" },
  { key: "kitchenFile", label: "Foto Dapur", required: true, accept: ".jpg,.jpeg,.png" },
  { key: "bansosEvidenceFile", label: "Bukti Bantuan Sosial Lainnya", required: false, accept: ".jpg,.jpeg,.png,.pdf" },
];

const emptyData = {
  nik: "",
  noKK: "",
  namaKK: "",
  jumlahAnggota: "",
  alamat: "",
  statusKerja: "",
  pendapatan: "",
  punyaUsaha: "Tidak",
  npwp: "Tidak",
  statusRumah: "Milik sendiri",
  kepemilikanTanah: "Milik sendiri",
  jumlahMotor: "0",
  jumlahMobil: "0",
  ternak: "Tidak",
  lantai: "",
  dinding: "",
  atap: "",
  airMinum: "",
  sanitasi: "",
  bahanBakar: "",
  idPelanggan: "",
  jenisMeteran: "Token/prabayar",
  dayaListrik: "",
  pendidikanKK: "",
  anakSekolah: "0",
  sakitKronis: "Tidak",
  disabilitas: "Tidak",
  bansos: "",
  pkh: "Tidak",
  pkhTahunMulai: "",
  pengeluaranPangan: "",
  pengeluaranNonPangan: "",
};

function maskNumber(value) {
  if (!value) return "-";
  const text = String(value);
  if (text.length <= 4) return "****";
  return `${text.slice(0, 2)}${"*".repeat(Math.max(2, text.length - 4))}${text.slice(-2)}`;
}

function InputField({ field, value, onChange }) {
  const [key, label, type, required, options] = field;
  const common = {
    value: value ?? "",
    onChange: (e) => onChange(key, e.target.value),
    className:
      "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
  };

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {type === "textarea" ? (
        <textarea {...common} rows={3} />
      ) : type === "select" ? (
        <select {...common}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <input {...common} type={type} min={type === "number" ? "0" : undefined} />
      )}
    </label>
  );
}

function FileBox({ config, file, onChange, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-800">
        {config.label}{" "}
        {config.required ? <span className="text-red-500">*</span> : <span className="text-slate-400">(opsional)</span>}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {config.accept.includes("pdf") ? "JPG, PNG, atau PDF" : "JPG atau PNG"}
      </p>
      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 hover:border-blue-400 hover:bg-blue-50">
        <input
          type="file"
          className="hidden"
          accept={config.accept}
          disabled={disabled}
          onChange={(e) => onChange(config.key, e.target.files?.[0] || null)}
        />
        {file ? (
          <span className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={18} /> {file.name}
          </span>
        ) : (
          <span className="flex items-center gap-2"><Upload size={18} /> Klik untuk memilih file</span>
        )}
      </label>
    </div>
  );
}

function AuthScreen({ mode, setMode, onSuccess }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submitLogin = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setSaving(true);
    try {
      await signInWithUsername({ username, password });
      const profile = await getCurrentProfile();
      onSuccess(profile);
    } catch (err) {
      setError(err?.message || "Username atau password tidak sesuai.");
    } finally { setSaving(false); }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setSaving(true);
    try {
      if (!username.trim() || !email.trim() || password.length < 6) {
        throw new Error("Username, email, dan password minimal 6 karakter wajib diisi.");
      }
      await signUpUser({ email, username, password });
      setMessage("Pendaftaran berhasil. Silakan cek email jika verifikasi email diaktifkan, lalu masuk.");
      setMode("login");
    } catch (err) {
      setError(err?.message || "Pendaftaran gagal.");
    } finally { setSaving(false); }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setSaving(true);
    try {
      await requestPasswordReset(email);
      setMessage("Tautan pemulihan password telah dikirim ke email jika akun tersebut terdaftar.");
    } catch (err) {
      setError(err?.message || "Permintaan pemulihan gagal.");
    } finally { setSaving(false); }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setSaving(true);
    try {
      if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
      await updatePasswordAfterRecovery(newPassword);
      setMessage("Password berhasil diperbarui. Silakan masuk kembali.");
      setMode("login");
    } catch (err) {
      setError(err?.message || "Password gagal diperbarui.");
    } finally { setSaving(false); }
  };

  const title = mode === "login" ? "Masuk ke Desilku" : mode === "register" ? "Buat Akun Warga" : mode === "forgot" ? "Lupa Password" : "Buat Password Baru";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <Home size={28} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Desilku</h1>
          <p className="mt-1 text-sm text-slate-500">Pemutakhiran Data Sosial Ekonomi</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login" ? "Masuk menggunakan username dan password akun warga." :
             mode === "register" ? "Daftarkan akun untuk mengajukan pemutakhiran data." :
             mode === "forgot" ? "Masukkan email akun untuk menerima tautan pemulihan." :
             "Masukkan password baru untuk akunmu."}
          </p>

          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

          <form className="mt-6 space-y-4" onSubmit={mode === "login" ? submitLogin : mode === "register" ? submitRegister : mode === "forgot" ? submitForgot : submitReset}>
            {mode !== "reset" && mode !== "forgot" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
              </label>
            )}

            {mode === "register" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
              </label>
            )}

            {mode === "forgot" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
              </label>
            )}

            {mode === "login" || mode === "register" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
              </label>
            ) : null}

            {mode === "reset" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password Baru</span>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
              </label>
            )}

            <button disabled={saving} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Memproses..." : mode === "login" ? "Masuk" : mode === "register" ? "Daftar" : mode === "forgot" ? "Kirim Tautan" : "Simpan Password"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            {mode === "login" && (
              <>
                <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} className="text-blue-600 hover:underline">Lupa password?</button>
                <p className="mt-3 text-slate-500">Belum punya akun? <button onClick={() => setMode("register")} className="font-semibold text-blue-600">Daftar</button></p>
              </>
            )}
            {mode !== "login" && (
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} className="font-semibold text-blue-600 hover:underline">
                Kembali ke halaman masuk
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [screen, setScreen] = useState("home");
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(emptyData);
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getCurrentProfile()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoadingProfile(false));

    if (window.location.pathname === "/reset-password") setAuthMode("reset");
  }, []);

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function updateFile(key, file) {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validateStep() {
    const current = STEPS[step];
    const nextErrors = {};
    current.fields.forEach(([key, , , required]) => {
      if (required && !String(formData[key] ?? "").trim()) nextErrors[key] = "Bagian ini wajib diisi.";
    });
    if (step === 7 && formData.pkh === "Ya" && !String(formData.pkhTahunMulai).trim()) {
      nextErrors.pkhTahunMulai = "Tahun mulai PKH wajib diisi jika menerima PKH.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateFiles() {
    const nextErrors = {};
    FILE_FIELDS.forEach((item) => {
      if (item.required && !files[item.key]) nextErrors[item.key] = "Dokumen/foto ini wajib diunggah.";
    });
    if ((Number(formData.jumlahMotor) > 0 || Number(formData.jumlahMobil) > 0) && !files.stnkBpkbFile) {
      nextErrors.stnkBpkbFile = "Karena keluarga memiliki kendaraan, STNK/BPKB perlu diunggah.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitApplication() {
    setNotice("");
    if (!validateFiles()) return;
    setSaving(true);
    try {
      const result = await saveDataUpdateSubmission(user?.id, { formData, files });
      setReceipt(result);
      setScreen("receipt");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setNotice(error?.message || "Pengajuan gagal dikirim. Silakan coba lagi.");
    } finally { setSaving(false); }
  }

  async function logout() {
    try { await signOutUser(); window.location.reload(); }
    catch (error) { console.error(error); }
  }

  if (loadingProfile) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Memuat akun...</div>;
  }

  if (!user) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onSuccess={setUser} />;
  }

  if (screen === "receipt") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"><FileCheck2 size={34} /></div>
            <h1 className="mt-5 text-center text-2xl font-bold text-slate-900">Pengajuan Berhasil Dikirim</h1>
            <p className="mt-2 text-center text-sm text-slate-500">Simpan bukti pengajuan ini. Pengajuan akan diperiksa oleh petugas.</p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nomor Pengajuan</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{receipt?.nomorPengajuan || "-"}</p>
              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="text-slate-500">Nama Kepala Keluarga</p><p className="font-semibold text-slate-800">{formData.namaKK}</p></div>
                <div><p className="text-slate-500">Tanggal</p><p className="font-semibold text-slate-800">{receipt?.tanggal || new Date().toLocaleDateString("id-ID")}</p></div>
                <div><p className="text-slate-500">NIK</p><p className="font-semibold text-slate-800">{maskNumber(formData.nik)}</p></div>
                <div><p className="text-slate-500">Nomor KK</p><p className="font-semibold text-slate-800">{maskNumber(formData.noKK)}</p></div>
                <div className="sm:col-span-2"><p className="text-slate-500">Jenis Pengajuan</p><p className="font-semibold text-slate-800">Pemutakhiran Data Sosial Ekonomi</p></div>
                <div className="sm:col-span-2"><p className="text-slate-500">Status</p><p className="font-semibold text-amber-700">Menunggu Verifikasi</p></div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <strong>Catatan:</strong> Pengajuan ini merupakan penyampaian data dan bukti untuk proses pemutakhiran/verifikasi. Pengiriman pengajuan <strong>tidak otomatis mengubah desil resmi</strong>. Penetapan dan pembaruan data tetap mengikuti proses verifikasi oleh pihak yang berwenang.
            </div>
            <button onClick={() => { setScreen("home"); setFormData(emptyData); setFiles({}); setStep(0); setReceipt(null); }} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Kembali ke Beranda</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "form") {
    const current = STEPS[step];
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <button onClick={() => setScreen("home")} className="flex items-center gap-2 text-sm font-medium text-slate-600"><ArrowLeft size={18} /> Kembali</button>
            <div className="text-right"><p className="text-xs text-slate-500">Langkah</p><p className="font-bold text-slate-800">{step + 1} dari {STEPS.length}</p></div>
          </div>
          <div className="h-1 bg-slate-100"><div className="h-1 bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-7">
          <p className="text-sm font-medium text-blue-600">Pemutakhiran Data Sosial Ekonomi</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{current.title}</h1>
          <p className="mt-2 text-sm text-slate-500">Isi sesuai kondisi sebenarnya. Data dan dokumen digunakan untuk proses pemeriksaan.</p>

          <div className="mt-6 grid gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            {current.fields.map((field) => (
              <div key={field[0]}>
                <InputField field={field} value={formData[field[0]]} onChange={updateField} />
                {errors[field[0]] && <p className="mt-1 text-xs text-red-600">{errors[field[0]]}</p>}
              </div>
            ))}
          </div>

          {step === 7 && formData.pkh === "Ya" && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Tahun mulai menerima PKH digunakan sebagai informasi riwayat bantuan.</p>}

          {step === STEPS.length - 1 && (
            <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Upload size={21} className="text-blue-600" /> Dokumen & Bukti Pendukung</h2>
              <p className="mt-2 text-sm text-slate-500">Unggah dokumen yang diminta. Dokumen sensitif diproses sebagai bagian dari pengajuan.</p>
              <div className="mt-5 grid gap-4">
                {FILE_FIELDS.map((config) => (
                  <div key={config.key}>
                    <FileBox config={config} file={files[config.key]} onChange={updateFile} disabled={saving} />
                    {errors[config.key] && <p className="mt-1 text-xs text-red-600">{errors[config.key]}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {notice && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{notice}</div>}

          <div className="mt-6 flex justify-between gap-3">
            <button onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0 || saving} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 disabled:opacity-40"><span className="flex items-center gap-2"><ArrowLeft size={18} /> Sebelumnya</span></button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => { if (validateStep()) setStep((v) => v + 1); }} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"><span className="flex items-center gap-2">Berikutnya <ArrowRight size={18} /></span></button>
            ) : (
              <button onClick={submitApplication} disabled={saving} className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60">{saving ? "Mengirim..." : "Kirim Pengajuan"}</button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Home size={21} /></div>
            <div><p className="font-bold text-slate-900">Desilku</p><p className="text-xs text-slate-500">Pemutakhiran Data Sosial Ekonomi</p></div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600"><LogOut size={17} /> Keluar</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-medium text-blue-100">Halo{user?.username ? `, ${user.username}` : ""} 👋</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight">Ajukan Pemutakhiran Data Sosial Ekonomi dengan lebih mudah</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">Isi data keluarga, unggah bukti pendukung, lalu pantau proses pemeriksaan pengajuanmu.</p>
          <button onClick={() => { setScreen("form"); setStep(0); setNotice(""); }} className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-blue-700 hover:bg-blue-50">Mulai Pengajuan</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [ClipboardList, "Isi Data", "Lengkapi kondisi sosial ekonomi keluarga."],
            [FileText, "Upload Bukti", "Lampirkan dokumen dan foto pendukung."],
            [FileCheck2, "Tunggu Verifikasi", "Pantau status setelah pengajuan dikirim."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className="text-blue-600" size={24} /><h2 className="mt-3 font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <strong>Penting:</strong> Desil resmi tidak dihitung oleh aplikasi ini. Data yang kamu kirim menjadi bahan pengajuan pemutakhiran dan akan melalui pemeriksaan/verifikasi oleh petugas sesuai kewenangan.
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3"><User className="mt-0.5 text-blue-600" size={21} /><div><h2 className="font-bold text-slate-900">Data akun</h2><p className="mt-1 text-sm text-slate-500">{user?.email || "Akun warga"}</p></div></div>
        </div>
      </main>
    </div>
  );
}

export default App;
