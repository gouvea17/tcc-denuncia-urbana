const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const initializeDatabase = require('./initDb');

// Importação das rotas
const authRoutes = require('./routes/auth');
const denunciaRoutes = require('./routes/denuncias');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ======= CORS DINÂMICO PARA DESENVOLVIMENTO =======
app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem origin (mobile, Postman, etc.) ou de qualquer porta local
        if (!origin) return callback(null, true);
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));

// ======= MIDDLEWARES (com suporte a upload de fotos em Base64) =======
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ======= SESSÃO =======
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_secreta_tcc_denuncia_urbana',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,   // true apenas se usar HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    }
}));

// ======= ARQUIVOS ESTÁTICOS (frontend) =======
app.use(express.static(path.join(__dirname, '../frontend')));

// ======= SWAGGER =======
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/swagger.json', (req, res) => {
    res.json(swaggerSpec);
});

// ======= ROTAS =======
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', authRoutes);                 // login, registro, /me, logout
app.use('/api/denuncias', denunciaRoutes);   // denúncias públicas, fotos, estatísticas
app.use('/api/admin', adminRoutes);          // rotas administrativas do gestor

// ======= PROTEÇÃO DO PAINEL DA PREFEITURA NO SERVIDOR =======
app.get('/admin.html', (req, res, next) => {
    if (!req.session.usuario || !req.session.usuario.is_admin) {
        return res.redirect('/admin-login.html');
    }
    next();
});

// ======= ROTA DE TESTE / STATUS =======
app.get('/teste', (req, res) => {
    res.json({
        status: 'online',
        mensagem: 'Backend do Denúncias Urbanas está funcionando!',
        usuario_sessao: req.session.usuario ? req.session.usuario.email : null
    });
});

// Redirecionamento da raiz para index.html do frontend se acessado via backend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

initializeDatabase();

// ======= INICIAR SERVIDOR =======
app.listen(port, 'localhost', () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});