---
name: db
description: Designs schemas, writes migrations, maintains the data model safely. Use when the user says "update the schema", "add a column", "create a table", "write a migration", "change the data model", or needs help with indexing and seed data.
---

# Skill: db

## Purpose
Design, migrate, and maintain the data model safely. Keep the schema the single source of truth, and never lose data.

## When to trigger this skill
- User says "update the schema", "add a column", "create a table", "change the data model"
- A new feature requires new or changed database structures
- A migration needs to be written, reviewed, or run
- The data model needs documenting or reviewing
- Performance problems point to a schema or indexing issue

## Prerequisites
- Know the database engine in use: Postgres, MySQL, SQLite, MongoDB, etc.
- Know the ORM or migration tool: Prisma, Drizzle, Alembic, Flyway, raw SQL, etc.
- Never run migrations on production without running them on staging first
- Always have a backup or rollback plan before touching production

## Steps

### Adding or changing the schema

1. **Understand the change needed**
   - What new data needs to be stored, and why?
   - Which existing tables or collections are affected?
   - Will this break any existing queries or API responses?

2. **Design the change before writing migration code**
   - Name tables as plural nouns: `users`, `invoices`, `order_items`
   - Name columns as snake_case: `created_at`, `user_id`, `stripe_customer_id`
   - Every table gets: `id` (primary key), `created_at`, `updated_at`
   - Foreign keys are named `[referenced_table_singular]_id`: `user_id`, `plan_id`
   - Booleans are named as statements: `is_active`, `has_verified_email`

3. **Write the migration**

   **Prisma:**
   ```bash
   # Edit schema.prisma first, then:
   npx prisma migrate dev --name add_user_avatar
   ```

   **Drizzle:**
   ```bash
   # Edit schema file, then:
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

   **Alembic (Python):**
   ```bash
   alembic revision --autogenerate -m "add user avatar column"
   alembic upgrade head
   ```

   **Raw SQL migration file:**
   ```sql
   -- migrations/0012_add_user_avatar.sql
   -- Up
   ALTER TABLE users ADD COLUMN avatar_url TEXT;

   -- Down
   ALTER TABLE users DROP COLUMN avatar_url;
   ```

4. **Every migration must have a rollback**
   - Write the `down` migration at the same time as the `up`
   - Test the rollback works before merging
   - If a rollback is destructive (drops data), flag this explicitly

5. **Run on staging first**
   ```bash
   # Staging
   DATABASE_URL=$STAGING_DB npx prisma migrate deploy

   # Verify staging works, then:
   DATABASE_URL=$PROD_DB npx prisma migrate deploy
   ```

6. **Never edit an existing migration**
   - Once a migration has been run anywhere (staging or prod), it is frozen
   - Fix mistakes with a new migration, never by editing the old one

---

### Seeding and test data

```bash
# Prisma
npx prisma db seed

# Alembic / raw
python seed.py
```

Keep seed data in `prisma/seed.ts` or `db/seeds/`. Seeds are for:
- Local development baseline data
- Integration test fixtures
- Never for production data — use a separate data migration for that

---

### Checking the current state

```bash
# Prisma — show pending migrations
npx prisma migrate status

# Prisma — open visual DB browser
npx prisma studio

# Drizzle — show schema
npx drizzle-kit studio

# Raw SQL — describe a table
\d users         -- Postgres
DESCRIBE users;  -- MySQL
.schema users    -- SQLite
```

---

### Indexing rules

Add an index when:
- A column is frequently used in `WHERE` clauses: `WHERE user_id = ?`
- A column is used in `ORDER BY` on large tables
- A foreign key column (most ORMs don't add these automatically)

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_users_email ON users(email);
```

Do not over-index — every index slows down writes. Index after you see a slow query, not preemptively.

---

### Documenting the data model

Keep `docs/data-model.md` up to date. Update it every time a migration runs.

```markdown
## users
| Column             | Type        | Notes                        |
|--------------------|-------------|------------------------------|
| id                 | uuid        | Primary key                  |
| email              | text        | Unique, indexed              |
| hashed_password    | text        |                              |
| is_active          | boolean     | Default true                 |
| created_at         | timestamptz | Auto-set on insert           |
| updated_at         | timestamptz | Auto-set on update           |
```

---

## Rules and constraints

- **Never store money as a float** — use integer cents: `1999` = £19.99
- **Never store passwords in plain text** — store only the hash
- **Never delete columns immediately** — deprecate first, remove in a later migration after code is updated
- **Never use `SELECT *` in application code** — select only the columns you need
- **Never run `DROP TABLE` or `TRUNCATE` on production** without explicit written sign-off
- **Always back up production before a destructive migration**
- **Soft delete over hard delete** — add `deleted_at timestamptz` instead of removing rows
- **Timestamps always in UTC** — never store local time in the database
- **Enums as strings** — avoid database-level enums; use a `text` column with application-level validation so adding values doesn't require a migration

## Danger checklist — run through this before every production migration

- [ ] Does this migration have a tested rollback?
- [ ] Has it run successfully on staging?
- [ ] Is there a backup of production taken today?
- [ ] Does it lock any high-traffic tables? (ALTER TABLE on large tables can block reads)
- [ ] Are there any NOT NULL columns added to existing tables without a default? (will fail if rows exist)
- [ ] Is the deploy of the new code coordinated with the migration? (schema and code must be compatible together)

## Output format

After running a migration, report:

```
Migration complete
──────────────────
Migration:   0012_add_user_avatar
Direction:   up
Database:    staging
Duration:    0.34s
Status:      success

Changes applied:
  + users.avatar_url (TEXT, nullable)
  + idx_users_avatar_url (index)

Docs updated: docs/data-model.md
Next step:   run on production after verifying staging behaviour.
```
