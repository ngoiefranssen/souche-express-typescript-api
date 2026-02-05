# 🔧 Dépannage des Migrations

## ❌ Erreur: "relation already exists" ou "index already exists"

### Cause
Les tables ont été créées automatiquement par Sequelize (via `sequelize.sync()`) avant l'exécution des migrations.

### Solution Rapide ✅

Les migrations ont été **mises à jour** pour gérer automatiquement ce cas. Elles vérifieront maintenant si les index existent avant de les créer.

**Exécutez simplement :**

```bash
npm run db:migrate
```

Les migrations s'exécuteront maintenant sans erreur, même si certaines tables/index existent déjà.

---

## 🔄 Solution Alternative : Réinitialisation Complète

Si vous souhaitez repartir de zéro :

### Option 1 : Via Sequelize CLI

```bash
# 1. Annuler toutes les migrations
npm run db:migrate:undo:all

# 2. Supprimer manuellement les tables créées par sync()
psql -d votre_base_de_donnees -c "DROP TABLE IF EXISTS permissions CASCADE;"
psql -d votre_base_de_donnees -c "DROP TABLE IF EXISTS role_permissions CASCADE;"

# 3. Réexécuter les migrations
npm run db:migrate

# 4. Initialiser les permissions
npm run seed:permissions
```

### Option 2 : Réinitialisation complète de la base

```bash
# ATTENTION : Ceci supprime TOUTES les données !

# 1. Se connecter à PostgreSQL
psql -d votre_base_de_donnees

# 2. Supprimer toutes les tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO votre_utilisateur;
GRANT ALL ON SCHEMA public TO public;
\q

# 3. Exécuter les migrations
npm run db:migrate

# 4. Initialiser les permissions
npm run seed:permissions
```

---

## 🎯 Solution Recommandée : Marquer les migrations comme effectuées

Si les tables existent déjà et sont correctes, marquez simplement les migrations comme effectuées :

```bash
# Vérifier l'état actuel
npm run db:migrate:status

# Marquer les migrations comme effectuées manuellement
psql -d votre_base_de_donnees << EOF
-- Insérer les migrations dans SequelizeMeta si elles n'existent pas
INSERT INTO "SequelizeMeta" (name) 
VALUES ('20260203000001-create-permissions-table.js')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "SequelizeMeta" (name) 
VALUES ('20260203000002-create-role-permissions-table.js')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "SequelizeMeta" (name) 
VALUES ('20260203000003-enhance-audit-logs-table.js')
ON CONFLICT (name) DO NOTHING;
EOF

# Vérifier à nouveau
npm run db:migrate:status
```

---

## 📋 Vérification de l'État des Tables

### Vérifier si les tables existent

```sql
-- Se connecter à la base
psql -d votre_base_de_donnees

-- Lister toutes les tables
\dt

-- Vérifier la structure de permissions
\d permissions

-- Vérifier la structure de role_permissions
\d role_permissions

-- Vérifier les index
\di
```

### Résultat attendu

Vous devriez voir :
- ✅ Table `permissions` avec 12 colonnes
- ✅ Table `role_permissions` avec 7 colonnes
- ✅ Table `audit_logs` enrichie avec nouvelles colonnes
- ✅ Plusieurs index (idx_permissions_*, idx_role_permissions_*, etc.)

---

## 🚨 Erreurs Courantes

### Erreur : "relation does not exist"

**Cause :** Les migrations n'ont pas été exécutées.

**Solution :**
```bash
npm run db:migrate
```

---

### Erreur : "foreign key constraint fails"

**Cause :** L'ordre des migrations n'a pas été respecté ou les tables de référence n'existent pas.

**Solution :**
```bash
# Vérifier que la table 'roles' existe
psql -d votre_base -c "\dt roles"

# Si elle n'existe pas, créez-la d'abord
# Puis réexécutez les migrations
npm run db:migrate
```

---

### Erreur : "column already exists"

**Cause :** La migration enhance-audit-logs a été partiellement appliquée.

**Solution :** Les migrations vérifient maintenant l'existence des colonnes avant de les créer. Réexécutez simplement :
```bash
npm run db:migrate
```

---

## 🔍 Diagnostic Complet

### Script de diagnostic

```bash
# Créer un script de diagnostic
cat > check_db.sh << 'EOF'
#!/bin/bash

echo "=== Vérification de la base de données ==="
echo ""

# Variables (à adapter)
DB_NAME="votre_base_de_donnees"
DB_USER="votre_utilisateur"

echo "1. Tables existantes :"
psql -d $DB_NAME -U $DB_USER -c "\dt" -q

echo ""
echo "2. Structure de 'permissions' :"
psql -d $DB_NAME -U $DB_USER -c "\d permissions" -q

echo ""
echo "3. Structure de 'role_permissions' :"
psql -d $DB_NAME -U $DB_USER -c "\d role_permissions" -q

echo ""
echo "4. Index sur 'permissions' :"
psql -d $DB_NAME -U $DB_USER -c "SELECT indexname FROM pg_indexes WHERE tablename = 'permissions';" -q

echo ""
echo "5. Migrations appliquées :"
psql -d $DB_NAME -U $DB_USER -c "SELECT name FROM \"SequelizeMeta\" ORDER BY name;" -q

echo ""
echo "6. Nombre de permissions :"
psql -d $DB_NAME -U $DB_USER -c "SELECT COUNT(*) FROM permissions;" -q

echo ""
echo "=== Diagnostic terminé ==="
EOF

chmod +x check_db.sh
./check_db.sh
```

---

## ✅ Après Résolution

### Vérifier que tout fonctionne

```bash
# 1. Statut des migrations
npm run db:migrate:status

# Devrait afficher :
# up  20260203000001-create-permissions-table.js
# up  20260203000002-create-role-permissions-table.js
# up  20260203000003-enhance-audit-logs-table.js

# 2. Initialiser les permissions
npm run seed:permissions

# 3. Démarrer l'application
npm run dev

# 4. Tester l'API
curl http://localhost:7700/health
```

---

## 📞 Support

Si le problème persiste :

1. Vérifiez les logs complets dans le terminal
2. Consultez [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) pour plus de détails
3. Vérifiez votre configuration dans `.env`
4. Assurez-vous que PostgreSQL est bien démarré

---

## 🎉 Prochaines Étapes

Une fois les migrations réussies :

1. ✅ Les tables sont créées
2. ✅ Exécutez `npm run seed:permissions`
3. ✅ Démarrez l'app avec `npm run dev`
4. ✅ Consultez [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) pour l'intégration

---

**Date:** 2026-02-03  
**Auteur:** Ngoie Kabamba Franssen
