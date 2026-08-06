const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const denunciasRoutes = require('./routes/denuncias');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middlewares básicos =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Sessão (usada para saber quem está logado) =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'troque_essa_chave_no_env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true apenas se estiver rodando com HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// ===== Arquivos estáticos do frontend =====
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== Rotas da API =====
app.use('/api', authRoutes);
app.use('/api/denuncias', denunciasRoutes);

// Teste rápido para saber se o backend está de pé
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando! 🚀' });
});

// 404 para rotas de API que não existem
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
