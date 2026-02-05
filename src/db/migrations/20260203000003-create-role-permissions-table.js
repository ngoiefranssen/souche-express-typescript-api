/**
 * Migration: Création de la table role_permissions
 * 
 * Table de liaison Many-to-Many entre roles et permissions
 * Permet l'attribution de permissions aux rôles avec conditions ABAC personnalisables
 * 
 * @date 2026-02-03
 */

'use strict';

module.exports = {
  /**
   * Création de la table role_permissions
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_permissions', {
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Identifiant du rôle (clé étrangère)',
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'permissions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Identifiant de la permission (clé étrangère)',
      },
      override_conditions: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Conditions ABAC personnalisées qui remplacent celles de la permission',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indique si la permission est active pour ce rôle',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'expiration de la permission (optionnel)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Date d\'attribution de la permission au rôle',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Date de dernière modification',
      },
    });

    // Indexes pour optimiser les performances
    const indexes = [
      { name: 'idx_role_permissions_role_id', columns: ['role_id'] },
      { name: 'idx_role_permissions_permission_id', columns: ['permission_id'] },
      { name: 'idx_role_permissions_is_active', columns: ['is_active'] },
      { name: 'idx_role_permissions_expires_at', columns: ['expires_at'] },
      { name: 'idx_role_permissions_lookup', columns: ['role_id', 'permission_id', 'is_active'] },
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('role_permissions', index.columns, {
          name: index.name,
        });
      } catch (error) {
        // Index existe déjà, ignorer l'erreur
        console.log(`Index ${index.name} existe déjà, ignoré`);
      }
    }

    // Commentaire sur la table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE role_permissions IS 'Table de liaison entre rôles et permissions. Permet l''attribution granulaire des permissions aux rôles avec support ABAC personnalisé';
    `);

    console.log('Table "role_permissions" créée avec succès');
  },

  /**
   * Suppression de la table role_permissions
   */
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('role_permissions');
    console.log('Table "role_permissions" supprimée');
  },
};
