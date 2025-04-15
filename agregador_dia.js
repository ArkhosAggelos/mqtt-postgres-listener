// agregador_dia.js

import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

// Conexão com o banco de dados PostgreSQL
const cliente = new Client({
  connectionString: process.env.PG_URL,
});

async function conectarPostgres() {
  try {
    await cliente.connect();
    console.log("Conectado ao PostgreSQL");
  } catch (erro) {
    console.error("Erro ao conectar ao PostgreSQL:", erro.message);
    process.exit(1);
  }
}

// Função principal para agregar dados por dia
async function agregarPorDia() {
  const consulta = `
    INSERT INTO leituras_dia (
      id,
      temp_min, temp_max, temp_media,
      umidade_min, umidade_max, umidade_media,
      pressao_min, pressao_max, pressao_media,
      lux_min, lux_max, lux_media
    )
    SELECT
      SUBSTRING(id, 1, 8) AS dia,
      MIN(temperatura), MAX(temperatura), AVG(temperatura),
      MIN(umidade), MAX(umidade), AVG(umidade),
      MIN(pressao), MAX(pressao), AVG(pressao),
      MIN(lux), MAX(lux), AVG(lux)
    FROM leituras
    WHERE SUBSTRING(id, 1, 8) NOT IN (
      SELECT id FROM leituras_dia
    )
    GROUP BY SUBSTRING(id, 1, 8)
    ORDER BY dia;
  `;

  try {
    await cliente.query(consulta);
    console.log("Agregação diária concluída com sucesso.");
  } catch (erro) {
    console.error("Erro ao agregar os dados por dia:", erro.message);
  } finally {
    await cliente.end();
  }
}

// Execução
await conectarPostgres();
await agregarPorDia();