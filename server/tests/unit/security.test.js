import { test } from "node:test";
import assert from "node:assert/strict";
import { PASSWORD_RULE } from "../../services/authService.js";
import { generateTempPassword } from "../../utils/generateTempPassword.js";
import { generateBookingReference } from "../../utils/bookingReference.js";
import { looksLikeImage } from "../../services/adminService.js";

test("password rule needs 8 to 72 characters with a letter, a number, and a symbol", () => {
  for (const ok of ["Secret#123", "a1!aaaaa", "A1#" + "x".repeat(69)]) {
    assert.equal(PASSWORD_RULE.test(ok), true, `should accept ${ok.slice(0, 12)}`);
  }
  const bad = ["secret123", "Secret#abc", "12345678#", "Sec#1", "A1#" + "x".repeat(70)];
  for (const value of bad) {
    assert.equal(PASSWORD_RULE.test(value), false, `should reject ${value.slice(0, 12)}`);
  }
});

test("generated temporary passwords always pass the password rule", () => {
  for (let i = 0; i < 300; i++) {
    const pw = generateTempPassword();
    assert.equal(pw.length, 14);
    assert.match(pw, PASSWORD_RULE);
    assert.doesNotMatch(pw, /[01lIOo]/, "ambiguous characters must be excluded");
  }
});

test("temporary passwords are not repeated", () => {
  const set = new Set(Array.from({ length: 500 }, () => generateTempPassword()));
  assert.equal(set.size, 500);
});

test("booking references have the right shape and don't repeat", () => {
  const refs = Array.from({ length: 1000 }, () => generateBookingReference());
  refs.forEach((r) => assert.match(r, /^HMS-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/));
  assert.equal(new Set(refs).size, 1000);
});

test("looksLikeImage checks the file's real bytes, not its name or MIME type", () => {
  const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)]);

  assert.equal(looksLikeImage(pad([0xff, 0xd8, 0xff])), true);                                   // JPEG
  assert.equal(looksLikeImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);     // PNG
  assert.equal(looksLikeImage(webp), true);                                                       // WebP
  assert.equal(looksLikeImage(Buffer.from("just text pretending to be a photo")), false);
  assert.equal(looksLikeImage(Buffer.alloc(5)), false);
});