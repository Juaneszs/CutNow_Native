const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email || "").trim());
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}
