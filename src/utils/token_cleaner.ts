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
      console.log('[Token Cleaner] 🧹 Démarrage du nettoyage des tokens expirés...');
      const deletedCount = await cleanupExpiredTokens();
      console.log(`[Token Cleaner] ✅ ${deletedCount} refresh tokens expirés supprimés`);
    } catch (error) {
      console.error('[Token Cleaner] ❌ Erreur lors du nettoyage des tokens expirés:', error);
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
      console.log('[Token Cleaner] 🧹 Démarrage du nettoyage des vieux tokens révoqués...');
      const deletedCount = await cleanupOldRevokedTokens();
      console.log(`[Token Cleaner] ✅ ${deletedCount} vieux tokens révoqués supprimés`);
    } catch (error) {
      console.error('[Token Cleaner] ❌ Erreur lors du nettoyage des vieux tokens:', error);
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
      console.log('[Session Cleaner] 🧹 Démarrage du nettoyage des sessions expirées...');
      await cleanExpiredSessions();
      console.log('[Session Cleaner] ✅ Sessions expirées nettoyées');
    } catch (error) {
      console.error('[Session Cleaner] ❌ Erreur lors du nettoyage des sessions:', error);
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
  console.log('[Token Cleaner] 🚀 Démarrage des jobs de nettoyage automatique...');
  
  cleanExpiredRefreshTokens.start();
  console.log('[Token Cleaner] ✅ Job de nettoyage des tokens expirés démarré (toutes les heures)');
  
  cleanOldRevokedRefreshTokens.start();
  console.log('[Token Cleaner] ✅ Job de nettoyage des vieux tokens révoqués démarré (tous les jours à 2h)');
  
  cleanExpiredUserSessions.start();
  console.log('[Token Cleaner] ✅ Job de nettoyage des sessions expirées démarré (toutes les heures)');
}

/**
 * Arrête tous les jobs de nettoyage automatique
 */
export function stopTokenCleanupJobs(): void {
  cleanExpiredRefreshTokens.stop();
  cleanOldRevokedRefreshTokens.stop();
  cleanExpiredUserSessions.stop();
  console.log('[Token Cleaner] 🛑 Tous les jobs de nettoyage automatique ont été arrêtés');
}

/**
 * Exécute manuellement tous les nettoyages
 * Utile pour les tests ou le déploiement initial
 */
export async function runManualCleanup(): Promise<{
  expiredTokens: number;
  oldRevokedTokens: number;
}> {
  console.log('[Token Cleaner] 🧹 Exécution manuelle du nettoyage complet...');
  
  const expiredTokens = await cleanupExpiredTokens();
  const oldRevokedTokens = await cleanupOldRevokedTokens();
  await cleanExpiredSessions();
  
  console.log(`[Token Cleaner] ✅ Nettoyage manuel terminé:
    - ${expiredTokens} tokens expirés supprimés
    - ${oldRevokedTokens} vieux tokens révoqués supprimés
    - Sessions expirées nettoyées`);
  
  return { expiredTokens, oldRevokedTokens };
}

export default {
  startTokenCleanupJobs,
  stopTokenCleanupJobs,
  runManualCleanup,
};
