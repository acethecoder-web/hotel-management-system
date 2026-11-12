const required = [
  "MONGODB_URI", "JWT_SECRET", "CLIENT_URL",
  "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
  "PAYPAL_CLIENT_ID" , "PAYPAL_CLIENT_SECRET",
];

const problems = [];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) problems.push(`Missing variables: ${missing.join(", ")}`);

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  problems.push("JWT_SECRET must be at least 32 characters");
}

const clientUrl = process.env.CLIENT_URL || "";
if (clientUrl.endsWith("/")) problems.push("CLIENT_URL must not end with a slash");
if (process.env.NODE_ENV === "production" && clientUrl && !clientUrl.startsWith("https://")) {
  problems.push("CLIENT_URL must start with https:// in production");
}

try {
  new Intl.DateTimeFormat("en-CA", { timeZone: process.env.HOTEL_TIME_ZONE || "Asia/Manila" });
} catch {
  problems.push("HOTEL_TIME_ZONE is not a valid time zone");
}

if (problems.length) {
  console.error("Invalid configuration:\n - " + problems.join("\n - "));
  process.exit(1);
}