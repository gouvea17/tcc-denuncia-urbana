const express = require('express');
let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch (e) {
    bcrypt = require('bcrypt');
}
const router = express.Router();
const db = require('../db');

const SALT_ROUNDS = 10;

// ===== VERIFICAR SESSÃO ATIVA (/api/me) =====
router.get('/me', (req, res) => {
    if (req.session && req.session.usuario) {
        return res.json({
            autenticado: true,
            usuario: req.session.usuario,
            user: req.session.usuario
        });
    }
    return res.status(401).json({
        autenticado: false,
        error: 'Nenhuma sessão ativa.'
    });
});




// ===== LOGIN GERAL / CIDADÃO =====
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        console.log(`📥 Recebida requisição de login para: ${email}`);

        if (!email || !senha) {
            return res.status(400).json({ error: 'Preencha e-mail e senha.' });
        }

        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
        if (rows.length === 0) {
            console.log(`❌ Usuário não encontrado no banco: ${email}`);
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        const usuario = rows[0];
        let senhaValida = false;

        try {
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } catch (errBcrypt) {
            // Se a senha no banco não for hash bcrypt (ex: inserida direto no HeidiSQL)
            senhaValida = (senha === usuario.senha);
        }

        if (!senhaValida && senha === usuario.senha) {
            senhaValida = true;
        }

        if (!senhaValida) {
            console.log(`❌ Senha incorreta para o usuário: ${email}`);
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // Salva na sessão
        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            is_admin: Number(usuario.is_admin || 0)
        };

        console.log(`✅ Login com sucesso: ${usuario.nome} (${usuario.email}) - Admin: ${usuario.is_admin}`);

        res.json({
            success: true,
            message: 'Login realizado com sucesso.',
            usuario: req.session.usuario,
            user: req.session.usuario
        });
    } catch (error) {
        console.error('❌ Erro interno no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao autenticar.' });
    }
});

// ===== LOGIN EXCLUSIVO PARA ADMINISTRADORES / GESTORES =====
router.post('/admin/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        console.log(`🏛️ Recebida requisição de login ADMINISTRATIVO para: ${email}`);

        if (!email || !senha) {
            return res.status(400).json({ error: 'Preencha e-mail e senha funcionais de administrador.' });
        }

        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
        if (rows.length === 0) {
            console.log(`❌ Administrador não encontrado: ${email}`);
            return res.status(401).json({ error: 'Credenciais de administrador não encontradas.' });
        }

        const usuario = rows[0];
        let senhaValida = false;

        try {
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } catch (e) {
            senhaValida = (senha === usuario.senha);
        }

        if (!senhaValida && senha === usuario.senha) {
            senhaValida = true;
        }

        if (!senhaValida) {
            console.log(`❌ Senha incorreta para o administrador: ${email}`);
            return res.status(401).json({ error: 'Senha incorreta para acesso administrativo.' });
        }

        if (!usuario.is_admin) {
            console.log(`🚫 Usuário não possui is_admin=1: ${email}`);
            return res.status(403).json({
                error: 'Acesso negado: este e-mail pertence a um cidadão sem perfil de Administrador Municipal.'
            });
        }

        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            is_admin: 1
        };

        console.log(`✅ Login ADMINISTRATIVO autorizado: ${usuario.nome} (${usuario.email})`);

        res.json({
            success: true,
            message: 'Acesso administrativo autorizado.',
            usuario: req.session.usuario,
            user: req.session.usuario
        });
    } catch (error) {
        console.error('Erro no login admin:', error);
        res.status(500).json({ error: 'Erro interno ao realizar login administrativo.' });
    }
});

// ===== LOGOUT =====
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao encerrar sessão no servidor.' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Sessão finalizada com sucesso.' });
    });
});

// ===== CADASTRO DE NOVO CIDADÃO =====
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'O nome completo é obrigatório.' });
        }
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Informe um e-mail válido.' });
        }
        if (!senha || senha.length < 6) {
            return res.status(400).json({ error: 'A senha precisa ter no mínimo 6 caracteres.' });
        }

        const emailFormatado = email.trim().toLowerCase();

        const [existentes] = await db.query('SELECT id FROM usuarios WHERE email = ?', [emailFormatado]);
        if (existentes.length > 0) {
            return res.status(400).json({ error: 'Já existe uma conta registrada com este e-mail.' });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
        const [result] = await db.query(
            'INSERT INTO usuarios (nome, email, senha, is_admin) VALUES (?, ?, ?, 0)',
            [nome.trim(), emailFormatado, senhaHash]
        );

        // Auto-login após cadastro: cria sessão imediatamente
        const novoUsuario = {
            id: result.insertId,
            nome: nome.trim(),
            email: emailFormatado,
            is_admin: 0
        };

        req.session.usuario = novoUsuario;

        res.status(201).json({
            success: true,
            message: 'Cadastro realizado com sucesso! Você já está conectado.',
            usuario: novoUsuario,
            user: novoUsuario
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' });
    }
});

module.exports = router;