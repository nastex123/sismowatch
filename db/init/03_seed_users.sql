-- ==============================================================================
-- 03_seed_users.sql - Siembra de Usuarios y Roles Iniciales de Plataforma
-- ==============================================================================

-- Contraseñas hasheadas con bcrypt ($2b$12$)
-- Admin: SismoAdmin2026!
-- Viewer: SismoViewer2026!

INSERT INTO gold.users (email, password_hash, full_name, role)
VALUES 
    (
        'admin@sismowatch.internal',
        '$2b$12$R9BkR4oXG9CvTDPnmM6nPeVlr1MGezra4R7oA9DwN3KVwra7qyaoi',
        'Administrador de Operaciones SismoWatch',
        'admin'
    ),
    (
        'viewer@sismowatch.internal',
        '$2b$12$ucVCcuccUH./yPT1Dp7duerdhB2Ke2aBYmovL/fkH6A9USOSTGJJy',
        'Visualizador de Gestión de Riesgo',
        'viewer'
    )
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
