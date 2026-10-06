// backend/middleware/admin.js
function isAdmin(req, res, next) {
    // Verifica se o usuário está logado
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'Faça login primeiro.' });
    }
    // Verifica se o usuário tem o campo is_admin = 1
    if (!req.session.usuario.is_admin) {
        return res.status(403).json({ error: 'Acesso negado. Você não é administrador.' });
    }
    next();
}

module.exports = isAdmin;