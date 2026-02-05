'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Vérifier si la table existe déjà
    const tableExists = await queryInterface.showAllTables().then((tables) =>
      tables.includes('refresh_tokens')
    );

    if (!tableExists) {
      await queryInterface.createTable('refresh_tokens', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        token_hash: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'Hash SHA-256 du refresh token (on ne stocke jamais le token en clair)',
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
          comment: 'IP address hachée pour détecter les vols de token',
        },
        user_agent: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'User-Agent du client pour détecter les changements',
        },
        device_type: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Type d\'appareil (mobile, desktop, tablet)',
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Date d\'expiration du refresh token',
        },
        is_revoked: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Token révoqué manuellement (logout, changement password)',
        },
        revoked_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Date de révocation',
        },
        revocation_reason: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Raison de la révocation (logout, security, password_change)',
        },
        last_used_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Dernière utilisation du refresh token',
        },
        usage_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Nombre de fois que le token a été utilisé',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      });
    } else {
      console.log('Table refresh_tokens existe déjà');
    }

    // Créer les index de manière idempotente
    const indexes = [
      {
        name: 'idx_refresh_tokens_user_id',
        fields: ['user_id'],
      },
      {
        name: 'idx_refresh_tokens_token_hash',
        fields: ['token_hash'],
        unique: true,
      },
      {
        name: 'idx_refresh_tokens_expires_at',
        fields: ['expires_at'],
      },
      {
        name: 'idx_refresh_tokens_is_revoked',
        fields: ['is_revoked'],
      },
    ];

    for (const index of indexes) {
      try {
        // Vérifier si l'index existe déjà
        const existingIndexes = await queryInterface.showIndex('refresh_tokens');
        const indexExists = existingIndexes.some((idx) => idx.name === index.name);

        if (!indexExists) {
          await queryInterface.addIndex('refresh_tokens', index.fields, {
            name: index.name,
            unique: index.unique || false,
          });
        } else {
          console.log(`Index ${index.name} existe déjà`);
        }
      } catch (error) {
        console.log(`Index ${index.name} existe déjà ou erreur:`, error.message);
      }
    }

    // Ajouter un commentaire sur la table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE refresh_tokens IS 'Tokens de rafraîchissement JWT pour maintenir les sessions utilisateur de manière sécurisée';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('refresh_tokens');
    console.log('Table refresh_tokens supprimée');
  },
};
