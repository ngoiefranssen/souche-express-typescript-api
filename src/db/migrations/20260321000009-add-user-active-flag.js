'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addIndex('users', ['is_active'], {
      name: 'idx_users_is_active',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_is_active');
    await queryInterface.removeColumn('users', 'is_active');
  },
};
