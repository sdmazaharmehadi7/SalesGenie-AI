import api from "./client";

export const login = async (email, password) => {
  const formData = new URLSearchParams();

  formData.append("username", email);
  formData.append("password", password);

  const response = await api.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
};

export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const googleLogin = async (payload) => {
  const response = await api.post("/auth/google", payload);
  return response.data;
};

export const getGoogleAuthConfig = async () => {
  const response = await api.get("/auth/google/config");
  return response.data;
};

/**
 * Change the authenticated user's password.
 * The bearer token is automatically injected by the Axios request interceptor.
 *
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const response = await api.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
};