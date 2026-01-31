import crypto from 'crypto';


export function validateCsrf(req: any, token: string): boolean {
  if (!token || !req.session?.csrfSecret) return false;
  const expected = crypto
    .createHash('sha256')
    .update(req.session.csrfSecret + req.sessionID)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}