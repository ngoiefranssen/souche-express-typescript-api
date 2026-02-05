# 🔄 Migrations de Base de Données - Système RBAC + ABAC

## 📖 Vue d'ensemble

Ce document résume les migrations créées pour le système de permissions RBAC + ABAC conforme aux normes internationales.

---

## ✅ Migrations Créées

### 1. **Table Permissions** (20260203000001)

Création de la table pour stocker les permissions granulaires.

**Conformité:** ISO/IEC 10181-3 (RBAC), NIST SP 800-162 (ABAC)

**Colonnes principales:**
- Format de permission: `"resource:action"` (ex: `users:read`)
- Support ABAC avec conditions JSON
- Système de priorité pour résolution de conflits
- Soft delete avec `deleted_at`

**Indexes:** 6 indexes pour optimisation des requêtes

---

### 2. **Table Role_Permissions** (20260203000002)

Table de liaison Many-to-Many entre rôles et permissions.

**Fonctionnalités:**
- Attribution de permissions aux rôles
- Conditions ABAC personnalisables par rôle
- Permissions temporaires avec expiration
- Activation/désactivation dynamique

**Contraintes:** CASCADE sur DELETE/UPDATE pour intégrité référentielle

---

### 3. **Enrichissement Audit_Logs** (20260203000003)

Amélioration de la table d'audit existante.

**Conformité:** RGPD, SOC2, ISO 27001

**Nouvelles fonctionnalités:**
- Traçabilité complète des accès
- Niveaux de gravité (info, warning, error, critical)
- Adresses IP hashées (RGPD)
- Détails JSON pour contexte enrichi

---

## 🚀 Installation Rapide

```bash
# 1. Installer sequelize-cli
npm install

# 2. Exécuter les migrations
npm run db:migrate

# 3. Initialiser les permissions
npm run seed:permissions

# 4. Démarrer l'application
npm run dev
```

---

## 📋 Commandes Disponibles

| Commande | Description |
|----------|-------------|
| `npm run db:migrate` | Appliquer toutes les migrations en attente |
| `npm run db:migrate:undo` | Annuler la dernière migration |
| `npm run db:migrate:undo:all` | Annuler toutes les migrations |
| `npm run db:migrate:status` | Voir le statut des migrations |
| `npm run db:setup` | Setup complet (migrations + permissions + admin) ⭐ |
| `npm run seed:permissions` | Initialiser les permissions système |
| `npm run seed:admin` | Créer l'utilisateur admin par défaut |
| `npm run seed:all` | Exécuter tous les seeds |

---

## 🔍 Vérification Post-Migration

### SQL

```sql
-- Vérifier les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('permissions', 'role_permissions');

-- Compter les permissions après seed
SELECT COUNT(*) FROM permissions;  -- Devrait retourner 37

-- Vérifier les rôles créés
SELECT r.label, COUNT(rp.permission_id) as permissions_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.label;
```

**Résultat attendu:**
```
    label     | permissions_count
--------------+------------------
 Super Admin  |        1
 Admin        |       11
 Manager      |        6
 User         |        2
```

---

## 📐 Architecture des Tables

```
┌─────────────────────┐
│   permissions       │
├─────────────────────┤
│ id (PK)             │◄─────┐
│ name (unique)       │      │
│ resource            │      │
│ action (enum)       │      │
│ conditions (jsonb)  │      │
│ ...                 │      │
└─────────────────────┘      │
                             │
                             │
┌─────────────────────┐      │
│   roles             │      │
├─────────────────────┤      │
│ id (PK)             │◄─┐   │
│ label               │  │   │
│ description         │  │   │
└─────────────────────┘  │   │
                         │   │
                         │   │
┌─────────────────────────────────────┐
│   role_permissions (liaison)        │
├─────────────────────────────────────┤
│ role_id (PK, FK) ──────────────────►│
│ permission_id (PK, FK) ─────────────►│
│ override_conditions (jsonb)         │
│ is_active                           │
│ expires_at                          │
└─────────────────────────────────────┘
```

---

## 🎯 Normes Respectées

### ISO/IEC 10181-3 - RBAC
✅ Séparation claire rôles/permissions  
✅ Attribution granulaire des permissions  
✅ Hiérarchie des rôles supportée  

### NIST SP 800-162 - ABAC
✅ Conditions basées sur attributs (JSONB)  
✅ Contexte utilisateur enrichi  
✅ Opérateurs de comparaison avancés  

### RGPD
✅ Hashage des IP (SHA-256)  
✅ Soft delete pour droit à l'oubli  
✅ Traçabilité complète  

### SOC2 / ISO 27001
✅ Audit trail complet  
✅ Niveaux de gravité  
✅ Historique non modifiable  

---

## 🛠️ Développement

### Créer une nouvelle migration

```bash
npx sequelize-cli migration:generate --name votre-migration
```

### Fichiers créés

```
src/db/
├── config/
│   └── database.js          # Config Sequelize CLI
├── migrations/
│   ├── 20260203000001-create-permissions-table.js
│   ├── 20260203000002-create-role-permissions-table.js
│   └── 20260203000003-enhance-audit-logs-table.js
└── seeds/
    └── permissions.seed.ts  # Seed des permissions système
```

### Configuration

```
.sequelizerc               # Configuration des chemins
```

---

## 🐛 Troubleshooting

### Erreur: "relation already exists"

```bash
# Vérifier le statut
npm run db:migrate:status

# Marquer la migration comme effectuée
psql -d votre_base -c "INSERT INTO \"SequelizeMeta\" (name) VALUES ('20260203000001-create-permissions-table.js');"
```

### Erreur: "column already exists"

Les migrations sont idempotentes et vérifient l'existence avant création.

### Erreur: "foreign key constraint"

```bash
# Réinitialiser dans le bon ordre
npm run db:migrate:undo:all
npm run db:migrate
```

---

## 📚 Documentation Complète

- **[MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md)** - Guide détaillé des migrations
- **[PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)** - Documentation technique
- **[QUICK_START.md](./QUICK_START.md)** - Installation rapide
- **[FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)** - Intégration frontend

---

## 🔐 Sécurité

### Bonnes pratiques

1. ✅ **Backup avant migration**
   ```bash
   pg_dump votre_base > backup_$(date +%Y%m%d).sql
   ```

2. ✅ **Test sur environnement de dev**
   ```bash
   NODE_ENV=development npm run db:migrate
   ```

3. ✅ **Vérifier le rollback**
   ```bash
   npm run db:migrate:undo
   npm run db:migrate
   ```

4. ✅ **Monitoring post-migration**
   ```sql
   SELECT * FROM audit_logs 
   WHERE action = 'permission_created' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## ✨ Résumé

| Aspect | Détail |
|--------|--------|
| **Migrations créées** | 3 |
| **Tables ajoutées** | 2 (permissions, role_permissions) |
| **Tables modifiées** | 1 (audit_logs) |
| **Indexes créés** | 20+ |
| **Permissions système** | 37 |
| **Rôles par défaut** | 4 |
| **Conformité** | ISO/IEC 10181-3, NIST SP 800-162, RGPD, SOC2 |

---

**Version:** 1.0.0  
**Date:** 2026-02-03  
**Auteur:** Ngoie Kabamba Franssen

---

## 📞 Support

Pour toute question :
- Consultez [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md)
- Vérifiez les logs SQL dans la console
- Utilisez `npm run db:migrate:status` pour diagnostic
