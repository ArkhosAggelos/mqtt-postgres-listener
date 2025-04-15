// agregador_dia.js

import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

// Conexão com PostgreSQL usando variável de ambiente PG_URL
const pgClient = new Client({ connectionString: process.env.PG_URL });

// Função principal de execução
async function executarAgregacaoDiaria() {
  try {
    await pgClient.connect();
    console.log("Conectado ao PostgreSQL ✅");

    // Obtém todos os dias distintos (YYYYMMDD) existentes na tabela leituras_hora
    const dias = await pgClient.query(`
      SELECT DISTINCT SUBSTRING(id FROM 1 FOR 8) AS dia
      FROM leituras_hora
      ORDER BY dia
    `);

    for (const row of dias.rows) {
      const dia = row.dia;

      // Verifica se o dia já foi agregado
      const existe = await pgClient.query(`
        SELECT 1 FROM leitura_dia WHERE id = $1
      `, [dia]);

      if (existe.rowCount > 0) {
        console.log(`⏩ Dia ${dia} já agregado. Pulando.`);
        continue;
      }

      // Realiza a agregação por dia
      const resultado = await pgClient.query(`
        SELECT
          MIN(temp_min) AS temp_min,
          MAX(temp_max) AS temp_max,
          AVG(temp_media) AS temp_media,

          MIN(umidade_min) AS umidade_min,
          MAX(umidade_max) AS umidade_max,
          AVG(umidade_media) AS umidade_media,

          MIN(pressao_min) AS pressao_min,
          MAX(pressao_max) AS pressao_max,
          AVG(pressao_media) AS pressao_media,

          MIN(lux_min) AS lux_min,
          MAX(lux_max) AS lux_max,
          AVG(lux_media) AS lux_media
        FROM leituras_hora
        WHERE SUBSTRING(id FROM 1 FOR 8) = $1
      `, [dia]);

      const r = resultado.rows[0];

      // Insere o resultado na tabela leitura_dia
      await pgClient.query(`
        INSERT INTO leitura_dia (
          id,
          temp_min, temp_max, temp_media,
          umidade_min, umidade_max, umidade_media,
          pressao_min, pressao_max, pressao_media,
          lux_min, lux_max, lux_media
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        dia,
        r.temp_min, r.temp_max, r.temp_media,
        r.umidade_min, r.umidade_max, r.umidade_media,
        r.pressao_min, r.pressao_max, r.pressao_media,
        r.lux_min, r.lux_max, r.lux_media
      ]);

      console.log(`✅ Dia ${dia} agregado com sucesso!`);
    }

    console.log("🏁 Agregação diária concluída.");
    await pgClient.end();

  } catch (err) {
    console.error("❌ Erro na agregação diária:", err.message);
    process.exit(1);
  }
}

// Inicia o processo
executarAgregacaoDiaria();
