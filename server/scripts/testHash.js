import bcrypt from "bcryptjs";

const password = "Secret123";
const hash1 = await bcrypt.hash(password, 10);
const hash2 = await bcrypt.hash(password, 10);

console.log("hash1:", hash1);
console.log("hash2:", hash2);
console.log("same hash?", hash1 === hash2);
console.log("correct password:", await bcrypt.compare("Secret123", hash1));
console.log("wrong password:", await bcrypt.compare("secret123", hash1));
