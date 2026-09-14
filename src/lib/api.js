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

  const { data, error } = await supabase.rpc(
    "get_my_profile"
  );

  if (error) {
    console.error(
      "Gagal mengambil profil:",
      error
    );
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
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
   
