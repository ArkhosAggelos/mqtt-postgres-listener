// agregador_hora.js
import dotenv from "dotenv";
import pkg from "pg";

const { Client } = pkg;
dotenv.config();

// Conexão com o banco PostgreSQL
const pgClient = new Client({ connectionString: process.env.PG_URL });

async function main() {
  await pgClient.connect();
  console.log("🔌 Conectado ao PostgreSQL");

  // Busca todas as horas distintas (no formato YYYYMMDDHH)
  const { rows: horas } = await pgClient.query(`
    SELECT DISTINCT LEFT(id, 10) AS hora
    FROM leituras
    ORDER BY hora
  `);

  for (const { hora } of horas) {
    // Verifica se essa hora já está agregada
    const { rows: existentes } = await pgClient.query(
      `SELECT 1 FROM leituras_hora WHERE id = $1`,
      [hora]
    );

    if (existentes.length > 0) {
      console.log(`⏩ Hora ${hora} já agregada. Pulando.`);
      continue;
    }

    // Agrega os dados da hora
    const { rows } = await pgClient.query(
      `
      SELECT
        MIN(temperatura) AS temp_min,
        MAX(temperatura) AS temp_max,
        AVG(temperatura) AS temp_media,
        MIN(umidade) AS umidade_min,
        MAX(umidade) AS umidade_max,
        AVG(umidade) AS umidade_media,
        MIN(pressao) AS pressao_min,
        MAX(pressao) AS pressao_max,
        AVG(pressao) AS pressao_media,
        MIN(lux) AS lux_min,
        MAX(lux) AS lux_max,
        AVG(lux) AS lux_media
      FROM leituras
      WHERE LEFT(id, 10) = $1
    `,
      [hora]
    );

    const dados = rows[0];

    // Insere o resultado na tabela de agregação
    await pgClient.query(
      `
      INSERT INTO leituras_hora (
        id, temp_min, temp_max, temp_media,
        umidade_min, umidade_max, umidade_media,
        pressao_min, pressao_max, pressao_media,
        lux_min, lux_max, lux_media
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        hora,
        dados.temp_min,
        dados.temp_max,
        dados.temp_media,
        dados.umidade_min,
        dados.umidade_max,
        dados.umidade_media,
        dados.pressao_min,
        dados.pressao_max,
        dados.pressao_media,
        dados.lux_min,
        dados.lux_max,
        dados.lux_media
      ]
    );

    console.log(`✅ Hora ${hora} agregada com sucesso.`);
  }

  await pgClient.end();
  console.log("🏁 Agregação concluída.");
}

main().catch((err) => {
  console.error("❌ Erro durante agregação:", err);
  pgClient.end();
});
