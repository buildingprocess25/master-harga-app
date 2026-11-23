import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const cwd = process.cwd();
const testEnvPath = path.resolve(cwd, ".env.test");
const devEnvPath = path.resolve(cwd, ".env");

if (!fs.existsSync(testEnvPath)) {
  throw new Error(
    `[Integration Setup] File .env.test tidak ditemukan di ${testEnvPath}. Simpan DATABASE_URL database test ke .env.test terlebih dahulu.`
  );
}

const parsedTest = dotenv.parse(fs.readFileSync(testEnvPath));
const testDbUrl = (parsedTest.DATABASE_URL || "").trim();

if (!testDbUrl) {
  throw new Error("[Integration Setup] DATABASE_URL pada .env.test wajib diisi.");
}

if (fs.existsSync(devEnvPath)) {
  const parsedDev = dotenv.parse(fs.readFileSync(devEnvPath));
  const devDbUrl = (parsedDev.DATABASE_URL || "").trim();
  if (devDbUrl && devDbUrl === testDbUrl) {
    throw new Error(
      "[Integration Setup] DIBLOKIR: DATABASE_URL pada .env.test sama dengan .env dev. Gunakan database test terpisah."
    );
  }
}

for (const [key, value] of Object.entries(parsedTest)) {
  process.env[key] = value;
}
process.env.DATABASE_URL = testDbUrl;
