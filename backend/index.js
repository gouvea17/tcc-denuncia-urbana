const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

const authRoutes = require('./routes/auth'); // 👈 CORRIGIDO (era /routes/auth)
const denunciaRoutes = require('./routes/denuncias'); // 👈 CORRIGIDO

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ======= CORS =======
app.use(cors({
    origin: 'http://127.0.0.1:5500', // 👈 PERMITE TODAS AS ORIGENS
    credentials: true
}));

// ======= MIDDLEWARES =======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======= SESSÃO =======
app.use(session({
    secret: process.env.SESSION_SECRET || 'troque_essa_chave_no_env',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ======= ARQUIVOS ESTÁTICOS =======
app.use(express.static(path.join(__dirname, '../frontend')));

// ======= ROTAS =======
app.use('/api', authRoutes);
app.use('/api/denuncias', denunciaRoutes);

// ======= ROTA DE TESTE =======
app.get('/teste', (req, res) => {
    res.json({ mensagem: 'Backend está funcionando!' });
});

// ======= INICIAR SERVIDOR =======
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});