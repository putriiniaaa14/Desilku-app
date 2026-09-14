import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, FileCheck2, FileText,
  Home, LogOut, ShieldCheck, Upload, UserRound, WalletCards, Car, Zap,
  GraduationCap, HeartPulse, Gift, ShoppingCart, Settings, Clock3, LockKeyhole,
  ChevronRight, AlertCircle, Menu, X, Eye, EyeOff
} from "lucide-react";
import {
  getCurrentProfile, getMySubmissions, requestPasswordReset,
  saveDataUpdateSubmission, signInWithUsername, signOutUser, signUpUser,
  updatePasswordAfterRecovery, getAdminSubmissions, updateSubmissionStatus,
  getAdminSignedUrl,
} from "./lib/api";

const COLORS = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  yellow: "bg-amber-50 text-amber-700 border-amber-100",
};

const STEPS = [
  { title: "Data Diri & Kependudukan", short: "Data Diri", icon: UserRound, color: "blue", fields: [
    ["jenisPengajuan", "Jenis Pengajuan", "select", true, ["Pemutakhiran Data Sosial Ekonomi", "Pengajuan Penurunan Desil"]],
    ["desilSebelumnya", "Desil saat ini menurut data resmi", "select", false, ["", "Desil 1", "Desil 2", "Desil 3", "Desil 4", "Desil 5", "Desil 6", "Desil 7", "Desil 8", "Desil 9", "Desil 10"]],
    ["namaLengkap", "Nama Lengkap", "text", true],
    ["statusDalamKeluarga", "Sebagai Apa?", "select", true, ["Kepala Keluarga", "Suami/Istri", "Anak", "Anggota Keluarga Lainnya"]],
    ["namaKK", "Nama Kepala Keluarga", "text", true],
    ["nik", "NIK", "text", true], ["noKK", "Nomor KK", "text", true],
    ["jumlahAnggota", "Jumlah Anggota Keluarga", "number", true], ["alamat", "Alamat Lengkap", "textarea", true],
  ], files: [
    { key: "kkFile", label: "Kartu Keluarga (KK)", required: true, accept: ".jpg,.jpeg,.png,.pdf" },
    { key: "buktiDesilSebelumnyaFile", label: "Screenshot bukti desil dari kanal resmi DTSEN/Cek Bansos", required: true, accept: ".jpg,.jpeg,.png,.pdf", showWhen: d => d.jenisPengajuan === "Pengajuan Penurunan Desil" }
  ] },
  { title: "Pekerjaan & Pendapatan", short: "Pekerjaan", icon: WalletCards, color: "green", fields: [
    ["statusKerja", "Status Pekerjaan Kepala Keluarga", "select", true, ["Bekerja tetap", "Bekerja tidak tetap", "Usaha sendiri", "Petani/Nelayan", "Buruh", "Tidak bekerja", "Lainnya"]],
    ["pendapatan", "Perkiraan Pendapatan Rumah Tangga per Bulan", "number", true],
    ["punyaUsaha", "Memiliki Usaha", "select", true, ["Tidak", "Ya"]], ["npwp", "Memiliki NPWP", "select", true, ["Tidak", "Ya"]],
  ], files: [{ key: "salaryFile", label: "Bukti penghasilan/gaji (jika ada)", required: false, accept: ".jpg,.jpeg,.png,.pdf" }] },
  { title: "Aset & Kendaraan", short: "Aset", icon: Car, color: "yellow", fields: [
    ["statusRumah", "Status Tempat Tinggal", "select", true, ["Milik sendiri", "Kontrak/sewa", "Menumpang keluarga", "Rumah dinas", "Lainnya"]],
    ["kepemilikanTanah", "Kepemilikan Tanah", "select", true, ["Milik sendiri", "Tidak memiliki", "Milik keluarga", "Lainnya"]],
    ["jumlahMotor", "Jumlah Sepeda Motor", "number", true], ["jumlahMobil", "Jumlah Mobil", "number", true],
    ["ternak", "Memiliki Ternak", "select", true, ["Tidak", "Ya"]],
  ], files: [{ key: "stnkBpkbFile", label: "STNK/BPKB kendaraan (jika ada kendaraan)", required: false, accept: ".jpg,.jpeg,.png,.pdf", conditional: true }] },
  { title: "Kondisi Tempat Tinggal", short: "Rumah", icon: Home, color: "green", fields: [
    ["lantai", "Jenis Lantai", "select", true, ["Keramik/granit", "Semen", "Kayu", "Bambu", "Tanah", "Lainnya"]],
    ["dinding", "Jenis Dinding", "select", true, ["Tembok", "Kayu", "Bambu", "Seng", "Campuran", "Lainnya"]],
    ["atap", "Jenis Atap", "select", true, ["Genteng", "Seng", "Asbes", "Beton", "Jerami/daun", "Lainnya"]],
    ["airMinum", "Sumber Air Minum", "select", true, ["Air kemasan/isi ulang", "PDAM", "Sumur", "Mata air", "Sungai", "Lainnya"]],
    ["sanitasi", "Kondisi Sanitasi/Jamban", "select", true, ["Jamban sendiri layak", "Jamban bersama", "Jamban tidak layak", "Tidak memiliki jamban"]],
    ["bahanBakar", "Bahan Bakar Memasak", "select", true, ["LPG", "Listrik", "Kayu bakar", "Minyak tanah", "Lainnya"]],
  ], files: [
    { key: "houseFrontFile", label: "Foto tampak depan rumah", required: true, accept: ".jpg,.jpeg,.png" },
    { key: "livingRoomFile", label: "Foto ruang keluarga/ruang tamu", required: true, accept: ".jpg,.jpeg,.png" },
    { key: "kitchenFile", label: "Foto dapur", required: true, accept: ".jpg,.jpeg,.png" },
  ] },
  { title: "Data Listrik", short: "Listrik", icon: Zap, color: "yellow", fields: [
    ["idPelanggan", "ID Pelanggan / Nomor Meter", "text", true],
    ["jenisMeteran", "Jenis Meteran", "select", true, ["Token/prabayar", "Pascabayar"]],
    ["dayaListrik", "Daya Listrik", "select", true, ["450 VA", "900 VA", "1.300 VA", "2.200 VA", "3.500 VA", "4.400–5.500 VA", "Lebih dari 5.500 VA", "Tidak tahu"]],
  ], files: [{ key: "electricityFile", label: "Bukti listrik/token", required: true, accept: ".jpg,.jpeg,.png,.pdf" }] },
  { title: "Pendidikan", short: "Pendidikan", icon: GraduationCap, color: "blue", fields: [
    ["pendidikanKK", "Pendidikan Terakhir Kepala Keluarga", "select", true, ["Belum sekolah", "Tidak tamat SD", "SD/sederajat", "SMP/sederajat", "SMA/SMK/sederajat", "D1", "D2", "D3", "D4/S1", "S2", "S3/Doktor"]],
    ["anakSekolah", "Jumlah Anak yang Sedang Sekolah", "number", true],
  ] },
  { title: "Kesehatan & Disabilitas", short: "Kesehatan", icon: HeartPulse, color: "green", fields: [
    ["sakitKronis", "Ada Anggota Keluarga dengan Penyakit Kronis", "select", true, ["Tidak", "Ya"]],
    ["disabilitas", "Ada Anggota Keluarga dengan Disabilitas", "select", true, ["Tidak", "Ya"]],
  ] },
  { title: "Riwayat Bantuan Sosial", short: "Bansos", icon: Gift, color: "yellow", fields: [
    ["bansos", "Bantuan Sosial yang Diterima", "select", true, ["Tidak menerima bantuan", "PKH", "Sembako/BPNT", "PBI-JK", "BLT", "KIP/PIP", "PKH dan Sembako/BPNT", "Bantuan lainnya"]],
  ], files: [
    { key: "bansosEvidenceFile", label: "Bukti bantuan sosial (jika ada)", required: false, accept: ".jpg,.jpeg,.png,.pdf" },
    { key: "sktmFile", label: "Surat Keterangan Tidak Mampu (SKTM)", required: true, accept: ".jpg,.jpeg,.png,.pdf" },
  ] },
];

