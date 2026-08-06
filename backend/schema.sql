-- ====================================================================
-- Denúncias Urbanas — Script de criação do banco de dados
-- Rode este arquivo no MySQL antes de iniciar o backend:
--   mysql -u root -p < schema.sql
-- ====================================================================

CREATE DATABASE IF NOT EXISTS denuncia_urbana_novo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE denuncia_urbana_novo;

-- Usuários cadastrados
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Denúncias registradas
CREATE TABLE IF NOT EXISTS denuncias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'Outros',
  localizacao VARCHAR(255) NOT NULL,
  status ENUM('pendente', 'em_andamento', 'resolvida') NOT NULL DEFAULT 'pendente',
  votos INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Votos/apoios de usuários em denúncias (impede voto duplicado)
CREATE TABLE IF NOT EXISTS votos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  denuncia_id INT NOT NULL,
  usuario_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY voto_unico (denuncia_id, usuario_id),
  FOREIGN KEY (denuncia_id) REFERENCES denuncias(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

