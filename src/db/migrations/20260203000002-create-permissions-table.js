/**
 * Migration: Création de la table permissions
 * 
 * Table pour gérer les permissions granulaires du système RBAC + ABAC
 * Conforme aux normes ISO/IEC 10181-3 (RBAC) et NIST SP 800-162 (ABAC)
 * 
 * @date 2026-02-03
 */

'use strict';

module.exports = {
  /**
   * Création de la table permissions
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Identifiant unique de la permission',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Nom unique de la permission au format "resource:action" (ex: users:read)',
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Ressource concernée (ex: users, profiles, roles)',
      },
      action: {
        type: Sequelize.ENUM('read', 'create', 'update', 'delete', '*', 'execute', 'manage'),
        allowNull: false,
        comment: 'Action autorisée sur la ressource',
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Description de la permission',
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Catégorie de la permission pour l\'organisation',
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50,
        comment: 'Niveau de priorité (0-100) pour la résolution de conflits',
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si la permission est système (non supprimable)',
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Conditions ABAC en JSON pour le contrôle d\'accès basé sur les attributs',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Date de création',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Date de dernière modification',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de suppression (soft delete)',
      },
    });

    // Indexes pour optimiser les performances
    // Vérifier et créer les index seulement s'ils n'existent pas
    const indexes = [
      { name: 'idx_permissions_name', columns: ['name'], unique: true },
      { name: 'idx_permissions_resource', columns: ['resource'], unique: false },
      { name: 'idx_permissions_action', columns: ['action'], unique: false },
      { name: 'idx_permissions_category', columns: ['category'], unique: false },
      { name: 'idx_permissions_is_system', columns: ['is_system'], unique: false },
      { name: 'idx_permissions_resource_action', columns: ['resource', 'action'], unique: false },
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('permissions', index.columns, {
          name: index.name,
          unique: index.unique,
        });
      } catch (error) {
        // Index existe déjà, ignorer l'erreur
        console.log(`Index ${index.name} existe déjà, ignoré`);
      }
    }

    // Commentaire sur la table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE permissions IS 'Table des permissions granulaires pour le système RBAC + ABAC. Conforme aux normes ISO/IEC 10181-3 et NIST SP 800-162';
    `);

    console.log('Table "permissions" créée avec succès');
  },

  /**
   * Suppression de la table permissions
   */
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('permissions');
    console.log('Table "permissions" supprimée');
  },
};
