'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Modifier la longueur de la colonne ip_address de 45 à 64 caractères
    // SHA-256 produit 64 caractères en hexadécimal
    await queryInterface.changeColumn('refresh_tokens', 'ip_address', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'IP address hachée (SHA-256) pour détecter les vols de token',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revenir à 45 caractères (attention: peut tronquer les données)
    await queryInterface.changeColumn('refresh_tokens', 'ip_address', {
      type: Sequelize.STRING(45),
      allowNull: true,
      comment: 'IP address hachée pour détecter les vols de token',
    });
  },
};
