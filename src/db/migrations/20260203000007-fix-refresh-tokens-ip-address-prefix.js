'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Modifier la longueur de la colonne ip_address de 64 à 80 caractères
    // 'sha256:' (7) + hash SHA-256 (64) = 71 caractères + marge de sécurité
    await queryInterface.changeColumn('refresh_tokens', 'ip_address', {
      type: Sequelize.STRING(80),
      allowNull: true,
      comment: 'IP address hachée (format: sha256:hash) pour détecter les vols de token',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('refresh_tokens', 'ip_address', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'IP address hachée (SHA-256) pour détecter les vols de token',
    });
  },
};
