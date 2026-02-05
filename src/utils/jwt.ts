import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../db/config/env.config';
import RefreshTokenModel from '../models/auth/refresh_token.model';
import { hashIp } from './audit';

/**
 * Payload du JWT Access Token
 */
export interface JwtAccessPayload {
  userId: number;
  email: string;
  profileId?: number;
  type: 'access';
}

/**
 * Payload du JWT Refresh Token
 */
export interface JwtRefreshPayload {
  userId: number;
  tokenId: string; // UUID du refresh token en DB
  type: 'refresh';
}

/**
 * Informations de contexte pour créer un refresh token
 */
export interface RefreshTokenContext {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
}

/**
 * Résultat de la génération des tokens
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Génère un Access Token JWT court (15min-1h)
 */
export function generateAccessToken(payload: Omit<JwtAccessPayload, 'type'>): string {
  const fullPayload: JwtAccessPayload = {
    ...payload,
    type: 'access',
  };

  return jwt.sign(fullPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRE,
    issuer: 'souche-api',
    audience: 'souche-client',
  } as SignOptions);
}

/**
 * Génère un Refresh Token JWT et le stocke en base de données
 */
export async function generateRefreshToken(
  context: RefreshTokenContext
): Promise<{ token: string; tokenId: string }> {
  // Créer l'enregistrement en DB
  const tokenRecord = await RefreshTokenModel.create({
    user_id: context.userId,
    token_hash: '', // Sera mis à jour après génération du token
    ip_address: context.ipAddress ? hashIp(context.ipAddress) : undefined,
    user_agent: context.userAgent,
    device_type: context.deviceType || detectDeviceType(context.userAgent),
    expires_at: getRefreshTokenExpiry(),
    is_revoked: false,
    usage_count: 0,
  });

  // Créer le payload JWT
  const payload: JwtRefreshPayload = {
    userId: context.userId,
    tokenId: tokenRecord.id,
    type: 'refresh',
  };

  // Générer le token JWT
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE,
    issuer: 'souche-api',
    audience: 'souche-client',
  } as SignOptions);

  // Hasher et stocker le token en DB
  const tokenHash = hashToken(token);
  tokenRecord.token_hash = tokenHash;
  await tokenRecord.save();

  return {
    token,
    tokenId: tokenRecord.id,
  };
}

/**
 * Génère une paire complète de tokens (access + refresh)
 */
export async function generateTokenPair(
  userId: number,
  email: string,
  profileId: number | undefined,
  context: Omit<RefreshTokenContext, 'userId'>
): Promise<TokenPair> {
  const accessToken = generateAccessToken({ userId, email, profileId });
  const { token: refreshToken } = await generateRefreshToken({
    userId,
    ...context,
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: env.JWT_ACCESS_EXPIRE,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRE,
  };
}

/**
 * Vérifie et décode un Access Token
 */
export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'souche-api',
      audience: 'souche-client',
    }) as JwtAccessPayload;

    if (decoded.type !== 'access') {
      throw new Error('Token type invalide');
    }

    return decoded;
  } catch (error) {
    throw new Error('Access token invalide ou expiré');
  }
}

/**
 * Vérifie et décode un Refresh Token
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ payload: JwtRefreshPayload; tokenRecord: RefreshTokenModel }> {
  try {
    // Vérifier le JWT
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'souche-api',
      audience: 'souche-client',
    }) as JwtRefreshPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Token type invalide');
    }

    // Récupérer l'enregistrement en DB
    const tokenHash = hashToken(token);
    const tokenRecord = await RefreshTokenModel.findOne({
      where: { token_hash: tokenHash },
    });

    if (!tokenRecord) {
      throw new Error('Refresh token introuvable en base de données');
    }

    // Vérifier que le token n'est pas révoqué et n'est pas expiré
    if (!tokenRecord.isValid()) {
      throw new Error('Refresh token révoqué ou expiré');
    }

    return { payload: decoded, tokenRecord };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Refresh token invalide: ${error.message}`);
    }
    throw new Error('Refresh token invalide');
  }
}

/**
 * Révoque un refresh token spécifique
 */
export async function revokeRefreshToken(
  tokenId: string,
  reason: string = 'manual_revocation'
): Promise<void> {
  const tokenRecord = await RefreshTokenModel.findByPk(tokenId);
  if (tokenRecord) {
    await tokenRecord.revoke(reason);
  }
}

/**
 * Révoque tous les refresh tokens d'un utilisateur
 */
export async function revokeAllUserTokens(
  userId: number,
  reason: string = 'logout_all'
): Promise<void> {
  const tokens = await RefreshTokenModel.findAll({
    where: { user_id: userId, is_revoked: false },
  });

  await Promise.all(tokens.map((token) => token.revoke(reason)));
}

/**
 * Nettoie les tokens expirés (à exécuter périodiquement)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await RefreshTokenModel.destroy({
    where: {
      expires_at: { [require('sequelize').Op.lt]: new Date() },
    },
  });

  return result;
}

/**
 * Nettoie les tokens révoqués de plus de 30 jours
 */
export async function cleanupOldRevokedTokens(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await RefreshTokenModel.destroy({
    where: {
      is_revoked: true,
      revoked_at: { [require('sequelize').Op.lt]: thirtyDaysAgo },
    },
  });

  return result;
}

/**
 * Utilitaires privés
 */

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  const duration = env.JWT_REFRESH_EXPIRE;

  // Parser la durée (ex: "7d", "30d", "90d")
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) {
    // Par défaut: 7 jours
    expiry.setDate(expiry.getDate() + 7);
    return expiry;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      expiry.setDate(expiry.getDate() + value);
      break;
    case 'h':
      expiry.setHours(expiry.getHours() + value);
      break;
    case 'm':
      expiry.setMinutes(expiry.getMinutes() + value);
      break;
  }

  return expiry;
}

function detectDeviceType(userAgent?: string): string {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}