const emptyData = {
  jenisPengajuan: "Pemutakhiran Data Sosial Ekonomi", desilSebelumnya: "",
  namaLengkap: "", statusDalamKeluarga: "Kepala Keluarga", nik: "", noKK: "", namaKK: "", jumlahAnggota: "", alamat: "",
  statusKerja: "Bekerja tetap", pendapatan: "", punyaUsaha: "Tidak", npwp: "Tidak",
  statusRumah: "Milik sendiri", kepemilikanTanah: "Milik sendiri", jumlahMotor: "0", jumlahMobil: "0", ternak: "Tidak",
  lantai: "Keramik/granit", dinding: "Tembok", atap: "Genteng", airMinum: "Air kemasan/isi ulang", sanitasi: "Jamban sendiri layak", bahanBakar: "LPG",
  idPelanggan: "", jenisMeteran: "Token/prabayar", dayaListrik: "900 VA",
  pendidikanKK: "SMA/SMK/sederajat", anakSekolah: "0", sakitKronis: "Tidak", disabilitas: "Tidak",
  bansos: "Tidak menerima bantuan",
};

const press = "transition-all duration-150 active:scale-[0.97] hover:-translate-y-0.5";

function maskNumber(value) {
  if (!value) return "-";
  const t = String(value);
  if (t.length <= 4) return "****";
  return `${t.slice(0, 2)}${"*".repeat(Math.max(2, t.length - 4))}${t.slice(-2)}`;
}

function calculateIndicativeDesil(d) {
  let points = 0;
  const income = Number(d.pendapatan || 0);
  if (income > 0 && income <= 3000000) points += 3; else if (income <= 5000000) points += 2; else if (income > 8000000) points -= 2;
  if (["Kontrak/sewa", "Menumpang"].includes(d.statusRumah)) points += 2;
  if (Number(d.jumlahMotor) > 1) points += 1;
  if (Number(d.jumlahMobil) > 0) points -= 2;
  if (d.punyaUsaha === "Tidak") points += 1;
  if (d.sakitKronis === "Ya" || d.disabilitas === "Ya") points += 1;
  if (/PKH|Sembako|BPNT|PBI-JK|BLT|KIP|PIP/i.test(d.bansos || "")) points += 2;
  if (d.lantai && /tanah|bambu/i.test(d.lantai)) points += 1;
  if (d.sanitasi && /tidak|buruk/i.test(d.sanitasi)) points += 1;
  return Math.min(10, Math.max(1, 5 + points));
}

