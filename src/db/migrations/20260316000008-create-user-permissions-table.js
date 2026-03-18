/**
 * Migration: Création de la table user_permissions
 *
 * Table de liaison Many-to-Many entre users et permissions.
 * Permet d'accorder des permissions directement à un utilisateur.
 *
 * @date 2026-03-16
 */

'use strict';

module.exports = {
  /**
   * Création de la table user_permissions
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_permissions', {
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Identifiant de l’utilisateur (clé étrangère)',
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
        comment: 'Indique si la permission est active pour cet utilisateur',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d’expiration de la permission (optionnel)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    const indexes = [
      { name: 'idx_user_permissions_user_id', columns: ['user_id'] },
      { name: 'idx_user_permissions_permission_id', columns: ['permission_id'] },
      { name: 'idx_user_permissions_is_active', columns: ['is_active'] },
      { name: 'idx_user_permissions_expires_at', columns: ['expires_at'] },
      { name: 'idx_user_permissions_lookup', columns: ['user_id', 'permission_id', 'is_active'] },
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('user_permissions', index.columns, {
          name: index.name,
        });
      } catch (_error) {
        // Index déjà présent, on ignore
      }
    }

    await queryInterface.sequelize.query(`
      COMMENT ON TABLE user_permissions IS 'Table de liaison entre utilisateurs et permissions pour gérer les permissions directes par utilisateur';
    `);
  },

  /**
   * Suppression de la table user_permissions
   */
  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('user_permissions');
  },
};
