import crypto from 'crypto';
import AuditLog from '../models/audit/audit_log.model';

/**
 * Hash une adresse IP pour la conformité RGPD
 */
export function hashIp(ip: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Types d'actions auditées
 */
export enum AuditAction {
  // Authentification
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGED = 'password_changed',
  SESSION_EXPIRED = 'session_expired',
  
  // Autorisation
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ACCESS_GRANTED_OWNER = 'access_granted_owner',
  PERMISSION_CHECKED = 'permission_checked',
  
  // CRUD Utilisateurs
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_READ = 'user_read',
  
  // CRUD Rôles
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REVOKED = 'role_revoked',
  
  // CRUD Permissions
  PERMISSION_CREATED = 'permission_created',
  PERMISSION_UPDATED = 'permission_updated',
  PERMISSION_DELETED = 'permission_deleted',
  PERMISSION_ASSIGNED = 'permission_assigned',
  PERMISSION_REVOKED = 'permission_revoked',
  
  // Système
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  
  // Erreurs
  ERROR = 'error',
  SECURITY_VIOLATION = 'security_violation',
}

/**
 * Niveau de gravité de l'événement
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Structure d'un log d'audit
 */
export interface AuditLogEntry {
  userId?: number;
  action: string | AuditAction;
  resource?: string;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Enregistre un événement dans les logs d'audit
 * @param entry Entrée d'audit
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await AuditLog.create({
      userId: entry.userId || null,
      action: entry.action,
      resource: entry.resource || null,
      resourceId: entry.resourceId || null,
      details: entry.details || {},
      ipAddress: entry.ipAddress ? hashIp(entry.ipAddress) : null,
      userAgent: entry.userAgent || null,
      severity: entry.severity || AuditSeverity.INFO,
      success: entry.success !== false, // true par défaut
      errorMessage: entry.errorMessage || null,
    });
  } catch (error) {
    // Ne pas bloquer l'application si l'audit échoue
    console.error('Erreur lors de l\'enregistrement de l\'audit:', error);
  }
}

/**
 * Log une authentification réussie
 */
export async function logLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.LOGIN,
    severity: AuditSeverity.INFO,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
}

/**
 * Log une authentification échouée
 */
export async function logLoginFailed(
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    action: AuditAction.LOGIN_FAILED,
    severity: AuditSeverity.WARNING,
    ipAddress,
    userAgent,
    success: false,
    errorMessage: reason,
    details: { email, timestamp: new Date().toISOString() },
  });
}

/**
 * Log une déconnexion
 */
export async function logLogout(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.LOGOUT,
    severity: AuditSeverity.INFO,
    ipAddress,
    userAgent,
  });
}

/**
 * Log un accès refusé
 */
export async function logAccessDenied(
  userId: number,
  resource: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.ACCESS_DENIED,
    resource,
    severity: AuditSeverity.WARNING,
    ipAddress,
    success: false,
    errorMessage: reason,
    details: { reason },
  });
}

/**
 * Log une modification de données sensibles
 */
export async function logDataChange(
  userId: number,
  action: AuditAction,
  resource: string,
  resourceId: number,
  changes: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource,
    resourceId,
    severity: AuditSeverity.INFO,
    ipAddress,
    details: { changes },
  });
}

/**
 * Log une violation de sécurité
 */
export async function logSecurityViolation(
  userId: number | undefined,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.SECURITY_VIOLATION,
    severity: AuditSeverity.CRITICAL,
    ipAddress,
    userAgent,
    success: false,
    details,
  });
}

/**
 * Log une erreur système
 */
export async function logError(
  error: Error,
  userId?: number,
  resource?: string,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.ERROR,
    resource,
    severity: AuditSeverity.ERROR,
    ipAddress,
    success: false,
    errorMessage: error.message,
    details: {
      stack: error.stack,
      name: error.name,
    },
  });
}