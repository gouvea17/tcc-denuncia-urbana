const express = require('express');
const router = express.Router();
const db = require('../db');
const { exigirLogin } = require('../middleware/auth');

const STATUS_VALIDOS = ['pendente', 'em_andamento', 'resolvida'];

// ========== LISTAR DENÚNCIAS (com filtro opcional de status) ==========
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const usuarioLogadoId = req.session.usuario ? req.session.usuario.id : null;

    let query = `
      SELECT
        d.*,
        u.nome AS criador_nome,
        u.email AS criador_email,
        EXISTS(
          SELECT 1 FROM votos v WHERE v.denuncia_id = d.id AND v.usuario_id = ?
        ) AS ja_votei
      FROM denuncias d
      LEFT JOIN usuarios u ON d.usuario_id = u.id
    `;
    const params = [usuarioLogadoId];

    if (status && STATUS_VALIDOS.includes(status)) {
      query += ' WHERE d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC';

    const [rows] = await db.query(query, params);

    // MySQL retorna 0/1 para EXISTS; converte para boolean
    const denuncias = rows.map(d => ({ ...d, ja_votei: !!d.ja_votei }));

    res.json({ success: true, denuncias, total: denuncias.length });
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error);
    res.status(500).json({ error: 'Erro ao buscar denúncias.' });
  }
});

// ========== CRIAR DENÚNCIA (requer login) ==========
router.post('/', exigirLogin, async (req, res) => {
  try {
    const { titulo, descricao, localizacao, tipo } = req.body;

    if (!titulo || !descricao || !localizacao || !tipo) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const [result] = await db.query(
      `INSERT INTO denuncias (usuario_id, titulo, descricao, localizacao, tipo, status, votos)
       VALUES (?, ?, ?, ?, ?, 'pendente', 0)`,
      [req.session.usuario.id, titulo, descricao, localizacao, tipo]
    );

    res.status(201).json({
      success: true,
      message: 'Denúncia criada com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao criar denúncia:', error);
    res.status(500).json({ error: 'Erro ao criar denúncia.' });
  }
});

// ========== VOTAR/APOIAR DENÚNCIA (requer login, um voto por usuário) ==========
router.post('/:id/votar', exigirLogin, async (req, res) => {
  const conexao = await db.getConnection();
  try {
    const { id } = req.params;
    const usuarioId = req.session.usuario.id;

    await conexao.beginTransaction();

    const [denuncia] = await conexao.query('SELECT id FROM denuncias WHERE id = ?', [id]);
    if (denuncia.length === 0) {
      await conexao.rollback();
      return res.status(404).json({ error: 'Denúncia não encontrada.' });
    }

    const [jaVotou] = await conexao.query(
      'SELECT id FROM votos WHERE denuncia_id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
    if (jaVotou.length > 0) {
      await conexao.rollback();
      return res.status(409).json({ error: 'Você já apoiou esta denúncia.' });
    }

    await conexao.query(
      'INSERT INTO votos (denuncia_id, usuario_id) VALUES (?, ?)',
      [id, usuarioId]
    );
    await conexao.query('UPDATE denuncias SET votos = votos + 1 WHERE id = ?', [id]);

    const [atualizado] = await conexao.query('SELECT votos FROM denuncias WHERE id = ?', [id]);

    await conexao.commit();

    res.json({ success: true, message: 'Apoio registrado!', votos: atualizado[0].votos });
  } catch (error) {
    await conexao.rollback();
    console.error('Erro ao votar:', error);
    res.status(500).json({ error: 'Erro ao registrar apoio.' });
  } finally {
    conexao.release();
  }
});

// ========== ATUALIZAR STATUS (ex: marcar como resolvida) ==========
router.patch('/:id/status', exigirLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const [result] = await db.query('UPDATE denuncias SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Denúncia não encontrada.' });
    }

    res.json({ success: true, message: `Status atualizado para ${status}.` });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

module.exports = router;
