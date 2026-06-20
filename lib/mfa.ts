import * as OTPAuth from "otpauth";

export function generateMFASecret(email: string): { secret: string; uri: string } {
  // Generate a random base32 secret
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: "Tricognita",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

export function verifyMFAToken(secretBase32: string, token: string): boolean {
  if (!token || token.length !== 6) return false;
  
  const totp = new OTPAuth.TOTP({
    issuer: "Tricognita",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({
    token,
    window: 1, // Allow 1 step before/after (30s)
  });

  return delta !== null;
}