function InputField({ field, value, onChange }) {
  const [key, label, type, required, options] = field;
  const common = { value: value ?? "", onChange: e => onChange(key, e.target.value), className: "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" };
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label} {required && <span className="text-rose-500">*</span>}</span>{type === "textarea" ? <textarea {...common} rows={3} /> : type === "select" ? <select {...common}>{options.map(o => <option key={o}>{o}</option>)}</select> : <input {...common} type={type} min={type === "number" ? "0" : undefined} />}</label>;
}

function FileBox({ config, file, onChange, disabled }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Upload size={18} /></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{config.label} {config.required && <span className="text-rose-500">*</span>}</p><p className="mt-1 text-xs text-slate-500">{config.accept.includes("pdf") ? "JPG, PNG, atau PDF" : "JPG atau PNG"}</p></div></div>
    <label className={`${press} mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-4 text-sm hover:border-blue-300 hover:bg-blue-50/50`}><input type="file" className="hidden" accept={config.accept} disabled={disabled} onChange={e => onChange(config.key, e.target.files?.[0] || null)} />{file ? <span className="flex max-w-full items-center gap-2 truncate font-medium text-emerald-700"><CheckCircle2 size={18} /><span className="truncate">{file.name}</span></span> : <span className="flex items-center gap-2 text-slate-500"><Upload size={18} /> Pilih lampiran</span>}</label>
  </div>;
}

