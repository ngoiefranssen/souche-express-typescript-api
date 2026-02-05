import cron from 'node-cron';
import { cleanupExpiredTokens, cleanupOldRevokedTokens } from './jwt';
import { cleanExpiredSessions } from '../controllers/auth/auth.controller';

/**
 * Service de nettoyage automatique des tokens et sessions
 * 
 * Tâches programmées :
 * - Toutes les heures : suppression des tokens expirés
 * - Tous les jours à 2h du matin : suppression des tokens révoqués de plus de 30 jours
 * - Toutes les heures : nettoyage des sessions expirées
 */

/**
 * Nettoyer les refresh tokens expirés
 * Exécuté toutes les heures
 */
const cleanExpiredRefreshTokens = cron.schedule(
  '0 * * * *', // Chaque heure, à la minute 0
  async () => {
    try {
      await cleanupExpiredTokens();
    } catch (error) {
      console.error('[Token Cleaner] Erreur lors du nettoyage des tokens expirés:', error);
    }
  },
  {
    scheduled: false, // Ne démarre pas automatiquement
    timezone: 'Europe/Paris',
  } as any
);

/**
 * Nettoyer les vieux tokens révoqués (> 30 jours)
 * Exécuté tous les jours à 2h du matin
 */
const cleanOldRevokedRefreshTokens = cron.schedule(
  '0 2 * * *', // Tous les jours à 2h du matin
  async () => {
    try {
      await cleanupOldRevokedTokens();
    } catch (error) {
      console.error('[Token Cleaner] Erreur lors du nettoyage des vieux tokens:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Europe/Paris',
  } as any
);

/**
 * Nettoyer les sessions expirées
 * Exécuté toutes les heures
 */
const cleanExpiredUserSessions = cron.schedule(
  '0 * * * *', // Chaque heure, à la minute 0
  async () => {
    try {
      await cleanExpiredSessions();
    } catch (error) {
      console.error('[Session Cleaner] Erreur lors du nettoyage des sessions:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Europe/Paris',
  } as any
);

/**
 * Démarre tous les jobs de nettoyage automatique
 */
export function startTokenCleanupJobs(): void {
  
  cleanExpiredRefreshTokens.start();
  cleanOldRevokedRefreshTokens.start();
  cleanExpiredUserSessions.start();
}

/**
 * Arrête tous les jobs de nettoyage automatique
 */
export function stopTokenCleanupJobs(): void {
  cleanExpiredRefreshTokens.stop();
  cleanOldRevokedRefreshTokens.stop();
  cleanExpiredUserSessions.stop();
}

/**
 * Exécute manuellement tous les nettoyages
 * Utile pour les tests ou le déploiement initial
 */
export async function runManualCleanup(): Promise<{
  expiredTokens: number;
  oldRevokedTokens: number;
}> {
  
  const expiredTokens = await cleanupExpiredTokens();
  const oldRevokedTokens = await cleanupOldRevokedTokens();
  await cleanExpiredSessions();
  
  return { expiredTokens, oldRevokedTokens };
}

export default {
  startTokenCleanupJobs,
  stopTokenCleanupJobs,
  runManualCleanup,
};
