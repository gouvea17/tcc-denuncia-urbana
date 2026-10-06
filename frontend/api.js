/**
 * DENÚNCIAS URBANAS - Cliente de API Unificado
 * Garante compatibilidade entre Live Server (5500) e Express (3000)
 */

const API_BASE = (function() {
    // Se estiver rodando no mesmo host/porta do backend
    if (window.location.port === '3000' || (window.location.origin.includes('localhost:3000') || window.location.origin.includes('127.0.0.1:3000'))) {
        return '/api';
    }
    // Se estiver no Live Server (5500) ou qualquer outra porta
    return 'http://localhost:3000/api';
})();

async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const defaultHeaders = {
        'Accept': 'application/json'
    };

    if (options.body && !(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const config = {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Sempre envia cookies de sessão
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Falha na requisição API:', error);
        
        let msg = 'Não foi possível conectar ao servidor backend (http://localhost:3000).';
        if (error.name === 'AbortError') {
            msg = 'Tempo limite esgotado ao tentar conectar ao servidor. Verifique se o backend está rodando no terminal com "npm start".';
        } else if (window.location.protocol === 'file:') {
            msg = 'Atenção: Você abriu o arquivo HTML direto com dois cliques (file://). Abra pelo navegador em http://localhost:3000 ou pelo Live Server.';
        }

        return { 
            ok: false, 
            status: 0, 
            data: { error: msg } 
        };
    }
}

// Obter usuário logado local ou verificar no servidor
function getUsuarioLogado() {
    try {
        const str = localStorage.getItem('usuario');
        if (!str || str === 'undefined' || str === 'null') return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function salvarUsuarioLogado(usuario) {
    if (!usuario) {
        localStorage.removeItem('usuario');
    } else {
        localStorage.setItem('usuario', JSON.stringify(usuario));
    }
}

async function sincronizarSessao() {
    const res = await apiFetch('/me');
    if (res.ok && res.data.autenticado) {
        salvarUsuarioLogado(res.data.usuario);
        return res.data.usuario;
    }
    return getUsuarioLogado();
}

async function logout(redirectTo = 'login.html') {
    await apiFetch('/logout', { method: 'POST' });
    salvarUsuarioLogado(null);
    window.location.href = redirectTo;
}

// Helpers de formatação
function formatarData(dataStr) {
    if (!dataStr) return '—';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatarDataHora(dataStr) {
    if (!dataStr) return '—';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
