function isAdmin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'Faça login primeiro.' });
    }
    if (!req.session.usuario.is_admin) {
        return res.status(403).json({ error: 'Acesso negado. Você não é administrador.' });
    }
    next();
}

module.exports = isAdmin;