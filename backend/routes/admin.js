const express = require('express');
const router = express.Router();
const db = require('../db');
const isAdmin = require('../middleware/admin');

// ========== LISTAR TODAS AS DENÚNCIAS (PAINEL DO GESTOR) ==========
router.get('/denuncias', isAdmin, async (req, res) => {
    try {
        const { status, tipo, busca } = req.query;
        let query = `
            SELECT 
                d.*,
                u.nome AS criador_nome,
                u.email AS criador_email,
                u.id AS criador_id
            FROM denuncias d
            LEFT JOIN usuarios u ON d.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status && ['pendente', 'em_andamento', 'resolvida'].includes(status)) {
            query += ' AND d.status = ?';
            params.push(status);
        }

        if (tipo && tipo !== 'todas') {
            query += ' AND d.tipo = ?';
            params.push(tipo);
        }

        if (busca && busca.trim() !== '') {
            const termo = `%${busca.trim()}%`;
            query += ' AND (d.titulo LIKE ? OR d.descricao LIKE ? OR d.localizacao LIKE ? OR d.bairro LIKE ? OR d.protocolo LIKE ? OR u.nome LIKE ?)';
            params.push(termo, termo, termo, termo, termo, termo);
        }

        query += ' ORDER BY d.created_at DESC';
        const [rows] = await db.query(query, params);

        const denuncias = rows.map(d => ({
            ...d,
            protocolo: d.protocolo || `DEN-2026-${String(d.id).padStart(4, '0')}`,
            bairro: d.bairro || 'Não informado',
            resposta_orgao: d.resposta_orgao || '',
            prioridade: d.prioridade || 'media'
        }));

        res.json({ success: true, denuncias });
    } catch (error) {
        console.error('Erro admin listar denúncias:', error);
        res.status(500).json({ error: 'Erro ao listar denúncias administrativas.' });
    }
});

// ========== ATUALIZAR STATUS E PARECER TÉCNICO ==========
router.patch('/denuncias/:id/status', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resposta_orgao } = req.body;

        if (!['pendente', 'em_andamento', 'resolvida'].includes(status)) {
            return res.status(400).json({ error: 'Status selecionado é inválido.' });
        }

        let query = 'UPDATE denuncias SET status = ?';
        const params = [status];

        if (typeof resposta_orgao !== 'undefined') {
            query += ', resposta_orgao = ?';
            params.push(resposta_orgao.trim());
        }

        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await db.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Denúncia não encontrada no sistema.' });
        }

        res.json({ 
            success: true, 
            message: `Status atualizado para "${status}" com sucesso!` 
        });
    } catch (error) {
        console.error('Erro admin atualizar status:', error);
        res.status(500).json({ error: 'Erro ao salvar alterações no chamado.' });
    }
});

// ========== EXCLUIR DENÚNCIA ==========
router.delete('/denuncias/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM votos WHERE denuncia_id = ?', [id]);
        const [result] = await db.query('DELETE FROM denuncias WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Denúncia não encontrada.' });
        }
        res.json({ success: true, message: 'Denúncia excluída com sucesso.' });
    } catch (error) {
        console.error('Erro admin excluir denúncia:', error);
        res.status(500).json({ error: 'Erro ao excluir denúncia.' });
    }
});

// ========== ESTATÍSTICAS E KPIS EXECUTIVOS ==========
router.get('/estatisticas', isAdmin, async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) AS total FROM denuncias');
        const [resolvidas] = await db.query("SELECT COUNT(*) AS resolvidas FROM denuncias WHERE status = 'resolvida'");
        const [pendentes] = await db.query("SELECT COUNT(*) AS pendentes FROM denuncias WHERE status = 'pendente'");
        const [andamento] = await db.query("SELECT COUNT(*) AS andamento FROM denuncias WHERE status = 'em_andamento'");
        const [usuarios] = await db.query('SELECT COUNT(*) AS usuarios FROM usuarios WHERE is_admin = 0');
        const [votos] = await db.query('SELECT COALESCE(SUM(votos), 0) AS total_votos FROM denuncias');

        const totalNum = total[0].total || 0;
        const resolvidasNum = resolvidas[0].resolvidas || 0;
        const resolutividade = totalNum > 0 ? Math.round((resolvidasNum / totalNum) * 100) : 100;

        res.json({
            success: true,
            total: totalNum,
            resolvidas: resolvidasNum,
            pendentes: pendentes[0].pendentes || 0,
            andamento: andamento[0].andamento || 0,
            usuarios: usuarios[0].usuarios || 0,
            votos: votos[0].total_votos || 0,
            resolutividade: `${resolutividade}%`
        });
    } catch (error) {
        console.error('Erro admin estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas administrativas.' });
    }
});

module.exports = router;
