# 📚 Guide des Migrations de Base de Données

## 🎯 Vue d'ensemble

Ce projet utilise **Sequelize** pour gérer les migrations de base de données. Les migrations permettent de versionner et de gérer les changements de schéma de base de données de manière contrôlée et réversible.

---

## 🏗️ Migrations Créées

### 1. **20260203000001-create-permissions-table.js**
**Objectif:** Création de la table `permissions` pour le système RBAC + ABAC

**Structure:**
- `id` - Identifiant unique auto-incrémenté
- `name` - Nom unique de la permission (format: "resource:action")
- `resource` - Ressource concernée (users, profiles, roles, etc.)
- `action` - Action autorisée (read, create, update, delete, *, execute, manage)
- `description` - Description de la permission
- `category` - Catégorie pour l'organisation
- `priority` - Niveau de priorité (0-100)
- `is_system` - Indique si la permission est système (non supprimable)
- `conditions` - Conditions ABAC en JSON
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**Indexes créés:**
- `idx_permissions_name` (unique)
- `idx_permissions_resource`
- `idx_permissions_action`
- `idx_permissions_category`
- `idx_permissions_is_system`
- `idx_permissions_resource_action` (composite)

**Normes:** ISO/IEC 10181-3 (RBAC), NIST SP 800-162 (ABAC)

---

### 2. **20260203000002-create-role-permissions-table.js**
**Objectif:** Création de la table de liaison `role_permissions`

**Structure:**
- `role_id` - Clé étrangère vers `roles` (clé primaire composite)
- `permission_id` - Clé étrangère vers `permissions` (clé primaire composite)
- `override_conditions` - Conditions ABAC personnalisées
- `is_active` - Indique si la permission est active
- `expires_at` - Date d'expiration optionnelle
- `created_at`, `updated_at` - Timestamps

**Indexes créés:**
- `idx_role_permissions_role_id`
- `idx_role_permissions_permission_id`
- `idx_role_permissions_is_active`
- `idx_role_permissions_expires_at`
- `idx_role_permissions_lookup` (composite: role_id + permission_id + is_active)

**Contraintes:**
- CASCADE sur UPDATE et DELETE pour maintenir l'intégrité référentielle

---

### 3. **20260203000003-enhance-audit-logs-table.js**
**Objectif:** Enrichir la table `audit_logs` existante

**Colonnes ajoutées/modifiées:**
- `user_id` - Clé étrangère vers `users`
- `ip_address` - Adresse IP hashée (RGPD compliant)
- `resource` - Ressource concernée
- `resource_id` - ID de la ressource
- `user_agent` - User Agent du navigateur
- `severity` - Niveau de gravité (info, warning, error, critical)
- `success` - Indique si l'action a réussi
- `error_message` - Message d'erreur en cas d'échec
- `details` - Détails additionnels en JSON

**Indexes créés:**
- `idx_audit_logs_user_id`
- `idx_audit_logs_resource`
- `idx_audit_logs_resource_id`
- `idx_audit_logs_severity`
- `idx_audit_logs_success`
- `idx_audit_logs_action`
- `idx_audit_logs_user_action_date` (composite)
- `idx_audit_logs_resource_lookup` (composite)

**Normes:** RGPD, SOC2, ISO 27001

---

## 🚀 Commandes de Migration

### Exécuter les migrations

```bash
# Appliquer toutes les migrations en attente
npx sequelize-cli db:migrate

# Ou utiliser le script npm
npm run db:migrate
```

**Résultat attendu:**
```
Sequelize CLI [Node: 18.x.x]

Loaded configuration file "src/db/config/database.js".
Using environment "development".
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

---

### Annuler la dernière migration

```bash
# Annuler la dernière migration
npx sequelize-cli db:migrate:undo

# Ou utiliser le script npm
npm run db:migrate:undo
```

---

### Annuler toutes les migrations

```bash
# ATTENTION : Ceci supprimera toutes les tables créées par les migrations
npx sequelize-cli db:migrate:undo:all
```

---

### Vérifier le statut des migrations

```bash
# Voir quelles migrations ont été appliquées
npx sequelize-cli db:migrate:status
```

---

## 📋 Ordre d'Exécution

**IMPORTANT:** Les migrations doivent être exécutées dans cet ordre :

1. ✅ `20260203000001-create-permissions-table.js` (créer la table permissions d'abord)
2. ✅ `20260203000002-create-role-permissions-table.js` (créer la liaison avec permissions)
3. ✅ `20260203000003-enhance-audit-logs-table.js` (enrichir audit_logs avec les nouvelles fonctionnalités)

L'ordre est important car `role_permissions` a une contrainte de clé étrangère vers `permissions`.

---

## 🔄 Workflow Complet d'Installation

### Nouvelle Installation

```bash
# 1. Cloner le projet et installer les dépendances
npm install

