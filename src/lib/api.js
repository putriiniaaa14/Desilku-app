import { supabase } from "./supabaseClient";

export async function getEmailByUsername(username) {
  const cleanUsername = username.trim().toLowerCase();
  const { data, error } = await supabase.rpc("get_email_by_username", { p_username: cleanUsername });
  if (error) throw error;
  if (!data) {
    const err = new Error("Username tidak ditemukan.");
    err.code = "username-not-found";
    throw err;
  }
  return data;
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
  const email = await getEmailByUsername(username);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) return null;

  const { data, error } = await supabase.rpc("get_my_profile");
  if (error || !data || data.length === 0) return null;
  return data[0];
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePasswordAfterRecovery(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function saveDataUpdateSubmission(userId, { formData, files }) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");

  const payload = {
    ...formData,
    jenis_pengajuan: "Pemutakhiran Data Sosial Ekonomi",
    status_pengajuan: "Menunggu Verifikasi",
  };

  const bucket = "dokumen-warga";

  for (const [key, file] of Object.entries(files || {})) {
    if (!file) continue;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/pengajuan-${Date.now()}-${key}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    payload[`${key}_path`] = path;
    payload[`${key}_nama_file`] = file.name;
  }

  const { data, error } = await supabase
    .from("desil_submissions")
    .insert({
      user_id: userId,
      data: payload,
      score: null,
      indikasi: null,
    })
    .select("id, created_at")
    .single();

  if (error) throw error;

  const date = new Date(data.created_at || Date.now());
  const tanggal = date.toLocaleDateString("id-ID");
  const nomorPengajuan =
    `DSK-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(data.id).slice(0, 4).toUpperCase()}`;

  return { id: data.id, nomorPengajuan, tanggal };
}
