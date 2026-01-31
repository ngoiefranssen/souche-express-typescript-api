import crypto from 'crypto';

export function hashIp(ip: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(ip).digest('hex');
}