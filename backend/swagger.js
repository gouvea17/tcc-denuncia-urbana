const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'Denúncias Urbanas API',
            version: '1.0.0',
            description: 'Documentação da API do sistema Denúncias Urbanas'
        },

        servers: [
            {
                url: 'http://10.111.9.33:3000',
                description: 'Servidor na rede local'
            }
        ],

        tags: [
            {
                name: 'Autenticação',
                description: 'Login, cadastro, sessão e logout'
            },
            {
                name: 'Denúncias',
                description: 'Consulta, criação e apoio às denúncias'
            },
            {
                name: 'Administração',
                description: 'Funções administrativas do sistema'
            }
        ],

        paths: {

            // ==========================================
            // AUTENTICAÇÃO
            // ==========================================

            '/api/me': {
                get: {
                    tags: ['Autenticação'],
                    summary: 'Verifica a sessão atual',
                    responses: {
                        200: {
                            description: 'Sessão ativa'
                        },
                        401: {
                            description: 'Nenhuma sessão ativa'
                        }
                    }
                }
            },

            '/api/login': {
                post: {
                    tags: ['Autenticação'],
                    summary: 'Realiza login do cidadão',

                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'senha'],
                                    properties: {
                                        email: {
                                            type: 'string',
                                            example: 'usuario@email.com'
                                        },
                                        senha: {
                                            type: 'string',
                                            example: '123456'
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        200: {
                            description: 'Login realizado com sucesso'
                        },
                        400: {
                            description: 'Dados obrigatórios não informados'
                        },
                        401: {
                            description: 'E-mail ou senha inválidos'
                        },
                        500: {
                            description: 'Erro interno do servidor'
                        }
                    }
                }
            },

            '/api/admin/login': {
                post: {
                    tags: ['Autenticação'],
                    summary: 'Realiza login administrativo',

                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'senha'],
                                    properties: {
                                        email: {
                                            type: 'string',
                                            example: 'admin@email.com'
                                        },
                                        senha: {
                                            type: 'string',
                                            example: '123456'
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        200: {
                            description: 'Acesso administrativo autorizado'
                        },
                        400: {
                            description: 'Dados não informados'
                        },
                        401: {
                            description: 'Credenciais inválidas'
                        },
                        403: {
                            description: 'Usuário não é administrador'
                        },
                        500: {
                            description: 'Erro interno do servidor'
                        }
                    }
                }
            },

            '/api/logout': {
                post: {
                    tags: ['Autenticação'],
                    summary: 'Encerra a sessão do usuário',

                    responses: {
                        200: {
                            description: 'Sessão finalizada com sucesso'
                        },
                        500: {
                            description: 'Erro ao encerrar sessão'
                        }
                    }
                }
            },

            '/api/register': {
                post: {
                    tags: ['Autenticação'],
                    summary: 'Cadastra um novo cidadão',

                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['nome', 'email', 'senha'],
                                    properties: {
                                        nome: {
                                            type: 'string',
                                            example: 'João da Silva'
                                        },
                                        email: {
                                            type: 'string',
                                            example: 'joao@email.com'
                                        },
                                        senha: {
                                            type: 'string',
                                            example: '123456'
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        201: {
                            description: 'Cadastro realizado com sucesso'
                        },
                        400: {
                            description: 'Dados inválidos ou e-mail já cadastrado'
                        },
                        500: {
                            description: 'Erro interno do servidor'
                        }
                    }
                }
            },

            // ==========================================
            // DENÚNCIAS
            // ==========================================

            '/api/denuncias/estatisticas-publicas': {
                get: {
                    tags: ['Denúncias'],
                    summary: 'Obtém estatísticas públicas',

                    responses: {
                        200: {
                            description: 'Estatísticas obtidas com sucesso'
                        },
                        500: {
                            description: 'Erro ao obter estatísticas'
                        }
                    }
                }
            },

            '/api/denuncias': {
                get: {
                    tags: ['Denúncias'],
                    summary: 'Lista as denúncias',

                    parameters: [
                        {
                            name: 'status',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string',
                                enum: [
                                    'pendente',
                                    'em_andamento',
                                    'resolvida'
                                ]
                            },
                            description: 'Filtra pelo status'
                        },
                        {
                            name: 'tipo',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string'
                            },
                            description: 'Filtra pelo tipo'
                        },
                        {
                            name: 'busca',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string'
                            },
                            description: 'Pesquisa por título, descrição, localização, bairro ou protocolo'
                        },
                        {
                            name: 'ordenar',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string',
                                enum: ['votos']
                            },
                            description: 'Ordena pelas denúncias com mais votos'
                        }
                    ],

                    responses: {
                        200: {
                            description: 'Lista de denúncias'
                        },
                        500: {
                            description: 'Erro ao buscar denúncias'
                        }
                    }
                },

                post: {
                    tags: ['Denúncias'],
                    summary: 'Cria uma nova denúncia',

                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: [
                                        'titulo',
                                        'tipo',
                                        'descricao',
                                        'localizacao'
                                    ],
                                    properties: {
                                        titulo: {
                                            type: 'string',
                                            example: 'Buraco na rua'
                                        },
                                        tipo: {
                                            type: 'string',
                                            example: 'Infraestrutura'
                                        },
                                        descricao: {
                                            type: 'string',
                                            example: 'Existe um buraco grande na via'
                                        },
                                        localizacao: {
                                            type: 'string',
                                            example: 'Rua das Flores, 100'
                                        },
                                        bairro: {
                                            type: 'string',
                                            example: 'Centro'
                                        },
                                        foto_url: {
                                            type: 'string',
                                            example: 'https://exemplo.com/foto.jpg'
                                        },
                                        prioridade: {
                                            type: 'string',
                                            example: 'media'
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        201: {
                            description: 'Denúncia criada com sucesso'
                        },
                        400: {
                            description: 'Campos obrigatórios não preenchidos'
                        },
                        401: {
                            description: 'Usuário não está logado'
                        },
                        500: {
                            description: 'Erro ao registrar denúncia'
                        }
                    }
                }
            },

            '/api/denuncias/{id}': {
                get: {
                    tags: ['Denúncias'],
                    summary: 'Busca uma denúncia específica',

                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string'
                            },
                            description: 'ID ou protocolo da denúncia'
                        }
                    ],

                    responses: {
                        200: {
                            description: 'Denúncia encontrada'
                        },
                        404: {
                            description: 'Denúncia não encontrada'
                        },
                        500: {
                            description: 'Erro ao carregar denúncia'
                        }
                    }
                }
            },

            '/api/denuncias/{id}/votar': {
                post: {
                    tags: ['Denúncias'],
                    summary: 'Apoia ou remove o apoio de uma denúncia',

                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'integer'
                            },
                            description: 'ID da denúncia'
                        }
                    ],

                    responses: {
                        200: {
                            description: 'Apoio registrado ou removido'
                        },
                        401: {
                            description: 'Usuário não está logado'
                        },
                        500: {
                            description: 'Erro ao processar apoio'
                        }
                    }
                }
            },

            // ==========================================
            // ADMINISTRAÇÃO
            // ==========================================

            '/api/admin/denuncias': {
                get: {
                    tags: ['Administração'],
                    summary: 'Lista todas as denúncias para o gestor',

                    parameters: [
                        {
                            name: 'status',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string',
                                enum: [
                                    'pendente',
                                    'em_andamento',
                                    'resolvida'
                                ]
                            },
                            description: 'Filtra pelo status'
                        },
                        {
                            name: 'tipo',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string'
                            },
                            description: 'Filtra pelo tipo'
                        },
                        {
                            name: 'busca',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string'
                            },
                            description: 'Pesquisa nas denúncias'
                        }
                    ],

                    responses: {
                        200: {
                            description: 'Lista administrativa de denúncias'
                        },
                        500: {
                            description: 'Erro ao listar denúncias'
                        }
                    }
                }
            },

            '/api/admin/denuncias/{id}/status': {
                patch: {
                    tags: ['Administração'],
                    summary: 'Atualiza o status de uma denúncia',

                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'integer'
                            },
                            description: 'ID da denúncia'
                        }
                    ],

                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['status'],
                                    properties: {
                                        status: {
                                            type: 'string',
                                            enum: [
                                                'pendente',
                                                'em_andamento',
                                                'resolvida'
                                            ],
                                            example: 'em_andamento'
                                        },
                                        resposta_orgao: {
                                            type: 'string',
                                            example: 'A equipe responsável foi acionada.'
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        200: {
                            description: 'Status atualizado com sucesso'
                        },
                        400: {
                            description: 'Status inválido'
                        },
                        404: {
                            description: 'Denúncia não encontrada'
                        },
                        500: {
                            description: 'Erro ao atualizar denúncia'
                        }
                    }
                }
            },

            '/api/admin/denuncias/{id}': {
                delete: {
                    tags: ['Administração'],
                    summary: 'Exclui uma denúncia',

                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'integer'
                            },
                            description: 'ID da denúncia'
                        }
                    ],

                    responses: {
                        200: {
                            description: 'Denúncia excluída com sucesso'
                        },
                        404: {
                            description: 'Denúncia não encontrada'
                        },
                        500: {
                            description: 'Erro ao excluir denúncia'
                        }
                    }
                }
            },

            '/api/admin/estatisticas': {
                get: {
                    tags: ['Administração'],
                    summary: 'Obtém estatísticas administrativas',

                    responses: {
                        200: {
                            description: 'Estatísticas administrativas obtidas com sucesso'
                        },
                        500: {
                            description: 'Erro ao buscar estatísticas'
                        }
                    }
                }
            }
        }
    },

    // As rotas foram definidas manualmente acima.
    apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;