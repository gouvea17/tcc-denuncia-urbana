// Garante que existe um usuário logado na sessão antes de continuar
function exigirLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'É necessário estar logado para fazer isso.' });
  }
  next();
}

module.exports = { exigirLogin };
