/**
 * Migration: Enrichissement de la table audit_logs
 * 
 * Ajoute des colonnes pour un système d'audit complet
 * Conforme aux normes RGPD, SOC2, ISO 27001
 * 
 * @date 2026-02-03
 */

'use strict';

module.exports = {
  /**
   * Enrichissement de la table audit_logs
   */
  async up(queryInterface, Sequelize) {
    // Vérifier si les colonnes existent déjà
    const tableDescription = await queryInterface.describeTable('audit_logs');

    // Ajouter user_id si elle n'existe pas
    if (!tableDescription.user_id) {
      await queryInterface.addColumn('audit_logs', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Identifiant de l\'utilisateur (peut être null pour actions anonymes)',
      });

      await queryInterface.addIndex('audit_logs', ['user_id'], {
        name: 'idx_audit_logs_user_id',
      });
    }

    // Renommer ipHash en ip_address si nécessaire
    if (tableDescription.ipHash && !tableDescription.ip_address) {
      await queryInterface.renameColumn('audit_logs', 'ipHash', 'ip_address');
    } else if (!tableDescription.ip_address) {
      await queryInterface.addColumn('audit_logs', 'ip_address', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Adresse IP hashée (conformité RGPD)',
      });
    }

    // Ajouter resource si elle n'existe pas
    if (!tableDescription.resource) {
      await queryInterface.addColumn('audit_logs', 'resource', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Ressource concernée (ex: users, profiles, roles)',
      });

      await queryInterface.addIndex('audit_logs', ['resource'], {
        name: 'idx_audit_logs_resource',
      });
    }

    // Ajouter resource_id si elle n'existe pas
    if (!tableDescription.resource_id) {
      await queryInterface.addColumn('audit_logs', 'resource_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Identifiant de la ressource concernée',
      });

      await queryInterface.addIndex('audit_logs', ['resource_id'], {
        name: 'idx_audit_logs_resource_id',
      });
    }

    // Renommer userAgent en user_agent si nécessaire
    if (tableDescription.userAgent && !tableDescription.user_agent) {
      await queryInterface.renameColumn('audit_logs', 'userAgent', 'user_agent');
    } else if (!tableDescription.user_agent) {
      await queryInterface.addColumn('audit_logs', 'user_agent', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User Agent du navigateur',
      });
    }

    // Ajouter severity si elle n'existe pas
    if (!tableDescription.severity) {
      await queryInterface.addColumn('audit_logs', 'severity', {
        type: Sequelize.ENUM('info', 'warning', 'error', 'critical'),
        allowNull: false,
        defaultValue: 'info',
        comment: 'Niveau de gravité de l\'événement',
      });

      await queryInterface.addIndex('audit_logs', ['severity'], {
        name: 'idx_audit_logs_severity',
      });
    }

    // Ajouter success si elle n'existe pas
    if (!tableDescription.success) {
      await queryInterface.addColumn('audit_logs', 'success', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indique si l\'action a réussi ou échoué',
      });

      await queryInterface.addIndex('audit_logs', ['success'], {
        name: 'idx_audit_logs_success',
      });
    }

    // Ajouter error_message si elle n'existe pas
    if (!tableDescription.error_message) {
      await queryInterface.addColumn('audit_logs', 'error_message', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Message d\'erreur en cas d\'échec',
      });
    }

    // Ajouter details si elle n'existe pas
    if (!tableDescription.details) {
      await queryInterface.addColumn('audit_logs', 'details', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Détails additionnels de l\'événement en JSON',
      });
    }

    // Renommer createdAt en created_at si nécessaire
    if (tableDescription.createdAt && !tableDescription.created_at) {
      await queryInterface.renameColumn('audit_logs', 'createdAt', 'created_at');
    }

    // Ajouter des indexes supplémentaires pour les nouvelles colonnes
    const indexes = [
      { name: 'idx_audit_logs_email', columns: ['email'] },
      { name: 'idx_audit_logs_action', columns: ['action'] },
      { name: 'idx_audit_logs_user_action_date', columns: ['user_id', 'action', 'created_at'] },
      { name: 'idx_audit_logs_resource_lookup', columns: ['resource', 'resource_id'] },
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('audit_logs', index.columns, {
          name: index.name,
        });
      } catch (error) {
        // Index existe déjà, ignorer l'erreur
        console.log(`Index ${index.name} existe déjà, ignoré`);
      }
    }

    // Commentaire sur la table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE audit_logs IS 'Table des logs d''audit pour la traçabilité complète. Conforme aux normes RGPD, SOC2, ISO 27001. Les adresses IP sont hashées pour la confidentialité';
    `);
  },

  /**
   * Rollback : Retirer les colonnes ajoutées
   */
  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('audit_logs');

    // Supprimer les indexes
    const indexesToDrop = [
      'idx_audit_logs_user_id',
      'idx_audit_logs_resource',
      'idx_audit_logs_resource_id',
      'idx_audit_logs_severity',
      'idx_audit_logs_success',
      'idx_audit_logs_action',
      'idx_audit_logs_user_action_date',
      'idx_audit_logs_resource_lookup',
    ];

    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.removeIndex('audit_logs', indexName);
      } catch (error) {
        // Index n'existe pas, ignorer
      }
    }

    // Supprimer les colonnes ajoutées (dans l'ordre inverse)
    if (tableDescription.details) {
      await queryInterface.removeColumn('audit_logs', 'details');
    }

    if (tableDescription.error_message) {
      await queryInterface.removeColumn('audit_logs', 'error_message');
    }

    if (tableDescription.success) {
      await queryInterface.removeColumn('audit_logs', 'success');
    }

    if (tableDescription.severity) {
      await queryInterface.removeColumn('audit_logs', 'severity');
    }

    if (tableDescription.resource_id) {
      await queryInterface.removeColumn('audit_logs', 'resource_id');
    }

    if (tableDescription.resource) {
      await queryInterface.removeColumn('audit_logs', 'resource');
    }

    if (tableDescription.user_id) {
      await queryInterface.removeColumn('audit_logs', 'user_id');
    }
  },
};