function AuthScreen({ mode, setMode, onSuccess }) {
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [newPassword, setNewPassword] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const run = async fn => { setError(""); setMessage(""); setSaving(true); try { await fn(); } catch (e) { setError(e?.message || "Terjadi kesalahan."); } finally { setSaving(false); } };
  const title = mode === "login" ? "Masuk ke Desilku" : mode === "register" ? "Buat Akun Warga" : mode === "forgot" ? "Lupa Password" : "Buat Password Baru";
  return <div className="min-h-screen bg-[#f7faf9] px-4 py-8"><div className="mx-auto max-w-md">
    <div className="mb-7 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-100"><Home size={30} /></div><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Desilku</h1><p className="mt-1 text-sm text-slate-500">Pemutakhiran Data Sosial Ekonomi</p></div>
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_15px_50px_rgba(15,23,42,.08)]"><div className="h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-400"/><div className="p-6 sm:p-8"><h2 className="text-xl font-black text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{mode === "login" ? "Masuk menggunakan username dan password akun warga." : mode === "register" ? "Daftarkan akun untuk mengajukan pemutakhiran data." : mode === "forgot" ? "Masukkan email akun untuk menerima tautan pemulihan." : "Masukkan password baru untuk akunmu."}</p>
      {error && <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{message && <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <form className="mt-6 space-y-4" onSubmit={e => { e.preventDefault(); if (mode === "login") run(async () => { await signInWithUsername({ username, password }); onSuccess(await getCurrentProfile()); }); else if (mode === "register") run(async () => { if (!username.trim() || !email.trim() || password.length < 6) throw new Error("Username, email, dan password minimal 6 karakter wajib diisi."); await signUpUser({ email, username, password }); setMessage("Pendaftaran berhasil. Silakan masuk kembali."); setMode("login"); }); else if (mode === "forgot") run(async () => { await requestPasswordReset(email); setMessage("Tautan pemulihan password telah dikirim jika akun terdaftar."); }); else run(async () => { if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter."); await updatePasswordAfterRecovery(newPassword); setMessage("Password berhasil diperbarui."); setMode("login"); }); }}>
        {mode === "login" || mode === "register" ? <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Username</span><input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={username} onChange={e => setUsername(e.target.value)} /></label> : null}
        {(mode === "register" || mode === "forgot") && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><input type="email" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {mode === "login" || mode === "register" ? <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Password</span><div className="relative"><input type={showPassword ? "text" : "password"} className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label> : null}
        {mode === "reset" && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Password baru</span><input type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>}
        <button disabled={saving} className={`${press} mt-4 w-full rounded-xl bg-slate-900 px-5 py-3.5 font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60`}>{saving ? "Memproses..." : mode === "login" ? "Masuk" : mode === "register" ? "Daftar" : mode === "forgot" ? "Kirim Tautan" : "Simpan Password"}</button>
      </form>
      {mode === "login" ? <div className="mt-3 text-center"><button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => setMode("forgot")}>Lupa password?</button></div> : null}
      <div className="mt-5 text-center text-sm">{mode === "login" ? <><span className="text-slate-500">Belum punya akun? </span><button type="button" className="font-semibold text-emerald-600 hover:underline" onClick={() => setMode("register")}>Buat akun</button></> : <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => setMode("login")}>Kembali ke masuk</button>}</div>
    </div></div>
  </div></div>;
}

function StatusPill({ status }) {
  const s = status || "Menunggu Pemeriksaan"; const map = s.includes("Ditolak") ? "bg-rose-50 text-rose-700" : s.includes("Selesai") ? "bg-emerald-50 text-emerald-700" : s.includes("Perlu") ? "bg-amber-50 text-amber-700" : s.includes("Verifikasi") && !s.includes("Menunggu") ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${map}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}

function ActivityScreen({ submissions, onBack }) {
  const latest = submissions?.[0];
  const status = latest?.status || latest?.data?.status_pengajuan || "Menunggu Pemeriksaan";
  const stages = ["Pengajuan Dikirim", "Menunggu Pemeriksaan", "Sedang Diverifikasi", "Selesai Diverifikasi"];
  const index = status.includes("Selesai") ? 3 : status.includes("Sedang") ? 2 : status.includes("Menunggu") ? 1 : 0;
  return <div className="min-h-screen bg-[#f7faf9]"><Header title="Aktivitas" onBack={onBack} /><main className="mx-auto max-w-3xl px-4 py-7">
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-emerald-600">Perkembangan Pengajuan</p><h1 className="mt-1 text-2xl font-black text-slate-900">Status pengajuanmu</h1></div><StatusPill status={status} /></div>
      {latest ? <><div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Nomor Pengajuan</p><p className="mt-1 font-black text-blue-700">{latest.nomorPengajuan || latest.id?.slice(0, 8) || "-"}</p><p className="mt-1 text-xs text-slate-500">{latest.created_at ? new Date(latest.created_at).toLocaleString("id-ID") : ""}</p></div><div className="mt-7 space-y-5">{stages.map((s, i) => <div key={s} className="flex gap-4"><div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${i <= index ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{i < index ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{i + 1}</span>}{i < stages.length - 1 && <span className={`absolute left-1/2 top-9 h-7 w-0.5 -translate-x-1/2 ${i < index ? "bg-emerald-300" : "bg-slate-200"}`} />}</div><div className="pb-3"><p className={`font-bold ${i <= index ? "text-slate-800" : "text-slate-400"}`}>{s}</p><p className="mt-1 text-xs text-slate-500">{i === index ? "Tahap saat ini" : i < index ? "Sudah dilewati" : "Belum dimulai"}</p></div></div>)}</div></> : <div className="py-14 text-center"><Clock3 className="mx-auto text-slate-300" size={42}/><h2 className="mt-4 font-black text-slate-800">Belum ada pengajuan</h2><p className="mt-1 text-sm text-slate-500">Pengajuan yang sudah dikirim akan muncul di halaman ini.</p></div>}
    </div>
  </main></div>;
}


function AdminScreen({ onBack }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try { setItems(await getAdminSubmissions()); }
    catch (e) { setError(e?.message || "Data pengajuan gagal dimuat."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    setSavingId(id); setNotice(""); setError("");
    try {
      await updateSubmissionStatus(id, status);
      setItems(v => v.map(x => x.id === id ? { ...x, status, status_pengajuan: status, data: { ...(x.data || {}), status_pengajuan: status } } : x));
      setSelected(v => v && v.id === id ? { ...v, status, status_pengajuan: status, data: { ...(v.data || {}), status_pengajuan: status } } : v);
      setNotice("Status pengajuan berhasil diperbarui.");
    } catch (e) { setError(e?.message || "Status gagal diperbarui."); }
    finally { setSavingId(null); }
  }

  async function openFile(path, name = "Dokumen") {
    setPreviewLoading(true); setError("");
    try {
      const url = await getAdminSignedUrl(path);
      if (!url) throw new Error("Dokumen tidak ditemukan atau belum dapat diakses admin.");
      const lower = String(name || path).toLowerCase();
      const type = /\.(jpg|jpeg|png|webp|gif)$/i.test(lower) ? "image" : "pdf";
      setPreview({ url, name, type });
    } catch (e) { setError(e?.message || "Dokumen tidak dapat dibuka. Pastikan akses Storage admin sudah aktif."); }
    finally { setPreviewLoading(false); }
  }

  const getStatus = x => x?.status || x?.status_pengajuan || x?.data?.status_pengajuan || "Menunggu Pemeriksaan";
  const getName = x => x?.data?.namaLengkap || "Warga";
  const getDate = x => x?.created_at ? new Date(x.created_at).toLocaleString("id-ID") : "-";
  const selectedData = selected?.data || {};
  const fileEntries = Object.entries(selectedData).filter(([k,v]) => k.endsWith("_path") && v);
  const labels = {jenisPengajuan:"Jenis Pengajuan",desilSebelumnya:"Desil Sebelumnya",namaLengkap:"Nama Lengkap",statusDalamKeluarga:"Status Dalam Keluarga",namaKK:"Nama Kepala Keluarga",nik:"NIK",noKK:"Nomor KK",jumlahAnggota:"Jumlah Anggota Keluarga",alamat:"Alamat",statusKerja:"Status Pekerjaan",pendapatan:"Pendapatan Rumah Tangga/Bulan",punyaUsaha:"Memiliki Usaha",npwp:"Memiliki NPWP",statusRumah:"Status Tempat Tinggal",kepemilikanTanah:"Kepemilikan Tanah",jumlahMotor:"Jumlah Sepeda Motor",jumlahMobil:"Jumlah Mobil",ternak:"Memiliki Ternak",lantai:"Jenis Lantai",dinding:"Jenis Dinding",atap:"Jenis Atap",airMinum:"Sumber Air Minum",sanitasi:"Sanitasi/Jamban",bahanBakar:"Bahan Bakar Memasak",idPelanggan:"ID Pelanggan/Nomor Meter",jenisMeteran:"Jenis Meteran",dayaListrik:"Daya Listrik",pendidikanKK:"Pendidikan Kepala Keluarga",anakSekolah:"Anak Sedang Sekolah",sakitKronis:"Penyakit Kronis",disabilitas:"Disabilitas",bansos:"Bantuan Sosial",alasanPengajuan:"Alasan Pengajuan"};

  if (selected) return <div className="min-h-screen bg-[#f7faf9]">
    <Header title="Kembali ke Daftar Pengajuan" onBack={()=>{setSelected(null);setNotice("");setError("")}}/>
    <main className="mx-auto max-w-5xl px-4 py-7">
      {error && <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold text-blue-600">Detail Pengajuan</p><h1 className="mt-1 text-2xl font-black text-slate-900">{getName(selected)}</h1><p className="mt-1 text-sm text-slate-500">{selected.nomor_pengajuan || selected.id} · {getDate(selected)}</p></div><StatusPill status={getStatus(selected)}/></div>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Ringkasan</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Jenis Pengajuan",selectedData.jenisPengajuan || selectedData.jenis_pengajuan],["Desil Sebelumnya",selectedData.desilSebelumnya],["Indikasi Desil Aplikasi",selectedData.indikasi_desil_aplikasi || selected.indikasi || "-"],["Status",getStatus(selected)]].map(([label,value])=><div key={label} className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-800 break-words">{value || "-"}</p></div>)}</div></div>
        <div className="mt-6"><h2 className="text-lg font-black text-slate-900">Data Warga Lengkap</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(selectedData).filter(([k,v])=>v!==null&&v!==undefined&&String(v)!==""&&!k.endsWith("_path")&&!k.endsWith("_nama_file")&&k!=="status_pengajuan"&&k!=="indikasi_desil_aplikasi").map(([key,value])=>{const display=key==="pendapatan"?`Rp ${Number(value).toLocaleString("id-ID")}`:String(value); return <div key={key} className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{labels[key]||key}</p><p className="mt-1 text-sm font-bold text-slate-800 break-words">{display}</p></div>})}</div></div>
        <div className="mt-6"><h2 className="text-lg font-black text-slate-900">Lampiran & Bukti</h2><p className="mt-1 text-xs text-slate-500">Klik dokumen untuk membukanya dalam pratinjau.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{fileEntries.length ? fileEntries.map(([key,path])=>{const name=selectedData[key.replace("_path","_nama_file")] || key.replace("_path",""); return <button key={key} onClick={()=>openFile(path,name)} className={`${press} flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left hover:border-blue-200 hover:bg-blue-50`}><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{name}</span><span className="mt-1 block text-xs text-slate-500">Buka gambar/PDF</span></span><FileText size={20} className="shrink-0 text-blue-600"/></button>}) : <p className="text-sm text-slate-500">Tidak ada lampiran.</p>}</div></div>
        <div className="mt-7 rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Tindakan Verifikasi</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button disabled={savingId===selected.id} onClick={()=>setStatus(selected.id,"Sedang Diverifikasi")} className={`${press} rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50`}>Periksa</button><button disabled={savingId===selected.id} onClick={()=>setStatus(selected.id,"Perlu Revisi")} className={`${press} rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50`}>Minta Revisi</button><button disabled={savingId===selected.id} onClick={()=>setStatus(selected.id,"Selesai Diverifikasi")} className={`${press} rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50`}>Verifikasi Selesai</button><button disabled={savingId===selected.id} onClick={()=>setStatus(selected.id,"Pengajuan Ditolak")} className={`${press} rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50`}>Tolak Pengajuan</button></div></div>
      </div>
      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={()=>setPreview(null)}><div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="min-w-0"><p className="font-black text-slate-900 truncate">{preview.name}</p><p className="text-xs text-slate-500">Pratinjau dokumen</p></div><button onClick={()=>setPreview(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div><div className="min-h-[55vh] overflow-auto bg-slate-100 p-3">{previewLoading ? <div className="flex h-[55vh] items-center justify-center text-sm text-slate-500">Membuka dokumen...</div> : preview.type==="image" ? <img src={preview.url} alt={preview.name} className="mx-auto max-h-[75vh] max-w-full rounded-xl object-contain"/> : <iframe title={preview.name} src={preview.url} className="h-[75vh] w-full rounded-xl bg-white"/>}</div></div></div>}
    </main>
  </div>;

  return <div className="min-h-screen bg-[#f7faf9]"><Header title="Admin · Verifikasi" onBack={onBack}/><main className="mx-auto max-w-6xl px-4 py-7"><div className="mb-6 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-blue-600">Dashboard Admin</p><h1 className="mt-1 text-2xl font-black text-slate-900">Verifikasi Pengajuan Warga</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Pilih warga untuk masuk langsung ke halaman pemeriksaan lengkap.</p></div><button onClick={load} className={`${press} rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50`}>↻ Muat ulang</button></div></div>{error&&<div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{notice&&<div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}<section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-black text-slate-900">Daftar Pengajuan</h2><p className="text-xs text-slate-500">{items.length} pengajuan ditemukan</p></div>{loading?<div className="py-12 text-center text-sm text-slate-500">Memuat pengajuan...</div>:items.length===0?<div className="py-12 text-center text-sm text-slate-500">Belum ada pengajuan.</div>:<div className="space-y-3">{items.map(item=><button key={item.id} onClick={()=>{setSelected(item);setNotice("");setError("")}} className={`${press} w-full rounded-2xl border border-slate-100 bg-white p-4 text-left hover:border-blue-200 hover:bg-blue-50/40`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-slate-900 truncate">{getName(item)}</p><p className="mt-1 text-xs text-slate-500">{item.nomor_pengajuan || item.id?.slice(0,8)} · {getDate(item)}</p></div><StatusPill status={getStatus(item)}/></div><p className="mt-3 text-xs font-bold text-blue-600">Klik untuk masuk ke halaman pemeriksaan →</p></button>)}</div>}</section></main></div>;
}

function Header({ title, onBack, onMenu }) { return <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"><button onClick={onBack} className={`${press} flex items-center gap-2 text-sm font-bold text-slate-600`}>{onMenu ? <Menu size={19}/> : <ArrowLeft size={19}/>} {title}</button><div className="h-2 w-24 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-400"/></div></header>; }

function SettingsScreen({ user, onBack, onLogout }) {
  const [newPass, setNewPass] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function changePassword(e) { e.preventDefault(); setError(""); setMessage(""); if (newPass.length < 6) return setError("Password baru minimal 6 karakter."); setSaving(true); try { await updatePasswordAfterRecovery(newPass); setMessage("Password berhasil diubah."); setNewPass(""); } catch (err) { setError(err?.message || "Password gagal diubah."); } finally { setSaving(false); } }
  return <div className="min-h-screen bg-[#f7faf9]"><Header title="Pengaturan Akun" onBack={onBack}/><main className="mx-auto max-w-2xl px-4 py-7 space-y-4">
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><UserRound/></div><div><p className="font-black text-slate-900">{user?.username || "Akun Warga"}</p><p className="text-sm text-slate-500">{user?.email || ""}</p></div></div></div>
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><LockKeyhole size={19}/></div><div><h2 className="font-black text-slate-900">Ganti Password</h2><p className="text-xs text-slate-500">Gunakan minimal 6 karakter.</p></div></div><form onSubmit={changePassword} className="mt-5 space-y-3"><input type="password" placeholder="Password baru" value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"/><button disabled={saving} className={`${press} w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60`}>{saving ? "Menyimpan..." : "Simpan Password"}</button></form>{message&&<p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error&&<p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}</div>
    <button onClick={onLogout} className={`${press} flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 py-4 font-bold text-rose-600 shadow-sm hover:bg-rose-50`}><LogOut size={18}/> Keluar dari Akun</button>
  </main></div>;
}

export default function App() {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true); const [authMode, setAuthMode] = useState(window.location.pathname === "/reset-password" ? "reset" : "login"); const [screen, setScreen] = useState("home"); const [mobileMenu, setMobileMenu] = useState(false); const [submissions, setSubmissions] = useState([]); const [formData, setFormData] = useState(emptyData); const [files, setFiles] = useState({}); const [step, setStep] = useState(0); const [errors, setErrors] = useState({}); const [notice, setNotice] = useState(""); const [saving, setSaving] = useState(false); const [indicative, setIndicative] = useState(null); const [receipt, setReceipt] = useState(null);
  useEffect(() => { (async()=>{ try { const p = await getCurrentProfile(); setUser(p); if (p) setSubmissions(await getMySubmissions().catch(()=>[])); } finally { setLoading(false); } })(); }, []);
  const current = STEPS[step]; const progress = ((step + 1) / STEPS.length) * 100;
  const updateField = (key, value) => setFormData(d => ({...d, [key]: value})); const updateFile = (key, file) => setFiles(f => ({...f, [key]: file}));
  const configs = useMemo(()=> (current.files || []).filter(c => {
    if (c.showWhen && !c.showWhen(formData)) return false;
    if (c.conditional && !(Number(formData.jumlahMotor)>0 || Number(formData.jumlahMobil)>0)) return false;
    return true;
  }), [current, formData]);
  function validateStep() {
    const e={};
    current.fields.forEach(([k,l,,required])=>{if(required&&!String(formData[k]??"").trim())e[k]=`${l} wajib diisi.`});
    if (formData.jenisPengajuan === "Pengajuan Penurunan Desil" && !String(formData.desilSebelumnya||"").trim()) e.desilSebelumnya = "Desil sebelumnya wajib dipilih untuk pengajuan penurunan desil.";
    configs.forEach(c=>{if(c.required&&!files[c.key])e[c.key]="Lampiran ini wajib diunggah."});
    setErrors(e); return !Object.keys(e).length;
  }
  async function submit() { if(!validateStep()) return; setSaving(true); setNotice(""); try { const desil=calculateIndicativeDesil(formData); const result=await saveDataUpdateSubmission(user?.id,{formData,files,indikasi:desil}); setIndicative(desil); setReceipt(result); setSubmissions([{...result,data:{status_pengajuan:"Menunggu Verifikasi"},created_at:new Date().toISOString()},...submissions]); setScreen("result"); window.scrollTo({top:0,behavior:"smooth"}); } catch(e) { setNotice(e?.message||"Pengajuan gagal dikirim."); } finally { setSaving(false); } }
  async function logout(){ await signOutUser(); setUser(null); setScreen("home"); }
  if(loading)return <div className="min-h-screen flex items-center justify-center bg-[#f7faf9] text-slate-500">Memuat akun...</div>; if(!user)return <AuthScreen mode={authMode} setMode={setAuthMode} onSuccess={p=>{setUser(p);setScreen("home");}}/>;
  if(screen==="admin") return user?.is_admin ? <AdminScreen onBack={()=>setScreen("home")}/> : <div className="min-h-screen flex items-center justify-center bg-[#f7faf9]"><div className="rounded-2xl bg-white p-6 shadow-sm"><p className="font-bold text-slate-800">Akses admin tidak tersedia.</p><button className="mt-4 font-semibold text-blue-600" onClick={()=>setScreen("home")}>Kembali</button></div></div>;
  if(screen==="activity") return <ActivityScreen submissions={submissions} onBack={()=>setScreen("home")}/>;
  if(screen==="settings") return <SettingsScreen user={user} onBack={()=>setScreen("home")} onLogout={logout}/>;
  if(screen==="result") return <div className="min-h-screen bg-[#f7faf9] px-4 py-8"><div className="mx-auto max-w-2xl"><div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"><div className="h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-400"/><div className="p-6 sm:p-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><FileCheck2 size={34}/></div><h1 className="mt-5 text-center text-2xl font-black text-slate-900">Pengajuan Berhasil Dikirim</h1><p className="mt-2 text-center text-sm text-slate-500">Data dan lampiranmu sudah tersimpan untuk proses pemeriksaan.</p><div className="mt-6 rounded-3xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 text-center"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Indikasi Desil dari Aplikasi</p><p className="mt-2 text-6xl font-black text-blue-700">{indicative||"-"}</p><p className="mt-2 font-semibold text-slate-700">Desil {indicative}</p><div className="mx-auto mt-4 max-w-md overflow-hidden rounded-full bg-slate-200"><div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-blue-500" style={{width:`${Math.max(10,100-((indicative||10)-1)*10)}%`}}/></div></div><div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2"><div><p className="text-slate-500">Nomor Pengajuan</p><p className="font-bold text-blue-700">{receipt?.nomorPengajuan||"-"}</p></div><div><p className="text-slate-500">Tanggal</p><p className="font-semibold text-slate-800">{receipt?.tanggal||"-"}</p></div><div><p className="text-slate-500">NIK</p><p className="font-semibold text-slate-800">{maskNumber(formData.nik)}</p></div><div><p className="text-slate-500">Status</p><StatusPill status="Menunggu Verifikasi"/></div></div><div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Catatan:</strong> indikasi desil ini adalah hasil pengolahan sederhana pada aplikasi, bukan penetapan desil resmi pemerintah.</div><button onClick={()=>{setScreen("home");setFormData(emptyData);setFiles({});setStep(0);setReceipt(null);}} className={`${press} mt-6 w-full rounded-xl bg-slate-900 px-5 py-3.5 font-bold text-white hover:bg-slate-800`}>Kembali ke Beranda</button></div></div></div></div>;
  if(screen==="form") return <div className="min-h-screen bg-[#f7faf9]"><header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur"><div className="mx-auto max-w-4xl px-4 py-3"><div className="flex items-center justify-between"><button onClick={()=>setScreen("home")} className={`${press} flex items-center gap-2 text-sm font-bold text-slate-600`}><ArrowLeft size={18}/> Kembali</button><div className="text-right"><p className="text-xs text-slate-500">Langkah</p><p className="font-black text-slate-800">{step+1} / {STEPS.length}</p></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-400 transition-all" style={{width:`${progress}%`}}/></div></div></header><main className="mx-auto max-w-4xl px-4 py-7"><div className="flex items-center gap-3"><div className={`rounded-2xl border p-3 ${COLORS[current.color]}`}><current.icon size={25}/></div><div><p className="text-sm font-bold text-emerald-600">Pemutakhiran Data Sosial Ekonomi</p><h1 className="text-2xl font-black text-slate-900">{current.title}</h1></div></div><p className="mt-3 text-sm leading-6 text-slate-500">Isi sesuai kondisi sebenarnya. Lampiran untuk bagian ini tersedia langsung di bawah data.</p><div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div className="grid gap-4">{current.fields.map(f=><div key={f[0]}><InputField field={f} value={formData[f[0]]} onChange={updateField}/>{errors[f[0]]&&<p className="mt-1 text-xs font-medium text-rose-600">{errors[f[0]]}</p>}</div>)}</div>{configs.length>0&&<div className="mt-6 border-t border-slate-100 pt-6"><h2 className="font-black text-slate-900">Lampiran bagian ini</h2><p className="mt-1 text-xs text-slate-500">Upload sekarang supaya dokumen sesuai dengan data yang sedang diisi.</p><div className="mt-4 grid gap-4">{configs.map(c=><div key={c.key}><FileBox config={c} file={files[c.key]} onChange={updateFile} disabled={saving}/>{errors[c.key]&&<p className="mt-1 text-xs font-medium text-rose-600">{errors[c.key]}</p>}</div>)}</div></div>}</div>{step===STEPS.length-1&&<div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Hampir selesai.</strong> Setelah ini kamu akan melihat indikasi desil dari aplikasi sebelum pengajuan dikirim.</div>}{notice&&<div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{notice}</div>}<div className="mt-6 flex justify-between gap-3"><button onClick={()=>setStep(v=>Math.max(0,v-1))} disabled={step===0||saving} className={`${press} rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 disabled:opacity-40`}><span className="flex items-center gap-2"><ArrowLeft size={18}/> Sebelumnya</span></button>{step<STEPS.length-1?<button onClick={()=>{if(validateStep())setStep(v=>v+1)}} disabled={saving} className={`${press} rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700`}><span className="flex items-center gap-2">Berikutnya <ArrowRight size={18}/></span></button>:<button onClick={submit} disabled={saving} className={`${press} rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60`}>{saving?"Mengirim...":"Lihat Indikasi & Kirim"}</button>}</div></main></div>;
  return <div className="min-h-screen bg-[#f7faf9]"><header className="border-b border-slate-100 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-sm"><Home size={22}/></div><div><p className="font-black text-slate-900">Desilku</p><p className="text-xs text-slate-500">Pemutakhiran Data Sosial Ekonomi</p></div></div><button onClick={()=>setMobileMenu(v=>!v)} className={`${press} rounded-xl p-2 text-slate-600 hover:bg-slate-50`}><Menu size={22}/></button></div></header><main className="mx-auto max-w-5xl px-4 py-7 sm:py-9">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#eff6ff] via-white to-[#ecfdf5] p-6 shadow-sm ring-1 ring-slate-100 sm:p-9"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-200/25"/><div className="relative"><p className="text-sm font-bold text-emerald-600">Halo{user?.username?`, ${user.username}`:""} 👋</p><h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">Cek kondisi sosial ekonomi dengan mudah.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Isi data keluarga, unggah bukti di bagian yang sesuai, lalu lihat indikasi desil dari aplikasi.</p><button onClick={()=>{setScreen("form");setStep(0);setNotice("")}} className={`${press} mt-6 rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-sm hover:bg-blue-700`}>Mulai Cek Desil <ArrowRight className="ml-1 inline" size={18}/></button></div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><button onClick={()=>setScreen("form")} className={`${press} group rounded-2xl border border-blue-100 bg-white p-5 text-left shadow-sm hover:border-blue-200 hover:shadow-md`}><div className="flex items-center justify-between"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><ClipboardList size={21}/></div><ChevronRight size={19} className="text-slate-300 group-hover:text-blue-500"/></div><h2 className="mt-4 font-black text-slate-900">Cek Desil</h2><p className="mt-1 text-sm leading-6 text-slate-500">Isi data dan lihat indikasi desil.</p></button><button onClick={()=>setScreen("activity")} className={`${press} group rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-sm hover:border-emerald-200 hover:shadow-md`}><div className="flex items-center justify-between"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Clock3 size={21}/></div><ChevronRight size={19} className="text-slate-300 group-hover:text-emerald-500"/></div><h2 className="mt-4 font-black text-slate-900">Aktivitas</h2><p className="mt-1 text-sm leading-6 text-slate-500">Lihat pengajuan dan tahap verifikasinya.</p></button><button onClick={()=>setScreen("settings")} className={`${press} group rounded-2xl border border-amber-100 bg-white p-5 text-left shadow-sm hover:border-amber-200 hover:shadow-md`}><div className="flex items-center justify-between"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Settings size={21}/></div><ChevronRight size={19} className="text-slate-300 group-hover:text-amber-500"/></div><h2 className="mt-4 font-black text-slate-900">Pengaturan Akun</h2><p className="mt-1 text-sm leading-6 text-slate-500">Ganti password atau keluar akun.</p></button>{user?.is_admin&&<button onClick={()=>setScreen("admin")} className={`${press} group rounded-2xl border border-blue-100 bg-white p-5 text-left shadow-sm hover:border-blue-200 hover:shadow-md`}><div className="flex items-center justify-between"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><ShieldCheck size={21}/></div><ChevronRight size={19} className="text-slate-300 group-hover:text-blue-500"/></div><h2 className="mt-4 font-black text-slate-900">Dashboard Admin</h2><p className="mt-1 text-sm leading-6 text-slate-500">Periksa dan verifikasi pengajuan warga.</p></button>}</div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-blue-600" size={22}/><div><h2 className="font-black text-slate-900">Data tetap diperiksa</h2><p className="mt-1 text-sm leading-6 text-slate-600">Indikasi dari aplikasi bukan penetapan desil resmi pemerintah.</p></div></div></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"><div className="flex gap-3"><FileText className="shrink-0 text-emerald-600" size={22}/><div><h2 className="font-black text-slate-900">Lampiran lebih praktis</h2><p className="mt-1 text-sm leading-6 text-slate-600">Dokumen diunggah langsung saat mengisi bagian data terkait.</p></div></div></div></div>
    {mobileMenu&&<div className="fixed inset-0 z-40 bg-slate-900/20" onClick={()=>setMobileMenu(false)}><div className="absolute right-4 top-20 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl" onClick={e=>e.stopPropagation()}><button onClick={()=>{setScreen("form");setMobileMenu(false)}} className={`${press} flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold hover:bg-blue-50`}><ClipboardList size={18}/> Cek Desil</button><button onClick={()=>{setScreen("activity");setMobileMenu(false)}} className={`${press} flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold hover:bg-emerald-50`}><Clock3 size={18}/> Aktivitas</button><button onClick={()=>{setScreen("settings");setMobileMenu(false)}} className={`${press} flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold hover:bg-amber-50`}><Settings size={18}/> Pengaturan Akun</button>{user?.is_admin&&<button onClick={()=>{setScreen("admin");setMobileMenu(false)}} className={`${press} flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold hover:bg-blue-50`}><ShieldCheck size={18}/> Dashboard Admin</button>}</div></div>}
  </main></div>;
}
