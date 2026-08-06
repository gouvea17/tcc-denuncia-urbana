const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');

const SALT_ROUNDS = 10;

// ========== CADASTRO ==========
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha precisa ter no mínimo 6 caracteres.' });
    }

    const [existentes] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const [result] = await db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );

    // Já loga o usuário automaticamente após o cadastro
    req.session.usuario = { id: result.insertId, nome, email };

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      user: { id: result.insertId, nome, email }
    });
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar. Tente novamente.' });
  }
});

// ========== LOGIN ==========
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro interno ao entrar. Tente novamente.' });
  }
});

// ========== LOGOUT ==========
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logout realizado.' });
  });
});

// ========== VERIFICAR SESSÃO ==========
router.get('/check-session', (req, res) => {
  if (req.session.usuario) {
    res.json({ loggedIn: true, user: req.session.usuario });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