# 2. Configurer le fichier .env
cp .env.example .env
# Éditer .env avec vos paramètres de base de données

# 3. Créer la base de données (si elle n'existe pas)
createdb votre_nom_de_base

# 4. Exécuter les migrations
npm run db:migrate

# 5. Initialiser les permissions système
npm run seed:permissions

# 6. Démarrer l'application
npm run dev
```

---

### Mise à jour d'un projet existant

```bash
# 1. Pull les dernières modifications
git pull

# 2. Installer les nouvelles dépendances (si nécessaire)
npm install

# 3. Exécuter les nouvelles migrations
npm run db:migrate

# 4. Mettre à jour les permissions système
npm run seed:permissions

# 5. Redémarrer l'application
npm run dev
```

---

## 🛠️ Création de Nouvelles Migrations

### Générer une migration vide

```bash
# Créer une nouvelle migration
npx sequelize-cli migration:generate --name nom-de-votre-migration
```

### Template de migration

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Code pour appliquer la migration
    await queryInterface.createTable('ma_table', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // ... autres colonnes
    });
  },

  async down(queryInterface, Sequelize) {
    // Code pour annuler la migration
    await queryInterface.dropTable('ma_table');
  },
};
```

---

## 🎯 Bonnes Pratiques

### 1. **Toujours tester les migrations**
```bash
# Sur une base de test
NODE_ENV=test npm run db:migrate

# Tester le rollback
NODE_ENV=test npm run db:migrate:undo
```

### 2. **Nommer les migrations de manière descriptive**
```
YYYYMMDDHHMMSS-description-de-la-migration.js
20260203000001-create-permissions-table.js ✅
migration.js ❌
```

### 3. **Toujours implémenter le `down()`**
Chaque migration doit pouvoir être annulée proprement.

### 4. **Utiliser des transactions**
```javascript
async up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.createTable('table1', {...}, { transaction });
    await queryInterface.createTable('table2', {...}, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### 5. **Ajouter des commentaires SQL**
```javascript
await queryInterface.sequelize.query(`
  COMMENT ON TABLE ma_table IS 'Description de la table';
  COMMENT ON COLUMN ma_table.colonne IS 'Description de la colonne';
`);
```

### 6. **Créer des indexes pour les performances**
```javascript
await queryInterface.addIndex('ma_table', ['colonne1', 'colonne2'], {
  name: 'idx_ma_table_colonnes',
  type: 'BTREE',
});
```

---

## 🔒 Sécurité et Conformité

### RGPD
- ✅ Les adresses IP sont hashées dans `audit_logs`
- ✅ Support du soft delete avec `deleted_at`
- ✅ Traçabilité complète des accès

### ISO 27001
- ✅ Audit trail complet
- ✅ Gestion des permissions granulaires
- ✅ Historique des modifications

### SOC2
- ✅ Logs d'audit détaillés
- ✅ Traçabilité des accès
- ✅ Gestion des niveaux de gravité

---

## 🐛 Dépannage

### Erreur: "relation already exists"
**Cause:** La table existe déjà dans la base de données.

**Solution:**
```bash
# Vérifier le statut
npx sequelize-cli db:migrate:status

# Si la migration n'est pas enregistrée, l'ajouter manuellement
INSERT INTO "SequelizeMeta" (name) VALUES ('20260203000001-create-permissions-table.js');
```

---

### Erreur: "column already exists"
**Cause:** La colonne existe déjà (migration partielle).

**Solution:** La migration `enhance-audit-logs-table` vérifie automatiquement l'existence des colonnes avant de les créer.

---

### Erreur: "foreign key constraint fails"
**Cause:** L'ordre des migrations n'est pas respecté.

**Solution:**
```bash
# Annuler toutes les migrations
npm run db:migrate:undo:all

# Réappliquer dans le bon ordre
npm run db:migrate
```

---

## 📊 Vérification Post-Migration

### Vérifier les tables créées

```sql
-- Lister toutes les tables
\dt

-- Vérifier la structure de permissions
\d permissions

-- Vérifier la structure de role_permissions
\d role_permissions

-- Vérifier les indexes
\di
```

### Compter les enregistrements

```sql
SELECT COUNT(*) FROM permissions;
SELECT COUNT(*) FROM role_permissions;
SELECT COUNT(*) FROM audit_logs;
```

---

## 📞 Support

Pour toute question sur les migrations :
1. Consultez les commentaires dans les fichiers de migration
2. Vérifiez les logs de Sequelize
3. Consultez la documentation : [PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)

---

**Version:** 1.0.0  
**Date:** 2026-02-03  
**Auteur:** Ngoie Kabamba Franssen
