import { supabase } from "./supabaseClient";

/* =========================
   LOGIN & PROFIL
   ========================= */

// Cari email berdasarkan username menggunakan RPC Supabase.
export async function getEmailByUsername(username) {
  const cleanUsername = username.trim().toLowerCase();

  const { data, error } = await supabase.rpc(
    "get_email_by_username",
    {
      p_username: cleanUsername,
    }
  );

  if (error) {
    console.error("Gagal mencari username:", error);
    throw error;
  }

  if (!data) {
    const err = new Error("Username tidak ditemukan.");
    err.code = "username-not-found";
    throw err;
  }

  return data;
}

// Cari username berdasarkan email.
export async function getUsernameByEmail(email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .ilike("email", email.trim())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.username;
}

// Mengecek apakah username sudah digunakan.
export async function isUsernameTaken(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username.trim())
    .maybeSingle();

  if (error) {
    return false;
  }

  return !!data;
}

// Daftar akun baru.
export async function signUpUser({
  email,
  username,
  password,
}) {
  const cleanEmail = email.trim();
  const cleanUsername = username.trim();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        username: cleanUsername,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

// Login menggunakan username + password.
export async function signInWithUsername({
  username,
  password,
}) {
  const cleanUsername = username.trim().toLowerCase();

  const email = await getEmailByUsername(cleanUsername);

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

  if (error) {
    throw error;
  }

  return data;
}

// Logout.
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

// Mengambil profil user yang sedang login.
export async function getCurrentProfile() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "Gagal mengambil session:",
      sessionError
    );
    return null;
  }

  const session = sessionData?.session;

  if (!session) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, is_admin")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Gagal mengambil profil:",
      error
    );
    return null;
  }

  return data;
}

/* =========================
   RESET & GANTI PASSWORD
   ========================= */

// Meminta email reset password.
export async function requestPasswordReset(email) {
  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo:
          `${window.location.origin}/reset-password`,
      }
    );

  if (error) {
    throw error;
  }
}

// Mengubah password setelah proses recovery.
export async function updatePasswordAfterRecovery(
  newPassword
) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}

// Mengganti password dari dalam akun.
export async function changePassword({
  email,
  currentPassword,
  newPassword,
}) {
  const { error: verifyError } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: currentPassword,
    });

  if (verifyError) {
    const err = new Error(
      "Sandi saat ini tidak sesuai."
    );

    err.code = "wrong-current-password";

    throw err;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}

/* =========================
   DATA DESIL
   ========================= */

// Menyimpan pengajuan/data desil warga.
export async function saveDesilSubmission(
  userId,
  {
    formData,
    score,
    indikasi,
    skckFile,
  }
) {
  const payload = {
    ...formData,
  };

  // Upload dokumen SKCK jika ada.
  if (skckFile) {
    const safeName = skckFile.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const path =
      `${userId}/skck-${Date.now()}-${safeName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("dokumen-warga")
        .upload(path, skckFile, {
          upsert: false,
        });

    if (uploadError) {
      throw uploadError;
    }

    payload.skck_path = path;
    payload.skck_nama_file = skckFile.name;
  }

  const { error } = await supabase
    .from("desil_submissions")
    .insert({
      user_id: userId,
      data: payload,
      score: score,
      indikasi: indikasi,
    });

  if (error) {
    throw error;
  }
}

/* =========================
   ADMIN
   ========================= */

// Mengambil seluruh pengajuan untuk halaman admin.
export async function getAdminSubmissions() {
  const { data, error } = await supabase
    .from("desil_submissions")
    .select(
      "id, user_id, data, score, indikasi, created_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}
