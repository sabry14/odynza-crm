export function getStoredToken() {
  return localStorage.getItem("odynza_token") || sessionStorage.getItem("odynza_token");
}

export function saveAuthSession(data, remember) {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  storage.setItem("odynza_token", data.token);
  storage.setItem("odynza_user", JSON.stringify(data.user));

  otherStorage.removeItem("odynza_token");
  otherStorage.removeItem("odynza_user");
}
