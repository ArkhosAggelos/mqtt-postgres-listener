// agregador_hora.js
// Script para agregar dados por hora e armazenar na tabela leituras_hora

import dotenv from "dotenv";
import pkg from "pg";
dotenv.config();

const { Client } = pkg;

// Conexão com o banco de dados PostgreSQL
const cliente = new Client({
  connectionString: process.env.PG_URL,
});

async function agregarLeiturasPorHora() {
  try {
    await cliente.connect(); // Conectar ao banco

    // Obter data e hora atual
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    const hora = String(agora.getHours()).padStart(2, "0");

    // Criar ID no formato YYYYMMDDHH (ex: 2025041415)
    const idHora = `${ano}${mes}${dia}${hora}`;
    const padraoId = `${idHora}%`; // Usado no LIKE para buscar leituras dessa hora

    // Consulta para agregar os dados da tabela "leituras" e inserir na tabela "leituras_hora"
    const consultaSQL = `
      INSERT INTO leituras_hora (
        id,
        temp_min, temp_max, temp_media,
        umidade_min, umidade_max, umidade_media,
        pressao_min, pressao_max, pressao_media,
        lux_min, lux_max, lux_media
      )
      SELECT
        $1,
        MIN(temperatura), MAX(temperatura), AVG(temperatura),
        MIN(umidade), MAX(umidade), AVG(umidade),
        MIN(pressao), MAX(pressao), AVG(pressao),
        MIN(lux), MAX(lux), AVG(lux)
      FROM leituras
      WHERE id LIKE $2
      ON CONFLICT (id) DO NOTHING
    `;

    // Executar a agregação com os parâmetros (id da hora, padrão LIKE para filtrar leituras)
    await cliente.query(consultaSQL, [idHora, padraoId]);

    console.log(`✔ Dados agregados com sucesso para a hora ${idHora}`);
  } catch (erro) {
    console.error("❌ Erro ao agregar dados por hora:", erro.message);
  } finally {
    await cliente.end(); // Fechar conexão com o banco
  }
}

// Executar a função de agregação
agregarLeiturasPorHora();
