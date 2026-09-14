import { supabase } from "./supabaseClient";

export async function getEmailByUsername(username) {
  const { data, error } = await supabase.rpc("get_email_by_username", { p_username: username.trim().toLowerCase() });
  if (error) throw error;
  if (!data) { const e = new Error("Username tidak ditemukan."); e.code = "username-not-found"; throw e; }
  return data;
}

export async function signUpUser({ email, username, password }) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim() } } });
  if (error) throw error;
  return data;
}

export async function signInWithUsername({ username, password }) {
  const email = await getEmailByUsername(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentProfile() {
  const { data: s, error: se } = await supabase.auth.getSession();
  if (se || !s?.session) return null;
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error || !data?.length) return null;
  return data[0];
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw error;
}

export async function updatePasswordAfterRecovery(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function saveDataUpdateSubmission(userId, { formData, files, indikasi }) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");
  const payload = { ...formData, jenis_pengajuan: "Pemutakhiran Data Sosial Ekonomi", status_pengajuan: "Menunggu Verifikasi", indikasi_desil_aplikasi: indikasi ?? null };
  const bucket = "dokumen-warga";
  for (const [key, file] of Object.entries(files || {})) {
    if (!file) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/pengajuan-${Date.now()}-${key}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    payload[`${key}_path`] = path;
    payload[`${key}_nama_file`] = file.name;
  }
  const { data, error } = await supabase.from("desil_submissions").insert({ user_id: userId, data: payload, score: null, indikasi: indikasi ?? null, status: "Menunggu Pemeriksaan" }).select("id, created_at").single();
  if (error) throw error;
  const date = new Date(data.created_at || Date.now());
  const nomorPengajuan = `DSK-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}-${String(data.id).slice(0,4).toUpperCase()}`;
  return { id: data.id, nomorPengajuan, tanggal: date.toLocaleDateString("id-ID"), created_at: date.toISOString() };
}

export async function getMySubmissions() {
  const { data, error } = await supabase.from("desil_submissions").select("id, created_at, data, indikasi, status").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => {
    const created = new Date(row.created_at || Date.now());
    return { ...row, status: row.status || row.data?.status_pengajuan || "Menunggu Pemeriksaan", nomorPengajuan: `DSK-${created.getFullYear()}${String(created.getMonth()+1).padStart(2,"0")}${String(created.getDate()).padStart(2,"0")}-${String(row.id).slice(0,4).toUpperCase()}` };
  });
}


export async function getAdminSubmissions() {
  const { data, error } = await supabase.rpc("get_admin_submissions");
  if (error) throw error;
  return data || [];
}

export async function updateSubmissionStatus(submissionId, status) {
  const { data, error } = await supabase.rpc("admin_update_submission_status", {
    p_submission_id: submissionId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

export async function getAdminSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("dokumen-warga").createSignedUrl(path, 300);
  if (error) throw error;
  return data?.signedUrl || null;
}
