const express = require('express');
const router = express.Router();
const db = require('../db');

const STATUS_VALIDOS = ['pendente', 'em_andamento', 'resolvida'];

// ========== LISTAR DENÚNCIAS ==========
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const usuarioLogadoId = req.session.usuario ? req.session.usuario.id : null;

    let query = `
      SELECT
        d.*,
        d.criador_nome,
        d.criador_email,
        EXISTS(
          SELECT 1 FROM votos v WHERE v.denuncia_id = d.id AND v.usuario_id = ?
        ) AS ja_votei
      FROM denuncias d
    `;
    const params = [usuarioLogadoId];

    if (status && STATUS_VALIDOS.includes(status)) {
      query += ' WHERE d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC';

    const [rows] = await db.query(query, params);

    const denuncias = rows.map(d => ({ ...d, ja_votei: !!d.ja_votei }));

    res.json({ success: true, denuncias, total: denuncias.length });
  } catch (error) {
    console.error('❌ Erro ao buscar denúncias:', error);
    res.status(500).json({ error: 'Erro ao buscar denúncias.' });
  }
});

// ========== CRIAR DENÚNCIA ==========
router.post('/', async (req, res) => {
  try {
    const { titulo, tipo, descricao, localizacao } = req.body;

    if (!titulo || !tipo || !descricao || !localizacao) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    // Pega o usuário da sessão
const usuario = req.session.usuario;

// Verifica se o usuário está logado
if (!usuario || !usuario.id) {
    return res.status(401).json({ error: 'Você precisa estar logado para criar uma denúncia.' });
}

const usuarioId = usuario.id;

const result = await db.query(
    `INSERT INTO denuncias 
    (titulo, tipo, descricao, localizacao, status, usuario_id, votos) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [titulo, tipo, descricao, localizacao, 'pendente', usuarioId, 0]
);

    res.status(201).json({
      success: true,
      message: 'Denúncia criada com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('❌ Erro ao criar denúncia:', error);
    res.status(500).json({ error: 'Erro ao criar denúncia.' });
  }
});

// ========== VOTAR ==========
router.post('/:id/votar', async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.session.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Faça login para votar.' });
    }

    // Verifica se já votou
    const [jaVotou] = await db.query(
      'SELECT id FROM votos WHERE denuncia_id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (jaVotou.length > 0) {
      return res.status(409).json({ error: 'Você já apoiou esta denúncia.' });
    }

    // Registra o voto
    await db.query(
      'INSERT INTO votos (denuncia_id, usuario_id) VALUES (?, ?)',
      [id, usuarioId]
    );

    // Atualiza o contador
    await db.query('UPDATE denuncias SET votos = votos + 1 WHERE id = ?', [id]);

    // Busca o novo total
    const [atualizado] = await db.query('SELECT votos FROM denuncias WHERE id = ?', [id]);

    res.json({ 
      success: true, 
      message: 'Apoio registrado!', 
      votos: atualizado[0].votos 
    });

  } catch (error) {
    console.error('❌ Erro ao votar:', error);
    res.status(500).json({ error: 'Erro ao registrar apoio.' });
  }
});

// ========== ATUALIZAR STATUS ==========
router.patch('/:id/status', async (req, res) => {
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
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

module.exports = router;