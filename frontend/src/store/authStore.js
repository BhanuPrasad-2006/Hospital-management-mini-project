/**
 * Zustand Auth Store
 * Manages authentication state (token, user, login/logout actions).
 */

// Note: Install zustand — npm install zustand
// import { create } from "zustand";
// import API from "../services/api";

// For now, using a simple module-based store pattern
// since zustand may not be installed yet.

const AUTH_TOKEN_KEY = "token";
const AUTH_USER_KEY = "user";

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated() {
  return !!getStoredToken();
}

export function getUserRole() {
  const user = getStoredUser();
  return user?.role || null;
}
