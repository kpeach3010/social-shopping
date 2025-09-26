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
  try {
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return {
      accessToken: response.data.session.access_token,
      refreshToken: response.data.session.refresh_token,
    };
  } catch (e) {
    throw e;
  }
};
