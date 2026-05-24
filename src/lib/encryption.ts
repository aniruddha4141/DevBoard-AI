import CryptoJS from "crypto-js";

const SECRET = process.env.ENCRYPTION_SECRET || "default-dev-encryption-key-32ch";

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
}

export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}
