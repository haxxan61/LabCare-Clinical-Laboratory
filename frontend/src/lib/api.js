import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Also attach bearer token (fallback for environments that strip 3rd-party cookies)
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("lc_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function formatPKR(amount) {
  if (amount == null) return "Rs. 0";
  return "Rs. " + Number(amount).toLocaleString("en-PK");
}

export function flagForValue(value, low, high) {
  const num = parseFloat(value);
  if (isNaN(num) || low == null || high == null) return "";
  if (num < low) return "L";
  if (num > high) return "H";
  return "N";
}
