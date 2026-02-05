# Quick Start - Système RBAC + ABAC

## Installation en 5 minutes

### 1. Prérequis

- Node.js 18+
- PostgreSQL 14+
- Les dépendances sont déjà installées

### 2. Configuration

**Créez votre fichier `.env` :**
```bash
cp .env.example .env
```

**Configurez vos variables :**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=votre_base_de_donnees
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe

# JWT
JWT_SECRET=changez-moi-en-production-utilisez-une-clé-longue-et-aléatoire
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=une-autre-clé-secrète-très-longue-et-aléatoire

# Environnement
NODE_ENV=development
PORT=7700
```

### 3. Installer les dépendances (si nécessaire)

```bash
# Installer sequelize-cli et autres dépendances
npm install
```

### 4. Exécuter les migrations

```bash
# Appliquer les migrations de base de données
npm run db:migrate
```

**Résultat attendu :**
```
Sequelize CLI [Node: 18.x.x]

== 20260203000001-create-permissions-table: migrating =======
✅ Table "permissions" créée avec succès
== 20260203000001-create-permissions-table: migrated (0.234s)

== 20260203000002-create-role-permissions-table: migrating =======
✅ Table "role_permissions" créée avec succès
== 20260203000002-create-role-permissions-table: migrated (0.156s)

== 20260203000003-enhance-audit-logs-table: migrating =======
✅ Table "audit_logs" enrichie avec succès
== 20260203000003-enhance-audit-logs-table: migrated (0.189s)
```

### 5. Initialiser les permissions système

```bash
# Créer les permissions système et rôles
npm run seed:permissions
```

**Résultat attendu :**
```
Démarrage du seed des permissions...

Connexion à la base de données établie

 Création/mise à jour des permissions...
   ✓ Créée: users:read
   ✓ Créée: users:create
   ✓ Créée: users:update
   ... (37 permissions au total)

 37 permissions créées/mises à jour

 Vérification des rôles...
   ✓ Rôle créé: Super Admin
   ✓ Rôle créé: Admin
   ✓ Rôle créé: Manager
   ✓ Rôle créé: User

✅ Rôles vérifiés

🔗 Attribution des permissions aux rôles...
   ✓ Super Admin: system:* assigné
   ✓ Admin: 11 permissions assignées
   ✓ Manager: 6 permissions assignées
   ✓ User: 2 permissions assignées

✅ Attribution des permissions terminée

🎉 Seed des permissions terminé avec succès!
```

### 6. Démarrer l'application

```bash
# Démarrer le serveur
npm run dev
```

### 7. Créer l'utilisateur admin par défaut

```bash
# Créer l'utilisateur admin avec toutes les permissions
npm run seed:admin
```

**Résultat :**
```
🎉 SEED TERMINÉ AVEC SUCCÈS !
============================================================

📋 INFORMATIONS DE CONNEXION :
   Email        : admin07@admin.com
   Mot de passe : Admin@123

⚠️  IMPORTANT : Changez ce mot de passe après la première connexion !
```

**OU créez tout d'un coup (migrations + permissions + admin) :**
```bash
npm run db:setup
```

### 8. Tester le système

#### **Login**
```bash
curl -X POST http://localhost:7700/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin07@admin.com",
    "password": "SecurePassword123"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": 1,
      "email": "admin07@admin.com",
      "username": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### **Récupérer les permissions**
```bash
# Remplacez YOUR_TOKEN par le token reçu
curl -X GET http://localhost:7700/api/v1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Tester l'accès protégé**
```bash
# Devrait fonctionner avec le token admin
curl -X GET http://localhost:7700/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎉 C'est fait !

Votre système RBAC + ABAC est maintenant opérationnel !

### Prochaines étapes

1. **Frontend** : Consultez [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) pour intégrer le système côté client
2. **Personnalisation** : Ajoutez vos propres permissions dans le fichier seed
3. **Documentation** : Lisez [PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md) pour la documentation complète

### Endpoints disponibles

| Endpoint | Méthode | Permission requise | Description |
|----------|---------|-------------------|-------------|
| `/api/v1/auth/login` | POST | - | Se connecter |
| `/api/v1/auth/logout` | POST | - | Se déconnecter |
| `/api/v1/permissions` | GET | `permissions:read` | Liste des permissions |
| `/api/v1/permissions/by-category` | GET | `permissions:read` | Permissions par catégorie |
| `/api/v1/permissions` | POST | `permissions:create` | Créer une permission |
| `/api/v1/permissions/:id` | PUT | `permissions:update` | Modifier une permission |
| `/api/v1/permissions/:id` | DELETE | `permissions:delete` | Supprimer une permission |
| `/api/v1/permissions/assign` | POST | `permissions:manage` | Assigner une permission |
| `/api/v1/permissions/revoke` | POST | `permissions:manage` | Révoquer une permission |
| `/api/v1/permissions/role/:roleId` | GET | `permissions:read` | Permissions d'un rôle |
| `/api/v1/users` | GET | `users:read` | Liste des utilisateurs |
| `/api/v1/users/:id` | GET | `users:read` | Détails utilisateur |
| `/api/v1/roles` | GET | `roles:read` | Liste des rôles |
| `/api/v1/audit` | GET | `audit:read` | Logs d'audit |

### Structure des rôles par défaut

| Rôle | Permissions | Description |
|------|-------------|-------------|
| **Super Admin** | `system:*` | Accès complet au système |
| **Admin** | `users:*`, `profiles:*`, `roles:read`, `audit:read`, etc. | Administration standard |
| **Manager** | `users:read`, `users:update`, `profiles:read`, etc. | Gestion modérée |
| **User** | `users:read`, `profiles:read` | Utilisateur standard |

### Permissions disponibles

#### Catégorie : USER_MANAGEMENT
- `users:read` - Consulter les utilisateurs
- `users:create` - Créer des utilisateurs
- `users:update` - Modifier des utilisateurs
- `users:delete` - Supprimer des utilisateurs
- `users:*` - Toutes les actions sur users

#### Catégorie : PROFILE_MANAGEMENT
- `profiles:read`, `profiles:create`, `profiles:update`, `profiles:delete`, `profiles:*`

#### Catégorie : ROLE_MANAGEMENT
- `roles:read`, `roles:create`, `roles:update`, `roles:delete`, `roles:*`

#### Catégorie : PERMISSION_MANAGEMENT
- `permissions:read`, `permissions:create`, `permissions:update`, `permissions:delete`, `permissions:manage`, `permissions:*`

#### Catégorie : AUDIT
- `audit:read`, `audit:*`

#### Catégorie : EMPLOYMENT
- `employment_status:read`, `employment_status:create`, `employment_status:update`, `employment_status:delete`, `employment_status:*`

#### Catégorie : SYSTEM
- `sessions:read`, `sessions:delete`, `sessions:*`
- `system:manage`, `system:*`

---

## 🆘 Besoin d'aide ?

- 📖 **Documentation complète** : [PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)
- 🎨 **Guide Frontend** : [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
- 🐛 **Dépannage** : Voir section "Troubleshooting" dans PERMISSIONS_SYSTEM.md

---

**Bon développement ! 🚀**
