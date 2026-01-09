import cron from 'node-cron';
import { Op } from 'sequelize';
import UserSession from '../models/auth/user.session.model';

export const cleanExpiredSessions = async () => {
  try {
    const now = new Date();
    const inactivityLimit = new Date(now.getTime() - 60 * 60 * 1000); // 1 heure

    const result = await UserSession.update(
      { isActive: false },
      {
        where: {
          isActive: true,
          lastActivity: {
            [Op.lt]: inactivityLimit,
          },
        },
      }
    );

    console.log(`${result[0]} session(s) expirée(s) nettoyée(s) - ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Erreur lors du nettoyage des sessions:', error);
  }
};

// Fonction pour démarrer le cron job
export const startSessionCleanupScheduler = () => {
  // Nettoyer toutes les 15 minutes
  // Format cron: '*/15 * * * *' = toutes les 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await cleanExpiredSessions();
  });

  // Exécuter immédiatement au démarrage
  cleanExpiredSessions();

  console.log('Planificateur de nettoyage des sessions démarré (cron: */15 * * * *)');
};