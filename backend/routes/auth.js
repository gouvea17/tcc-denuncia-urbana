const express = require('express');
const bcrypt = require('bcryptjs');  // 👈 Use bcryptjs, não bcrypt
const router = express.Router();
const db = require('../db');

const SALT_ROUNDS = 10;

// ======= CADASTRO =========
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        console.log('📝 Dados recebidos:', { nome, email, senha: '***' });

        // 1. Validar nome
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        // 2. Validar email
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'E-mail inválido.' });
        }

        // 3. Validar senha (mínimo 6 caracteres)
        if (!senha || senha.length < 6) {
            return res.status(400).json({ error: 'A senha precisa ter no mínimo 6 caracteres.' });
        }

        // 4. Verificar se o email já existe
        const [existentes] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existentes.length > 0) {
            return res.status(400).json({ error: 'Já existe uma conta com esse e-mail.' });
        }

        // 5. Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        // 6. Inserir no banco de dados
        const [result] = await db.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, senhaHash]
        );

        console.log('✅ Usuário cadastrado com sucesso! ID:', result.insertId);

        // 7. Criar sessão (logar automaticamente)
        req.session.usuario = {
            id: result.insertId,
            nome,
            email
        };

        // 8. Retornar sucesso
        res.status(201).json({
            success: true,
            message: 'Cadastro realizado com sucesso!',
            user: { id: result.insertId, nome, email }
        });

    } catch (error) {
        console.error('❌ Erro ao cadastrar:', error);
        res.status(500).json({ 
            error: 'Erro interno ao cadastrar. Tente novamente.' 
        });
    }
});

// ======= LOGIN =========
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validar email
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'E-mail inválido.' });
        }

        // Validar senha
        if (!senha || senha.length < 6) {
            return res.status(400).json({ error: 'Senha inválida.' });
        }

        // Buscar usuário no banco
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }

        const usuario = usuarios[0];

        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }

        // Criar sessão
        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
        };

        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            user: { id: usuario.id, nome: usuario.nome, email: usuario.email }
        });

    } catch (error) {
        console.error('❌ Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro interno ao fazer login.' });
    }
});

// ======= LOGOUT =========
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao fazer logout.' });
        }
        res.json({ success: true, message: 'Logout realizado com sucesso!' });
    });
});

// ======= VERIFICAR SESSÃO =========
router.get('/session', (req, res) => {
    if (req.session.usuario) {
        res.json({ 
            loggedIn: true, 
            user: req.session.usuario 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;