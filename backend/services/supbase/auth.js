import supabase from "./client.js";

export const register = async (email, password, userMetadata) => {
  try {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: userMetadata.phone,
          full_name: userMetadata.fullName,
          role: userMetadata.role,
        },
      },
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data.user;
  } catch (error) {
    throw error;
  }
};

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data || !data.session) throw new Error("Supabase không trả về session");

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    supabaseUser: data.user,
  };
};
