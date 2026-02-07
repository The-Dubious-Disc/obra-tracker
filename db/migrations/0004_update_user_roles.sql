-- Create a new enum type with desired values
CREATE TYPE user_role_new AS ENUM ('admin', 'editor', 'viewer');

-- Update the columns to use the new type
-- We need to map old values to new values:
-- constructor -> editor
-- cliente -> viewer
-- admin -> admin

-- 1. Update 'usuarios' table
ALTER TABLE usuarios ALTER COLUMN rol DROP DEFAULT;
ALTER TABLE usuarios 
  ALTER COLUMN rol TYPE user_role_new 
  USING (
    CASE 
      WHEN rol::text = 'constructor' THEN 'editor'::user_role_new
      WHEN rol::text = 'cliente' THEN 'viewer'::user_role_new
      ELSE 'admin'::user_role_new
    END
  );
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'viewer'::user_role_new;

-- 2. Update 'invitaciones' table
ALTER TABLE invitaciones 
  ALTER COLUMN rol TYPE user_role_new 
  USING (
    CASE 
      WHEN rol::text = 'constructor' THEN 'editor'::user_role_new
      WHEN rol::text = 'cliente' THEN 'viewer'::user_role_new
      ELSE 'admin'::user_role_new
    END
  );

-- 3. Update 'proyecto_miembros' table
ALTER TABLE proyecto_miembros 
  ALTER COLUMN rol TYPE user_role_new 
  USING (
    CASE 
      WHEN rol::text = 'constructor' THEN 'editor'::user_role_new
      WHEN rol::text = 'cliente' THEN 'viewer'::user_role_new
      ELSE 'admin'::user_role_new
    END
  );

-- Drop the old enum and rename the new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;
