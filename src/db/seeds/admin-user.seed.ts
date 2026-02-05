/**
 * Script de seed pour créer l'utilisateur admin par défaut
 * Exécuter avec: ts-node src/db/seeds/admin-user.seed.ts
 */

import { sequelize } from '../sequelize';
import UserModel from '../../models/admin/users.model';
import ProfileModel from '../../models/admin/profil.model';
import RoleModel from '../../models/admin/role.model';
import EmploymentStatusModel from '../../models/admin/employment_status.model';

/**
 * Crée un utilisateur administrateur par défaut
 */
async function seedAdminUser() {
  try {

    await sequelize.authenticate();

    // 1. Vérifier/Créer le statut d'emploi "Actif"
    const [employmentStatus] = await EmploymentStatusModel.findOrCreate({
      where: { label: 'Actif' },
      defaults: {
        label: 'Actif',
        description: 'Employé actif',
      },
    });

    // 2. Vérifier/Créer le rôle "Super Admin"
    const [superAdminRole] = await RoleModel.findOrCreate({
      where: { label: 'Super Admin' },
      defaults: {
        label: 'Super Admin',
        description: 'Accès complet au système - Administrateur suprême',
      },
    });

    // 3. Vérifier/Créer le profil "Profil Super Admin"
    const [adminProfile] = await ProfileModel.findOrCreate({
      where: { label: 'Profil Super Admin' },
      defaults: {
        label: 'Profil Super Admin',
        description: 'Profil avec tous les droits d\'administration',
      },
    });

    // 4. Associer le rôle au profil
    try {
      await sequelize.query(`
        INSERT INTO profile_roles (profile_id, role_id, created_at, updated_at)
        VALUES (${adminProfile.id}, ${superAdminRole.id}, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
    } catch (error) {
      console.log('Association déjà existante');
    }

    // 5. Vérifier/Créer l'utilisateur admin
    const existingAdmin = await UserModel.findOne({
      where: { email: 'admin07@admin.com' },
    });

    if (existingAdmin) {
      console.log('L\'utilisateur admin existe déjà');
      console.log(`email: ${existingAdmin.email}`);
      console.log(`username: ${existingAdmin.username}`);
    } else {
      await UserModel.create({
        email: 'admin07@admin.com',
        username: 'admin',
        passwordHash: 'Admin@123', // Sera hashé automatiquement par le hook BeforeCreate
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+243 000 000 000',
        profilePhoto: null,
        salary: null,
        hireDate: new Date(),
        employment_status_id: employmentStatus.id,
        profile_id: adminProfile.id,
      });
    }

   

    process.exit(0);
  } catch (_error: unknown) {
    process.exit(1);
  }
}

// Exécuter le seed
seedAdminUser();
