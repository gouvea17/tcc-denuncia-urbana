const express = require('express');
const router = express.Router();
const db = require('../db');

const STATUS_VALIDOS = ['pendente', 'em_andamento', 'resolvida'];

// ========== ESTATÍSTICAS PÚBLICAS REAIS (PARA LANDING E HOME) ==========
router.get('/estatisticas-publicas', async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) AS total FROM denuncias');
    const [resolvidas] = await db.query("SELECT COUNT(*) AS resolvidas FROM denuncias WHERE status = 'resolvida'");
    const [andamento] = await db.query("SELECT COUNT(*) AS andamento FROM denuncias WHERE status = 'em_andamento'");
    const [pendentes] = await db.query("SELECT COUNT(*) AS pendentes FROM denuncias WHERE status = 'pendente'");
    const [cidadaos] = await db.query('SELECT COUNT(*) AS total FROM usuarios WHERE is_admin = 0');
    const [votosTotais] = await db.query('SELECT COALESCE(SUM(votos), 0) AS total_votos FROM denuncias');

    const totalNum = total[0].total || 0;
    const resolvidasNum = resolvidas[0].resolvidas || 0;
    const taxaResolucao = totalNum > 0 ? Math.round((resolvidasNum / totalNum) * 100) : 100;

    res.json({
      success: true,
      total: totalNum,
      resolvidas: resolvidasNum,
      andamento: andamento[0].andamento || 0,
      pendentes: pendentes[0].pendentes || 0,
      cidadaos: Math.max(cidadaos[0].total || 0, 1),
      votos: votosTotais[0].total_votos || 0,
      taxa_resolucao: `${taxaResolucao}%`
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas públicas:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas do portal.' });
  }
});

