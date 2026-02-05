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
    console.log('🌱 Démarrage du seed de l\'utilisateur admin...\n');

    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');

    // 1. Vérifier/Créer le statut d'emploi "Actif"
    console.log('📝 Vérification du statut d\'emploi...');
    const [employmentStatus] = await EmploymentStatusModel.findOrCreate({
      where: { label: 'Actif' },
      defaults: {
        label: 'Actif',
        description: 'Employé actif',
      },
    });
    console.log(`   ✓ Statut d'emploi: ${employmentStatus.label} (ID: ${employmentStatus.id})\n`);

    // 2. Vérifier/Créer le rôle "Super Admin"
    console.log('👑 Vérification du rôle Super Admin...');
    const [superAdminRole] = await RoleModel.findOrCreate({
      where: { label: 'Super Admin' },
      defaults: {
        label: 'Super Admin',
        description: 'Accès complet au système - Administrateur suprême',
      },
    });
    console.log(`   ✓ Rôle: ${superAdminRole.label} (ID: ${superAdminRole.id})\n`);

    // 3. Vérifier/Créer le profil "Profil Super Admin"
    console.log('👤 Vérification du profil Super Admin...');
    const [adminProfile] = await ProfileModel.findOrCreate({
      where: { label: 'Profil Super Admin' },
      defaults: {
        label: 'Profil Super Admin',
        description: 'Profil avec tous les droits d\'administration',
      },
    });
    console.log(`   ✓ Profil: ${adminProfile.label} (ID: ${adminProfile.id})\n`);

    // 4. Associer le rôle au profil
    console.log('🔗 Association rôle-profil...');
    try {
      await sequelize.query(`
        INSERT INTO profile_roles (profile_id, role_id, created_at, updated_at)
        VALUES (${adminProfile.id}, ${superAdminRole.id}, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
      console.log('   ✓ Association créée');
    } catch (error) {
      console.log('   ↻ Association déjà existante');
    }
    console.log('');

    // 5. Vérifier/Créer l'utilisateur admin
    console.log('🔐 Création de l\'utilisateur admin...');
    const existingAdmin = await UserModel.findOne({
      where: { email: 'admin07@admin.com' },
    });

    if (existingAdmin) {
      console.log('   ↻ L\'utilisateur admin existe déjà');
      console.log(`      Email: ${existingAdmin.email}`);
      console.log(`      Username: ${existingAdmin.username}`);
    } else {
      const adminUser = await UserModel.create({
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

      console.log('   ✓ Utilisateur admin créé avec succès !');
      console.log(`      ID: ${adminUser.id}`);
      console.log(`      Email: ${adminUser.email}`);
      console.log(`      Username: ${adminUser.username}`);
      console.log(`      Mot de passe: Admin@123`);
      console.log(`      Profil: ${adminProfile.label}`);
      console.log(`      Rôle: ${superAdminRole.label}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED TERMINÉ AVEC SUCCÈS !');
    console.log('='.repeat(60));
    console.log('\n📋 INFORMATIONS DE CONNEXION :');
    console.log('   Email    : admin07@admin.com');
    console.log('   Mot de passe : Admin@123');
    console.log('\n⚠️  IMPORTANT : Changez ce mot de passe après la première connexion !');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed de l\'utilisateur admin:', error);
    process.exit(1);
  }
}

// Exécuter le seed
seedAdminUser();
