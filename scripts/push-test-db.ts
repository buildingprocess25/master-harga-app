import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

function loadIsolatedTestDatabaseUrl(): string {
  const cwd = process.cwd();
  const testEnvPath = path.resolve(cwd, ".env.test");
  const devEnvPath = path.resolve(cwd, ".env");

  if (!fs.existsSync(testEnvPath)) {
    throw new Error(
      `File .env.test tidak ditemukan di ${testEnvPath}. Buat file .env.test dengan DATABASE_URL khusus database test.`
    );
  }

  const parsedTest = dotenv.parse(fs.readFileSync(testEnvPath));
  const testUrl = (parsedTest.DATABASE_URL || "").trim();
  if (!testUrl) {
    throw new Error("DATABASE_URL di .env.test masih kosong.");
  }

  if (fs.existsSync(devEnvPath)) {
    const parsedDev = dotenv.parse(fs.readFileSync(devEnvPath));
    const devUrl = (parsedDev.DATABASE_URL || "").trim();
    if (devUrl && devUrl === testUrl) {
      throw new Error(
        "DIBLOKIR: DATABASE_URL di .env.test identik dengan .env dev. Gunakan database terpisah untuk menjaga keamanan data dev."
      );
    }
  }

  return testUrl;
}

const testDbUrl = loadIsolatedTestDatabaseUrl();
console.log("Mendorong schema Prisma ke database test...");
execSync("pnpm exec prisma db push --accept-data-loss", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDbUrl,
  },
});
