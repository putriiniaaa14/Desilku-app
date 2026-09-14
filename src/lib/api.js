import { supabase } from "./supabaseClient";

/* ----------------------------------------------------------------------
 * Lapisan ini menggantikan window.storage (khusus Claude) dengan Supabase
 * Auth + Postgres, supaya login/daftar/reset sandi/simpan data beneran
 * berfungsi setelah di-deploy mandiri (Vercel/Netlify/GitHub Pages).
 * ------------------------------------------------------------------- */

// Aplikasi ini login pakai USERNAME, tapi Supabase Auth bekerja dengan EMAIL.
// Jadi kita cari dulu email dari tabel profiles berdasarkan username,
// baru sign-in ke Supabase Auth pakai email tsb.
export async function getEmailByUsername(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error || !data) return null;
  return data.email;
}

export async function getUsernameByEmail(email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error || !data) return null;
  return data.username;
}

export async function isUsernameTaken(username) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username.trim())
    .maybeSingle();
  return !!data;
}

export async function signUpUser({ email, username, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: username.trim() } },
  });
  if (error) throw error;
  return data;
}

export async function signInWithUsername({ username, password }) {
  const cleanUsername = username.trim().toLowerCase();
  const email = await getEmailByUsername(cleanUsername);
  if (!email) {
    const err = new Error("Username tidak ditemukan.");
    err.code = "username-not-found";
    throw err;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Jangan sembunyikan error penting dari Supabase. UI akan mengubahnya
  // menjadi pesan yang mudah dipahami (mis. email belum dikonfirmasi).
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  await supabase.auth.signOut();
}

export async function getCurrentProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Mengirim EMAIL RESET SANDI SUNGGUHAN lewat layanan email Supabase.
// redirectTo mengarahkan pengguna kembali ke halaman /reset-password di domain kamu.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

// Dipanggil di halaman /reset-password setelah pengguna klik tautan dari email.
export async function updatePasswordAfterRecovery(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Ganti sandi dari dalam aplikasi (saat sudah login). Supabase tidak
// menyimpan sandi lama untuk dicocokkan di client, jadi kita verifikasi
// sandi lama dengan cara re-login singkat sebelum update.
export async function changePassword({ email, currentPassword, newPassword }) {
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyError) {
    const err = new Error("Sandi saat ini tidak sesuai.");
    err.code = "wrong-current-password";
    throw err;
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function saveDesilSubmission(userId, { formData, score, indikasi, skckFile }) {
  const payload = { ...formData };

  // SKCK benar-benar opsional. Jika tidak dipilih, tidak ada upload apa pun.
  if (skckFile) {
    const safeName = skckFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/skck-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("dokumen-warga")
      .upload(path, skckFile, { upsert: false });

    if (uploadError) throw uploadError;
    payload.skck_path = path;
    payload.skck_nama_file = skckFile.name;
  }

  const { error } = await supabase.from("desil_submissions").insert({
    user_id: userId,
    data: payload,
    score,
    indikasi,
  });
  if (error) throw error;
}


export async function getAdminSubmissions() {
  const { data, error } = await supabase
    .from("desil_submissions")
    .select("id, user_id, data, score, indikasi, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
