import { useState, useEffect, useRef } from "react";
import {
  Eye, EyeOff, User, Lock, Mail, LogOut, KeyRound, ChevronRight, ChevronLeft,
  CheckCircle2, Home as HomeIcon, ShieldCheck, Zap, Car, GraduationCap,
  HeartPulse, Wallet, Users as UsersIcon, ClipboardList, AlertCircle,
  Settings, ArrowLeft, Sparkles, FileText, Upload
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import {
  isUsernameTaken, signUpUser, signInWithUsername, signOutUser,
  getCurrentProfile, requestPasswordReset, updatePasswordAfterRecovery,
  changePassword, saveDesilSubmission, getAdminSubmissions,
} from "./lib/api";

/* ---------------------------------- Tokens ---------------------------------- */
const C = {
  green: "#0E7C5A",
  greenDark: "#0A5F45",
  greenSoft: "#E4F3EC",
  blue: "#1F6FB2",
  blueDark: "#154F80",
  blueSoft: "#E5F0FA",
  yellow: "#FFC63A",
  yellowDark: "#E8A912",
  yellowSoft: "#FFF6E0",
  cream: "#F7F9F4",
  ink: "#123024",
  inkSoft: "#5B7268",
  line: "#DCE6DF",
  danger: "#C24444",
  dangerSoft: "#FBEAEA",
};
const FONT_HEAD = "'Baloo 2', system-ui, sans-serif";
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif";
const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    * { font-family: ${FONT_BODY}; }
    .font-head { font-family: ${FONT_HEAD}; }
    input:focus, select:focus { outline: none; }
    ::selection { background: ${C.yellow}; }
  `}</style>
);

/* -------------------------------- Utilities --------------------------------- */
function cx(...a) { return a.filter(Boolean).join(" "); }

/* -------------------------------- Small UI bits ------------------------------ */
function PressButton({ children, onClick, style, className = "", type = "button", disabled, full }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={cx("transition-all duration-100 select-none", full && "w-full", className)}
      style={{
        ...style,
        transform: pressed ? "translateY(2px) scale(0.98)" : "translateY(0) scale(1)",
        boxShadow: pressed
          ? "inset 0 2px 4px rgba(0,0,0,0.25)"
          : style?.boxShadow || "0 4px 0 rgba(0,0,0,0.12)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? C.danger : toast.type === "info" ? C.blue : C.green;
  return (
    <div
      className="fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2 max-w-xs"
      style={{ backgroundColor: bg }}
    >
      {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      {toast.message}
    </div>
  );
}

function Logo({ size = 34 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute rounded-full" style={{ width: size * 0.62, height: size * 0.62, background: C.green, top: 0, left: 0 }} />
        <div className="absolute rounded-full" style={{ width: size * 0.5, height: size * 0.5, background: C.yellow, bottom: 0, left: size * 0.3 }} />
        <div className="absolute rounded-full" style={{ width: size * 0.55, height: size * 0.55, background: C.blue, bottom: 0, right: 0 }} />
      </div>
      <span className="font-head font-bold text-lg" style={{ color: C.ink }}>Desilku</span>
    </div>
  );
}

function TextInput({ label, icon: Icon, type = "text", value, onChange, placeholder, hint, error, showToggle, show, onToggle }) {
  return (
    <div>
      {label && <label className="block text-sm font-semibold mb-1.5" style={{ color: C.ink }}>{label}</label>}
      <div className="relative">
        {Icon && <Icon size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }} />}
        <input
          type={showToggle ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border-2 py-2.5 text-sm bg-white"
          style={{
            borderColor: error ? C.danger : C.line,
            paddingLeft: Icon ? "2.5rem" : "1rem",
            paddingRight: showToggle ? "2.5rem" : "1rem",
            color: C.ink,
          }}
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-xs mt-1 font-medium" style={{ color: C.danger }}>{error}</p>
      ) : hint ? (
        <p className="text-xs mt-1" style={{ color: C.inkSoft }}>{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------ App ------------------------------------ */
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [authTab, setAuthTab] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const toastTimer = useRef(null);

  function notify(type, message) {
    setToast({ type, message });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // Sinkron dengan sesi Supabase Auth: jika sudah login (mis. setelah refresh
  // halaman), langsung masuk ke Home. Event PASSWORD_RECOVERY dipicu Supabase
  // ketika pengguna membuka tautan reset sandi dari email -> arahkan ke ResetScreen.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const profile = await getCurrentProfile();
      if (!mounted) return;
      if (profile) {
        setCurrentUser(profile);
        setScreen("home");
      }
      setCheckingSession(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetEmail(session?.user?.email || "");
        setScreen("reset");
      }
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="w-full min-h-[640px] flex items-center justify-center" style={{ background: C.cream }}>
        {FONTS}
        <p className="text-sm font-semibold" style={{ color: C.inkSoft }}>Memuat…</p>
      </div>
    );
  }

  const shellStyle = { background: `linear-gradient(160deg, ${C.cream} 0%, #FFFFFF 55%, ${C.cream} 100%)`, minHeight: 640 };

  return (
    <div className="w-full min-h-[640px] rounded-2xl overflow-hidden" style={shellStyle}>
      {FONTS}
      <Toast toast={toast} />
      {screen === "welcome" && <Welcome onGo={(tab) => { setAuthTab(tab); setScreen("auth"); }} />}
      {screen === "auth" && (
        <AuthScreen
          tab={authTab}
          setTab={setAuthTab}
          busy={busy}
          setBusy={setBusy}
          notify={notify}
          onBack={() => setScreen("welcome")}
          onForgot={() => setScreen("forgot")}
          onLoggedIn={(u) => { setCurrentUser(u); setScreen("home"); notify("success", `Selamat datang, ${u.username}!`); }}
        />
      )}
      {screen === "forgot" && (
        <ForgotScreen
          busy={busy} setBusy={setBusy} notify={notify}
          onBackToLogin={() => { setAuthTab("login"); setScreen("auth"); }}
        />
      )}
      {screen === "reset" && (
        <ResetScreen
          busy={busy} setBusy={setBusy} notify={notify}
          onDone={() => { setAuthTab("login"); setScreen("auth"); notify("success", "Sandi berhasil diperbarui. Silakan masuk."); }}
          onBackToLogin={() => { setAuthTab("login"); setScreen("auth"); }}
        />
      )}
      {screen === "home" && currentUser && (
        <HomeScreen
          user={currentUser}
          onLogout={async () => { await signOutUser(); setCurrentUser(null); setScreen("welcome"); notify("info", "Anda telah keluar."); }}
          onCekDesil={() => setScreen("cekdesil")}
          onChangePassword={() => setScreen("changepass")}
          onAdmin={() => setScreen("admin")}
        />
      )}
      {screen === "changepass" && currentUser && (
        <ChangePasswordScreen
          user={currentUser} busy={busy} setBusy={setBusy} notify={notify}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "cekdesil" && currentUser && (
        <CekDesilScreen
          user={currentUser} busy={busy} setBusy={setBusy} notify={notify}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "admin" && currentUser?.role === "admin" && (
        <AdminScreen
          user={currentUser}
          notify={notify}
          onBack={() => setScreen("home")}
        />
      )}
    </div>
  );
}

/* ------------------------------------ Welcome --------------------------------- */
function Welcome({ onGo }) {
  return (
    <div className="relative flex flex-col items-center justify-center px-6 py-16 min-h-[640px] overflow-hidden">
      <div className="absolute rounded-full opacity-20" style={{ width: 320, height: 320, background: C.green, top: -120, left: -100 }} />
      <div className="absolute rounded-full opacity-20" style={{ width: 260, height: 260, background: C.blue, bottom: -100, right: -80 }} />
      <div className="absolute rounded-full opacity-25" style={{ width: 140, height: 140, background: C.yellow, top: 60, right: 40 }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <Logo size={46} />
        <h1 className="font-head font-extrabold mt-8 leading-tight" style={{ fontSize: 34, color: C.ink }}>
          Cek desil keluargamu,<br />ajukan peninjauan lebih mudah
        </h1>
        <p className="mt-4 text-[15px]" style={{ color: C.inkSoft }}>
          Satu tempat untuk melihat status kesejahteraan keluarga dan menyiapkan data peninjauan desil tanpa perlu bolak-balik kantor desa.
        </p>

        <div className="mt-10 w-full flex flex-col gap-3.5">
          <PressButton
            onClick={() => onGo("login")}
            className="rounded-2xl py-3.5 font-head font-bold text-white text-[15px]"
            style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, boxShadow: `0 4px 0 ${C.greenDark}` }}
          >
            Masuk
          </PressButton>
          <PressButton
            onClick={() => onGo("signup")}
            className="rounded-2xl py-3.5 font-head font-bold text-[15px] border-2"
            style={{ background: "white", color: C.blueDark, borderColor: C.blue, boxShadow: `0 4px 0 ${C.blueSoft}` }}
          >
            Daftar Akun Baru
          </PressButton>
        </div>

        <p className="mt-6 text-xs" style={{ color: C.inkSoft }}>
          Data yang kamu isi digunakan hanya untuk proses pengecekan &amp; pengajuan peninjauan desil.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Auth (Login/Daftar) ------------------------- */
function AuthScreen({ tab, setTab, busy, setBusy, notify, onBack, onForgot, onLoggedIn }) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginErr, setLoginErr] = useState({});
  const [loginFailed, setLoginFailed] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [signupForm, setSignupForm] = useState({ email: "", username: "", password: "" });
  const [signupErr, setSignupErr] = useState({});
  const [showPass2, setShowPass2] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginFailed(false);
    setLoginMessage("");
    const err = {};
    if (!loginForm.username.trim()) err.username = "Username wajib diisi.";
    if (loginForm.password.length < 8) err.password = "Sandi minimal 8 karakter.";
    setLoginErr(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      const { user } = await signInWithUsername({
        username: loginForm.username.trim().toLowerCase(),
        password: loginForm.password,
      });
      const profile = await getCurrentProfile();

      if (!profile) {
        throw new Error("Akun berhasil masuk, tetapi profil pengguna belum ditemukan. Jalankan SQL perbaikan profil di Supabase.");
      }

      onLoggedIn(profile || { username: loginForm.username.trim(), id: user.id });
    } catch (e2) {
      setLoginFailed(true);
      if (e2?.code === "username-not-found") {
        setLoginMessage("Username belum terdaftar.");
      } else if (e2?.code === "email_not_confirmed") {
        setLoginMessage("Email akun ini belum dikonfirmasi. Cek inbox email lalu klik tautan konfirmasi dari Supabase.");
      } else if (e2?.code === "invalid_credentials") {
        setLoginMessage("Password tidak sesuai.");
      } else {
        setLoginMessage(e2?.message || "Login gagal. Periksa koneksi Supabase dan data akun.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const err = {};
    if (!/^\S+@\S+\.\S+$/.test(signupForm.email)) err.email = "Format email tidak valid.";
    if (!signupForm.username.trim() || signupForm.username.length < 4) err.username = "Username minimal 4 karakter.";
    if (signupForm.password.length < 8) err.password = "Sandi minimal 8 karakter.";
    setSignupErr(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      const cleanUsername = signupForm.username.trim().toLowerCase();
      const taken = await isUsernameTaken(cleanUsername);
      if (taken) {
        setSignupErr({ username: "Username sudah terdaftar." });
        return;
      }
      await signUpUser({
        email: signupForm.email.trim(),
        username: cleanUsername,
        password: signupForm.password,
      });
      notify(
        "success",
        "Pendaftaran berhasil! Cek email kamu untuk konfirmasi, lalu silakan masuk."
      );
      setLoginForm({ username: cleanUsername, password: "" });
      setTab("login");
    } catch (e2) {
      setSignupErr({ email: e2.message || "Pendaftaran gagal, coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[640px] px-4 py-10">
      <div className="w-full max-w-3xl rounded-[28px] shadow-xl overflow-hidden flex flex-col md:flex-row" style={{ background: "white" }}>
        {/* Diagonal side panel */}
        <div
          className="relative md:w-[38%] flex flex-col justify-center items-stretch p-8 gap-3 overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${C.green} 0%, ${C.blue} 100%)`, minHeight: 260 }}
        >
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-20" style={{ background: C.yellow }} />
          <div className="absolute -top-10 -right-6 w-28 h-28 rounded-full opacity-20" style={{ background: "white" }} />
          <button onClick={onBack} className="relative z-10 flex items-center gap-1 text-white/90 text-xs font-semibold mb-4 w-fit">
            <ArrowLeft size={14} /> Kembali
          </button>
          <button
            onClick={() => setTab("login")}
            className="relative z-10 text-left rounded-2xl px-5 py-3 font-head font-bold transition-all"
            style={{ background: tab === "login" ? "white" : "transparent", color: tab === "login" ? C.green : "white" }}
          >
            MASUK
          </button>
          <button
            onClick={() => setTab("signup")}
            className="relative z-10 text-left rounded-2xl px-5 py-3 font-head font-bold transition-all"
            style={{ background: tab === "signup" ? "white" : "transparent", color: tab === "signup" ? C.blue : "white" }}
          >
            DAFTAR
          </button>
        </div>

        {/* Form panel */}
        <div className="flex-1 p-8 md:p-10">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})` }}>
              <User size={26} color="white" />
            </div>
            <h2 className="font-head font-bold text-xl" style={{ color: C.ink }}>
              {tab === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}
            </h2>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <TextInput
                label="Username" icon={User} value={loginForm.username}
                onChange={(v) => setLoginForm((f) => ({ ...f, username: v }))}
                placeholder="cth. budisantoso" error={loginErr.username}
              />
              <TextInput
                label="Sandi" icon={Lock} value={loginForm.password}
                onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))}
                placeholder="Minimal 8 karakter" error={loginErr.password}
                showToggle show={showPass} onToggle={() => setShowPass((s) => !s)}
              />
              {loginFailed && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: C.dangerSoft, color: C.danger }}>
                  {loginMessage || "Username atau sandi tidak sesuai."}{" "}
                  <button type="button" onClick={onForgot} className="underline font-semibold">Lupa sandi?</button>
                </div>
              )}
              {!loginFailed && (
                <button type="button" onClick={onForgot} className="text-sm font-semibold text-right" style={{ color: C.blue }}>
                  Lupa sandi?
                </button>
              )}
              <PressButton
                type="submit" disabled={busy}
                className="rounded-2xl py-3 font-head font-bold text-white mt-1"
                style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, boxShadow: `0 4px 0 ${C.greenDark}` }}
              >
                {busy ? "Memeriksa..." : "Masuk"}
              </PressButton>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <TextInput
                label="Email" icon={Mail} type="email" value={signupForm.email}
                onChange={(v) => setSignupForm((f) => ({ ...f, email: v }))}
                placeholder="nama@email.com" error={signupErr.email}
              />
              <TextInput
                label="Username" icon={User} value={signupForm.username}
                onChange={(v) => setSignupForm((f) => ({ ...f, username: v }))}
                placeholder="cth. budisantoso" error={signupErr.username}
              />
              <TextInput
                label="Sandi" icon={Lock} value={signupForm.password}
                onChange={(v) => setSignupForm((f) => ({ ...f, password: v }))}
                placeholder="Minimal 8 karakter" error={signupErr.password}
                hint={!signupErr.password ? "Gunakan minimal 8 karakter." : undefined}
                showToggle show={showPass2} onToggle={() => setShowPass2((s) => !s)}
              />
              <PressButton
                type="submit" disabled={busy}
                className="rounded-2xl py-3 font-head font-bold text-white mt-1"
                style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, boxShadow: `0 4px 0 ${C.blueDark}` }}
              >
                {busy ? "Mendaftarkan..." : "Daftar"}
              </PressButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Forgot / Reset -------------------------------- */
function ForgotScreen({ busy, setBusy, notify, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Format email tidak valid."); return; }
    setBusy(true);
    try {
      // Supabase mengirim email reset sandi sungguhan. Demi keamanan (mencegah
      // orang lain mengecek email mana saja yang terdaftar), kita selalu
      // menampilkan pesan sukses yang sama, terlepas email ditemukan atau tidak.
      await requestPasswordReset(email.trim());
    } catch {
      /* diamkan; tetap tampilkan pesan generik di bawah */
    } finally {
      setBusy(false);
      setSent(true);
      notify("info", "Jika email terdaftar, tautan reset telah dikirim.");
    }
  }

  return (
    <Centered>
      <Card>
        <BackRow onBack={onBackToLogin} label="Kembali ke Menu Masuk" />
        <IconBadge icon={KeyRound} />
        <h2 className="font-head font-bold text-xl text-center mb-1" style={{ color: C.ink }}>Lupa Sandi</h2>
        <p className="text-sm text-center mb-6" style={{ color: C.inkSoft }}>
          Masukkan email yang terdaftar. Kami akan kirim tautan untuk mengganti sandi.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput label="Email Terdaftar" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="nama@email.com" error={err} />
          <PressButton
            type="submit" disabled={busy}
            className="rounded-2xl py-3 font-head font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, boxShadow: `0 4px 0 ${C.blueDark}` }}
          >
            {busy ? "Mengirim..." : "Kirim Tautan Reset"}
          </PressButton>
        </form>

        {sent && (
          <div className="mt-5 rounded-xl p-4" style={{ background: C.blueSoft }}>
            <p className="text-sm" style={{ color: C.ink }}>
              Jika <b>{email}</b> terdaftar, kami telah mengirim tautan reset sandi ke email tersebut.
              Buka email itu dan klik tautannya untuk lanjut mengganti sandi.
            </p>
          </div>
        )}
      </Card>
    </Centered>
  );
}

function ResetScreen({ busy, setBusy, notify, onDone, onBackToLogin }) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [err, setErr] = useState({});
  const [show, setShow] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = {};
    if (form.password.length < 8) e2.password = "Sandi minimal 8 karakter.";
    if (form.confirm !== form.password) e2.confirm = "Konfirmasi sandi tidak cocok.";
    setErr(e2);
    if (Object.keys(e2).length) return;

    setBusy(true);
    try {
      // Supabase sudah membuat sesi sementara "PASSWORD_RECOVERY" saat pengguna
      // membuka tautan dari email, jadi kita cukup panggil updateUser di sini.
      await updatePasswordAfterRecovery(form.password);
      onDone();
    } catch {
      setErr({ password: "Gagal memperbarui sandi. Tautan mungkin sudah kedaluwarsa." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered>
      <Card>
        <BackRow onBack={onBackToLogin} label="Kembali ke Menu Masuk" />
        <IconBadge icon={ShieldCheck} />
        <h2 className="font-head font-bold text-xl text-center mb-1" style={{ color: C.ink }}>Masukkan Sandi Baru</h2>
        <p className="text-sm text-center mb-6" style={{ color: C.inkSoft }}>Buat sandi baru untuk akun kamu.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput
            label="Sandi Baru" icon={Lock} value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="Minimal 8 karakter" error={err.password}
            showToggle show={show} onToggle={() => setShow((s) => !s)}
          />
          <TextInput
            label="Ulangi Sandi Baru" icon={Lock} value={form.confirm}
            onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
            placeholder="Ulangi sandi baru" error={err.confirm}
            showToggle show={show} onToggle={() => setShow((s) => !s)}
          />
          <PressButton
            type="submit" disabled={busy}
            className="rounded-2xl py-3 font-head font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, boxShadow: `0 4px 0 ${C.greenDark}` }}
          >
            {busy ? "Menyimpan..." : "Simpan Sandi Baru"}
          </PressButton>
        </form>
      </Card>
    </Centered>
  );
}

function ChangePasswordScreen({ user, busy, setBusy, notify, onBack }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [err, setErr] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = {};
    if (form.next.length < 8) e2.next = "Sandi baru minimal 8 karakter.";
    if (form.confirm !== form.next) e2.confirm = "Konfirmasi sandi tidak cocok.";
    setErr(e2);
    if (Object.keys(e2).length) return;

    setBusy(true);
    try {
      await changePassword({
        email: user.email,
        currentPassword: form.current,
        newPassword: form.next,
      });
      notify("success", "Sandi berhasil diganti.");
      onBack();
    } catch (e3) {
      setErr({ current: e3.code === "wrong-current-password" ? "Sandi saat ini tidak sesuai." : "Gagal mengganti sandi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered>
      <Card>
        <BackRow onBack={onBack} label="Kembali ke Beranda" />
        <IconBadge icon={KeyRound} />
        <h2 className="font-head font-bold text-xl text-center mb-6" style={{ color: C.ink }}>Ganti Sandi</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput label="Sandi Saat Ini" icon={Lock} value={form.current} onChange={(v) => setForm((f) => ({ ...f, current: v }))} error={err.current} placeholder="Sandi lama" />
          <TextInput label="Sandi Baru" icon={Lock} value={form.next} onChange={(v) => setForm((f) => ({ ...f, next: v }))} error={err.next} placeholder="Minimal 8 karakter" />
          <TextInput label="Ulangi Sandi Baru" icon={Lock} value={form.confirm} onChange={(v) => setForm((f) => ({ ...f, confirm: v }))} error={err.confirm} placeholder="Ulangi sandi baru" />
          <PressButton
            type="submit" disabled={busy}
            className="rounded-2xl py-3 font-head font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, boxShadow: `0 4px 0 ${C.blueDark}` }}
          >
            {busy ? "Menyimpan..." : "Simpan Perubahan"}
          </PressButton>
        </form>
      </Card>
    </Centered>
  );
}

/* --------------------------------- Shared bits --------------------------------- */
function Centered({ children }) {
  return <div className="flex items-center justify-center min-h-[640px] px-4 py-10">{children}</div>;
}
function Card({ children }) {
  return <div className="w-full max-w-sm rounded-[28px] bg-white shadow-xl p-8">{children}</div>;
}
function BackRow({ onBack, label }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold mb-5" style={{ color: C.inkSoft }}>
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
function IconBadge({ icon: Icon }) {
  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})` }}>
      <Icon size={24} color="white" />
    </div>
  );
}

/* ----------------------------------- Home -------------------------------------- */
function HomeScreen({ user, onLogout, onCekDesil, onChangePassword, onAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hour = new Date().getHours();
  const greetTime = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="min-h-[640px]">
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b" style={{ borderColor: C.line }}>
        <Logo />
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border" style={{ borderColor: C.line }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-head font-bold text-sm" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})` }}>
              {user.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-semibold" style={{ color: C.ink }}>{user.username}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-lg border overflow-hidden z-20" style={{ borderColor: C.line }}>
              <button onClick={() => { setMenuOpen(false); onChangePassword(); }} className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-gray-50" style={{ color: C.ink }}>
                <Settings size={16} /> Ganti Sandi
              </button>
              <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-gray-50" style={{ color: C.danger }}>
                <LogOut size={16} /> Keluar
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
        <div
          className="rounded-3xl p-8 mb-8 relative overflow-hidden"
          style={{ background: `linear-gradient(120deg, ${C.green} 0%, ${C.blue} 100%)` }}
        >
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: C.yellow }} />
          <p className="text-white/80 text-sm font-medium">{greetTime},</p>
          <h1 className="font-head font-extrabold text-white text-2xl md:text-3xl mt-1">Halo, {user.username} 👋</h1>
          <p className="text-white/85 text-sm mt-2 max-w-md">
            Cek posisi desil keluargamu dan siapkan data untuk pengajuan peninjauan kapan saja.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <button onClick={onCekDesil} className="text-left rounded-2xl p-6 border-2 transition-transform hover:-translate-y-0.5" style={{ borderColor: C.line, background: "white" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: C.greenSoft }}>
              <ClipboardList size={22} color={C.green} />
            </div>
            <h3 className="font-head font-bold text-lg" style={{ color: C.ink }}>Cek Desil</h3>
            <p className="text-sm mt-1" style={{ color: C.inkSoft }}>Isi data keluarga dan lihat indikasi status desil kamu.</p>
          </button>

          <button onClick={onChangePassword} className="text-left rounded-2xl p-6 border-2 transition-transform hover:-translate-y-0.5" style={{ borderColor: C.line, background: "white" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: C.yellowSoft }}>
              <Settings size={22} color={C.yellowDark} />
            </div>
            <h3 className="font-head font-bold text-lg" style={{ color: C.ink }}>Pengaturan Akun</h3>
            <p className="text-sm mt-1" style={{ color: C.inkSoft }}>Kelola sandi dan informasi akun kamu.</p>
          </button>

          {user.role === "admin" && (
            <button onClick={onAdmin} className="text-left rounded-2xl p-6 border-2 transition-transform hover:-translate-y-0.5" style={{ borderColor: C.line, background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: C.blueSoft }}>
                <UsersIcon size={22} color={C.blue} />
              </div>
              <h3 className="font-head font-bold text-lg" style={{ color: C.ink }}>Dashboard Admin</h3>
              <p className="text-sm mt-1" style={{ color: C.inkSoft }}>Lihat data pengajuan dan hasil pendataan warga.</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Dashboard Admin ------------------------------ */
function AdminScreen({ user, notify, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getAdminSubmissions();
        if (active) setRows(data);
      } catch (e) {
        notify("error", e?.message || "Data warga gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-[640px] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <BackRow onBack={onBack} label="Kembali ke Beranda" />
        <div className="rounded-[28px] bg-white shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: C.blueSoft }}>
              <UsersIcon size={22} color={C.blue} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: C.inkSoft }}>Petugas / Admin</p>
              <h2 className="font-head font-bold text-xl" style={{ color: C.ink }}>Data Pendataan Warga</h2>
            </div>
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: C.inkSoft }}>Memuat data…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm" style={{ color: C.inkSoft }}>Belum ada data pendataan warga.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: C.ink }}>
                        {row.data?.namaKK || "Nama belum diisi"}
                      </p>
                      <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
                        {row.indikasi || "Belum ada indikasi"} · Skor {row.score ?? "-"}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(selected?.id === row.id ? null : row)}
                      className="rounded-xl px-4 py-2 text-sm font-semibold"
                      style={{ background: C.blueSoft, color: C.blueDark }}
                    >
                      {selected?.id === row.id ? "Tutup" : "Lihat Data"}
                    </button>
                  </div>

                  {selected?.id === row.id && (
                    <div className="mt-4 rounded-xl p-4 overflow-auto" style={{ background: C.cream }}>
                      <p className="text-xs font-bold mb-2" style={{ color: C.ink }}>Detail data</p>
                      <pre className="text-xs whitespace-pre-wrap break-words" style={{ color: C.inkSoft }}>
                        {JSON.stringify(row.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Cek Desil wizard ------------------------------ */
const STEPS = [
  { title: "Data Diri & Kependudukan", icon: UsersIcon, fields: [
    { key: "nik", label: "NIK (16 digit — gunakan data contoh)", placeholder: "35xxxxxxxxxxxxxx" },
    { key: "noKK", label: "Nomor Kartu Keluarga", placeholder: "35xxxxxxxxxxxxxx" },
    { key: "namaKK", label: "Nama Kepala Keluarga", placeholder: "Nama sesuai KK" },
    { key: "jumlahAnggota", label: "Jumlah Anggota Keluarga", type: "number", placeholder: "4" },
    { key: "alamat", label: "Alamat (Desa/Kelurahan, Kecamatan, Kab/Kota)", placeholder: "Ds. Sukamaju, Kec. ..., Kab. ...", full: true },
  ]},
  { title: "Pekerjaan & Pendapatan", icon: Wallet, fields: [
    { key: "statusKerja", label: "Status Pekerjaan", type: "select", options: ["Bekerja Tetap", "Bekerja Tidak Tetap/Harian", "Usaha Sendiri", "Tidak Bekerja"] },
    { key: "pendapatan", label: "Pendapatan Bulanan (Rp)", type: "number", placeholder: "2500000" },
    { key: "punyaUsaha", label: "Memiliki Usaha/Bisnis", type: "select", options: ["Tidak", "Ya"] },
    { key: "npwp", label: "Memiliki NPWP", type: "select", options: ["Tidak", "Ya"] },
  ]},
  { title: "Aset & Kepemilikan", icon: Car, fields: [
    { key: "statusRumah", label: "Status Kepemilikan Rumah", type: "select", options: ["Milik Sendiri", "Sewa/Kontrak", "Menumpang"] },
    { key: "kepemilikanTanah", label: "Kepemilikan Tanah/Sawah", type: "select", options: ["Tidak", "Ya"] },
    { key: "jumlahMotor", label: "Jumlah Sepeda Motor (+ BPKB)", type: "number", placeholder: "0" },
    { key: "jumlahMobil", label: "Jumlah Mobil (+ BPKB)", type: "number", placeholder: "0" },
    { key: "ternak", label: "Kepemilikan Ternak", type: "select", options: ["Tidak", "Ya"] },
  ]},
  { title: "Kondisi Tempat Tinggal", icon: HomeIcon, fields: [
    { key: "lantai", label: "Jenis Lantai", type: "select", options: ["Keramik/Ubin", "Semen", "Tanah"] },
    { key: "dinding", label: "Jenis Dinding", type: "select", options: ["Tembok", "Setengah Tembok", "Kayu/Bambu"] },
    { key: "atap", label: "Jenis Atap", type: "select", options: ["Genteng/Beton", "Seng", "Asbes/Rumbia"] },
    { key: "airMinum", label: "Sumber Air Minum", type: "select", options: ["PDAM/Air Kemasan", "Sumur", "Sungai/Mata Air"] },
    { key: "sanitasi", label: "Jenis Sanitasi/Jamban", type: "select", options: ["Jamban Pribadi", "Jamban Bersama", "Tidak Ada"] },
    { key: "bahanBakar", label: "Bahan Bakar Memasak", type: "select", options: ["Gas/Listrik", "Minyak Tanah", "Kayu Bakar"] },
  ]},
  { title: "Data Listrik (Meteran Token)", icon: Zap, fields: [
    { key: "idPelanggan", label: "ID Pelanggan / Nomor Meter PLN", placeholder: "52xxxxxxxxx" },
    { key: "jenisMeteran", label: "Jenis Meteran", type: "select", options: ["Token (Prabayar)", "Pascabayar"] },
    { key: "dayaListrik", label: "Daya Terpasang", type: "select", options: ["450 VA", "900 VA", "1300 VA", "2200 VA", "Di atas 2200 VA"] },
  ]},
  { title: "Pendidikan", icon: GraduationCap, fields: [
    { key: "pendidikanKK", label: "Pendidikan Terakhir Kepala Keluarga", type: "select", options: ["Tidak Sekolah", "SD", "SMP", "SMA/SMK", "Diploma/Sarjana"] },
    { key: "anakSekolah", label: "Jumlah Anak Usia Sekolah", type: "number", placeholder: "0" },
  ]},
  { title: "Kesehatan & Disabilitas", icon: HeartPulse, fields: [
    { key: "sakitKronis", label: "Ada Anggota Keluarga dengan Sakit Kronis", type: "select", options: ["Tidak", "Ya"] },
    { key: "disabilitas", label: "Ada Anggota Keluarga Disabilitas", type: "select", options: ["Tidak", "Ya"] },
  ]},
  { title: "Riwayat Bantuan Sosial", icon: ShieldCheck, fields: [
    { key: "bansos", label: "Bantuan yang Pernah/Sedang Diterima", type: "select", options: ["Belum Pernah", "PKH", "BPNT/Kartu Sembako", "KIP", "KIS/PBI", "Lainnya"] },
  ]},
  { title: "Pengeluaran Rumah Tangga", icon: Wallet, fields: [
    { key: "pengeluaranPangan", label: "Pengeluaran Pangan per Bulan (Rp)", type: "number", placeholder: "1500000" },
    { key: "pengeluaranNonPangan", label: "Pengeluaran Non-Pangan per Bulan (Rp)", type: "number", placeholder: "1000000" },
  ]},
  { title: "Dokumen Tambahan", icon: FileText, fields: [
    { key: "skck", label: "SKCK (Opsional)", type: "file", optional: true, accept: ".pdf,.jpg,.jpeg,.png" },
  ]},
];

function CekDesilScreen({ user, busy, setBusy, notify, onBack }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [skckFile, setSkckFile] = useState(null);
  const [result, setResult] = useState(null);
  const isReview = step === STEPS.length;
  const current = STEPS[step];

  function setField(key, value) {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep() {
    const e = {};
    current.fields.forEach((f) => {
      if (f.optional) return;
      if (!data[f.key]) e[f.key] = "Wajib diisi.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!isReview && !validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  }
  function back() {
    if (step === 0) onBack();
    else setStep((s) => s - 1);
  }

  async function submit() {
    setBusy(true);
    let score = 50;
    if (data.pendapatan) score -= Math.min(30, Number(data.pendapatan) / 200000);
    if (data.statusRumah === "Milik Sendiri") score -= 5;
    if (data.dayaListrik === "450 VA" || data.dayaListrik === "900 VA") score -= 5;
    if (Number(data.jumlahMobil) > 0) score += 15;
    if (data.sakitKronis === "Ya" || data.disabilitas === "Ya") score -= 5;
    if (Number(data.pengeluaranPangan) + Number(data.pengeluaranNonPangan) > 7500000) score += 5;
    score = Math.max(1, Math.min(100, Math.round(score)));
    const indikasi = score < 35 ? "Cenderung Desil Rendah (1–3)" : score < 65 ? "Cenderung Desil Menengah (4–7)" : "Cenderung Desil Tinggi (8–10)";

    const summary = { indikasi, score, namaKK: data.namaKK || "-" };
    try {
      await saveDesilSubmission(user.id, { formData: data, score, indikasi, skckFile });
      setResult(summary);
      notify("success", "Data berhasil disimpan.");
    } catch {
      notify("error", "Gagal menyimpan data. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Centered>
        <div className="w-full max-w-lg rounded-[28px] bg-white shadow-xl p-8">
          <IconBadge icon={CheckCircle2} />
          <h2 className="font-head font-bold text-xl text-center mb-1" style={{ color: C.ink }}>Data Tersimpan</h2>
          <p className="text-sm text-center mb-6" style={{ color: C.inkSoft }}>Berikut indikasi awal berdasarkan data yang kamu isi.</p>

          <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: C.greenSoft }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Indikasi Sementara</p>
            <p className="font-head font-extrabold text-2xl mt-1" style={{ color: C.green }}>{result.indikasi}</p>
            <p className="text-xs mt-2" style={{ color: C.inkSoft }}>
              *Ini estimasi indikatif untuk gambaran awal, bukan hasil resmi BPS/DTSEN.
            </p>
          </div>

          <div className="rounded-2xl p-5 mb-6 border" style={{ borderColor: C.line }}>
            <p className="font-head font-bold text-sm mb-3" style={{ color: C.ink }}>Langkah Selanjutnya untuk Peninjauan Resmi</p>
            <ul className="text-sm space-y-2" style={{ color: C.inkSoft }}>
              <li className="flex gap-2"><Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: C.yellowDark }} />Ajukan pembaruan lewat RT/RW, Desa/Kelurahan, atau aplikasi Cek Bansos.</li>
              <li className="flex gap-2"><Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: C.yellowDark }} />Data akan diverifikasi petugas dan dibahas dalam Musyawarah Desa/Kelurahan.</li>
              <li className="flex gap-2"><Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: C.yellowDark }} />Hasil verifikasi disinkronkan ke DTSEN oleh BPS setiap tiga bulan.</li>
            </ul>
          </div>

          <PressButton
            onClick={onBack}
            className="rounded-2xl py-3 font-head font-bold text-white w-full"
            style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, boxShadow: `0 4px 0 ${C.greenDark}` }}
          >
            Kembali ke Beranda
          </PressButton>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-[640px] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <BackRow onBack={back} label={step === 0 ? "Kembali ke Beranda" : "Langkah Sebelumnya"} />

        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full flex-1" style={{ background: i <= step || isReview ? C.green : C.line }} />
          ))}
        </div>

        <div className="rounded-[28px] bg-white shadow-xl p-8">
          {!isReview ? (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.greenSoft }}>
                  <current.icon size={20} color={C.green} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: C.inkSoft }}>Langkah {step + 1} dari {STEPS.length}</p>
                  <h2 className="font-head font-bold text-lg" style={{ color: C.ink }}>{current.title}</h2>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {current.fields.map((f) => (
                  <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: C.ink }}>{f.label}</label>
                    {f.type === "select" ? (
                      <select
                        value={data[f.key] || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="w-full rounded-xl border-2 py-2.5 px-4 text-sm bg-white"
                        style={{ borderColor: errors[f.key] ? C.danger : C.line, color: C.ink }}
                      >
                        <option value="" disabled>Pilih salah satu</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === "file" ? (
                      <div>
                        <label className="flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer hover:bg-gray-50" style={{ borderColor: errors[f.key] ? C.danger : C.line }}>
                          <Upload size={18} style={{ color: C.blue }} />
                          <span className="text-sm" style={{ color: C.inkSoft }}>
                            {skckFile ? skckFile.name : "Pilih file SKCK (PDF/JPG/PNG)"}
                          </span>
                          <input
                            type="file"
                            accept={f.accept}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setSkckFile(file);
                              setErrors((x) => ({ ...x, [f.key]: undefined }));
                            }}
                          />
                        </label>
                        <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
                          Opsional. Jika tidak punya/tidak ingin melampirkan SKCK, langsung klik Lanjut.
                        </p>
                      </div>
                    ) : (
                      <input
                        type={f.type || "text"}
                        value={data[f.key] || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full rounded-xl border-2 py-2.5 px-4 text-sm bg-white"
                        style={{ borderColor: errors[f.key] ? C.danger : C.line, color: C.ink }}
                      />
                    )}
                    {errors[f.key] && <p className="text-xs mt-1 font-medium" style={{ color: C.danger }}>{errors[f.key]}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.yellowSoft }}>
                  <FileText size={20} color={C.yellowDark} />
                </div>
                <h2 className="font-head font-bold text-lg" style={{ color: C.ink }}>Tinjau Data Sebelum Kirim</h2>
              </div>
              <div className="max-h-80 overflow-y-auto pr-1 space-y-4">
                {STEPS.map((s) => (
                  <div key={s.title}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.green }}>{s.title}</p>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {s.fields.map((f) => (
                        <p key={f.key} style={{ color: C.inkSoft }}>
                          <span style={{ color: C.ink }}>{f.label}:</span>{" "}
                          {f.type === "file"
                            ? (skckFile?.name || "Tidak dilampirkan")
                            : (data[f.key] || "-")}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: C.inkSoft }}>
                Prototipe demo — jangan gunakan NIK/KK/data pribadi asli.
              </p>
            </>
          )}

          <div className="flex gap-3 mt-8">
            {!isReview && step > 0 && (
              <PressButton onClick={() => setStep((s) => s - 1)} className="rounded-2xl py-3 px-5 font-head font-bold flex items-center gap-1" style={{ background: C.cream, color: C.ink, boxShadow: `0 3px 0 ${C.line}` }}>
                <ChevronLeft size={16} /> Kembali
              </PressButton>
            )}
            {!isReview ? (
              <PressButton onClick={next} full className="rounded-2xl py-3 font-head font-bold text-white flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, boxShadow: `0 4px 0 ${C.blueDark}` }}>
                Lanjut <ChevronRight size={16} />
              </PressButton>
            ) : (
              <>
                <PressButton onClick={() => setStep(STEPS.length - 1)} className="rounded-2xl py-3 px-5 font-head font-bold flex items-center gap-1" style={{ background: C.cream, color: C.ink, boxShadow: `0 3px 0 ${C.line}` }}>
                  <ChevronLeft size={16} /> Ubah
                </PressButton>
                <PressButton onClick={submit} disabled={busy} full className="rounded-2xl py-3 font-head font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, boxShadow: `0 4px 0 ${C.greenDark}` }}>
                  {busy ? "Mengirim..." : "Kirim & Cek Indikasi Desil"}
                </PressButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