// ========== LISTAR DENÚNCIAS (COM BUSCA, FILTRO E ORDENAÇÃO) ==========
router.get('/', async (req, res) => {
  try {
    const { status, tipo, busca, ordenar } = req.query;
    const usuarioLogadoId = req.session && req.session.usuario ? req.session.usuario.id : null;

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
      WHERE 1=1
    `;
    const params = [usuarioLogadoId];

    if (status && STATUS_VALIDOS.includes(status)) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    if (tipo && tipo !== 'todas') {
      query += ' AND d.tipo = ?';
      params.push(tipo);
    }

    if (busca && busca.trim() !== '') {
      const termo = `%${busca.trim()}%`;
      query += ' AND (d.titulo LIKE ? OR d.descricao LIKE ? OR d.localizacao LIKE ? OR d.bairro LIKE ? OR d.protocolo LIKE ?)';
      params.push(termo, termo, termo, termo, termo);
    }

    if (ordenar === 'votos') {
      query += ' ORDER BY d.votos DESC, d.created_at DESC';
    } else {
      query += ' ORDER BY d.created_at DESC';
    }

    const [rows] = await db.query(query, params);

    const denuncias = rows.map(d => ({
      ...d,
      ja_votei: Boolean(d.ja_votei),
      protocolo: d.protocolo || `DEN-2026-${String(d.id).padStart(4, '0')}`,
      bairro: d.bairro || 'Região Central',
      prioridade: d.prioridade || 'media'
    }));

    res.json({ success: true, denuncias, total: denuncias.length });
  } catch (error) {
    console.error('❌ Erro ao buscar denúncias:', error);
    res.status(500).json({ error: 'Erro ao buscar denúncias.' });
  }
});

// ========== BUSCAR UMA DENÚNCIA ESPECÍFICA ==========
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioLogadoId = req.session?.usuario?.id || null;

    const [rows] = await db.query(`
      SELECT 
        d.*,
        u.nome AS criador_nome,
        EXISTS(SELECT 1 FROM votos v WHERE v.denuncia_id = d.id AND v.usuario_id = ?) AS ja_votei
      FROM denuncias d
      LEFT JOIN usuarios u ON d.usuario_id = u.id
      WHERE d.id = ? OR d.protocolo = ?
    `, [usuarioLogadoId, id, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Denúncia não encontrada.' });
    }

    const d = rows[0];
    res.json({
      success: true,
      denuncia: {
        ...d,
        ja_votei: Boolean(d.ja_votei),
        protocolo: d.protocolo || `DEN-2026-${String(d.id).padStart(4, '0')}`
      }
    });
  } catch (error) {
    console.error('Erro ao buscar denúncia individual:', error);
    res.status(500).json({ error: 'Erro ao carregar detalhes da denúncia.' });
  }
});

// ========== CRIAR DENÚNCIA ==========
router.post('/', async (req, res) => {
  try {
    const { titulo, tipo, descricao, localizacao, bairro, foto_url, prioridade } = req.body;

    if (!titulo || !tipo || !descricao || !localizacao) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (título, categoria, descrição e localização).' });
    }

    const usuario = req.session && req.session.usuario;
    if (!usuario || !usuario.id) {
      return res.status(401).json({
        error: 'Você precisa estar logado para enviar uma denúncia. Faça login ou crie sua conta gratuita.'
      });
    }

    const usuarioId = usuario.id;
    // Gera protocolo cívico único oficial (ex: DEN-2026-8492)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const protocolo = `DEN-2026-${randomCode}`;

    let insertId = null;
    try {
      const [result] = await db.query(
        `INSERT INTO denuncias 
        (titulo, tipo, descricao, localizacao, bairro, foto_url, status, usuario_id, votos, protocolo, prioridade) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          titulo.trim(),
          tipo,
          descricao.trim(),
          localizacao.trim(),
          (bairro || '').trim() || null,
          foto_url || null,
          'pendente',
          usuarioId,
          0,
          protocolo,
          prioridade || 'media'
        ]
      );
      insertId = result.insertId;
    } catch (insertError) {
      console.warn('⚠️ Nota: Colunas novas ainda não criadas no HeidiSQL. Inserindo nas colunas padrão...');
      const [fallbackResult] = await db.query(
        `INSERT INTO denuncias 
        (titulo, tipo, descricao, localizacao, status, usuario_id, votos) 
        VALUES (?, ?, ?, ?, 'pendente', ?, 0)`,
        [
          titulo.trim(),
          tipo,
          descricao.trim(),
          localizacao.trim(),
          usuarioId
        ]
      );
      insertId = fallbackResult.insertId;
    }

    res.status(201).json({
      success: true,
      message: 'Denúncia registrada com sucesso!',
      id: insertId,
      protocolo: protocolo
    });
  } catch (error) {
    console.error('❌ Erro ao criar denúncia:', error);
    res.status(500).json({ error: 'Erro ao registrar denúncia no banco de dados.' });
  }
});

// ========== VOTAR / APOIAR DENÚNCIA ==========
router.post('/:id/votar', async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.session.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Faça login na plataforma para apoiar esta demanda.' });
    }

    const [jaVotou] = await db.query(
      'SELECT id FROM votos WHERE denuncia_id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (jaVotou.length > 0) {
      // Remove o voto (permitir retirar apoio)
      await db.query('DELETE FROM votos WHERE denuncia_id = ? AND usuario_id = ?', [id, usuarioId]);
      await db.query('UPDATE denuncias SET votos = GREATEST(0, votos - 1) WHERE id = ?', [id]);
      const [atualizado] = await db.query('SELECT votos FROM denuncias WHERE id = ?', [id]);
      return res.json({
        success: true,
        apoiado: false,
        message: 'Apoio removido.',
        votos: atualizado[0].votos
      });
    }

    await db.query(
      'INSERT INTO votos (denuncia_id, usuario_id) VALUES (?, ?)',
      [id, usuarioId]
    );

    await db.query('UPDATE denuncias SET votos = votos + 1 WHERE id = ?', [id]);

    const [atualizado] = await db.query('SELECT votos FROM denuncias WHERE id = ?', [id]);

    res.json({ 
      success: true, 
      apoiado: true,
      message: 'Apoio registrado com sucesso!', 
      votos: atualizado[0].votos 
    });

  } catch (error) {
    console.error('❌ Erro ao votar:', error);
    res.status(500).json({ error: 'Erro ao processar apoio.' });
  }
});

module.exports = router;