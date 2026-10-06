const db = require('./db');

let bcrypt;

try {
    bcrypt = require('bcryptjs');
} catch (e) {
    bcrypt = require('bcrypt');
}

async function initializeDatabase() {
    try {
        console.log('🔄 Sincronizando tabelas com MySQL (127.0.0.1)...');

        // ============================================================
        // 1. GARANTIR A COLUNA is_admin NA TABELA usuarios
        // ============================================================
        try {
            const [colsUsuarios] = await db.query(
                "SHOW COLUMNS FROM usuarios"
            );

            const colNamesUser = colsUsuarios.map(
                c => c.Field.toLowerCase()
            );

            if (!colNamesUser.includes('is_admin')) {
                console.log('➕ Adicionando coluna is_admin na tabela usuarios...');

                await db.query(
                    "ALTER TABLE usuarios ADD COLUMN is_admin TINYINT(1) DEFAULT 0"
                );

                console.log('✅ Coluna is_admin adicionada.');
            }
        } catch (e) {
            console.log('Nota usuarios:', e.message);
        }

        // ============================================================
        // 2. GARANTIR AS COLUNAS DA TABELA denuncias
        // ============================================================
        try {
            const [colsDenuncias] = await db.query(
                "SHOW COLUMNS FROM denuncias"
            );

            const colNamesDen = colsDenuncias.map(
                c => c.Field.toLowerCase()
            );

            if (!colNamesDen.includes('protocolo')) {
                console.log('➕ Adicionando coluna protocolo...');

                await db.query(
                    "ALTER TABLE denuncias ADD COLUMN protocolo VARCHAR(50) NULL"
                );
            }

            if (!colNamesDen.includes('bairro')) {
                console.log('➕ Adicionando coluna bairro...');

                await db.query(
                    "ALTER TABLE denuncias ADD COLUMN bairro VARCHAR(100) NULL"
                );
            }

            if (!colNamesDen.includes('foto_url')) {
                console.log('➕ Adicionando coluna foto_url...');

                await db.query(
                    "ALTER TABLE denuncias ADD COLUMN foto_url LONGTEXT NULL"
                );
            }

            if (!colNamesDen.includes('resposta_orgao')) {
                console.log('➕ Adicionando coluna resposta_orgao...');

                await db.query(
                    "ALTER TABLE denuncias ADD COLUMN resposta_orgao TEXT NULL"
                );
            }

            if (!colNamesDen.includes('prioridade')) {
                console.log('➕ Adicionando coluna prioridade...');

                await db.query(
                    "ALTER TABLE denuncias ADD COLUMN prioridade VARCHAR(20) DEFAULT 'media'"
                );
            }

        } catch (e) {
            console.log('Nota denuncias:', e.message);
        }

        // ============================================================
        // 3. GARANTIR O ADMINISTRADOR DA PREFEITURA
        // ============================================================
        try {
            const adminEmail = 'admin@prefeitura.gov.br';

            const [adminRows] = await db.query(
                "SELECT id FROM usuarios WHERE email = ?",
                [adminEmail]
            );

            // --------------------------------------------------------
            // Se o administrador NÃO existir, cria
            // --------------------------------------------------------
            if (adminRows.length === 0) {

                console.log(
                    '👤 Criando usuário da Prefeitura (admin@prefeitura.gov.br)...'
                );

                const senhaHash = await bcrypt.hash('admin123', 10);

                await db.query(
                    "INSERT INTO usuarios (nome, email, senha, is_admin) VALUES (?, ?, ?, 1)",
                    [
                        'Gestor Municipal',
                        adminEmail,
                        senhaHash
                    ]
                );

                console.log(
                    '✅ Prefeitura cadastrada: admin@prefeitura.gov.br / admin123'
                );

            // --------------------------------------------------------
            // Se já existir, atualiza senha e garante que é admin
            // --------------------------------------------------------
            } else {

                console.log(
                    '👤 Administrador já existe. Atualizando senha...'
                );

                const senhaHash = await bcrypt.hash('admin123', 10);

                await db.query(
                    "UPDATE usuarios SET senha = ?, is_admin = 1 WHERE email = ?",
                    [
                        senhaHash,
                        adminEmail
                    ]
                );

                console.log(
                    '✅ Senha do administrador atualizada para admin123'
                );
            }

        } catch (e) {
            console.log('Nota admin:', e.message);
        }

        // ============================================================
        // FINALIZAÇÃO
        // ============================================================
        console.log('✅ Banco de dados sincronizado e pronto para uso!');

    } catch (error) {
        console.error(
            '⚠️ Erro ao inicializar banco de dados:',
            error.message
        );
    }
}

module.exports = initializeDatabase;