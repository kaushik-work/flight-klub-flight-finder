// Prints the value for ADMIN_PASSWORD_HASH:  node scripts/admin-hash.mjs "the password"
import { randomBytes, scryptSync } from "node:crypto";
const pw = process.argv[2];
if (!pw) { console.error('usage: node scripts/admin-hash.mjs "password"'); process.exit(1); }
const salt = randomBytes(16).toString("hex");
console.log(`scrypt.${salt}.${scryptSync(pw, salt, 64).toString("hex")}`);
