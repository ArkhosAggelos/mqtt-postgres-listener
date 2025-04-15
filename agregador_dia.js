import dotenv from "dotenv";
import pkg from "pg";
import { DateTime } from "luxon";

dotenv.config();

const { Client } = pkg;
const client = new Client({ connectionString: process.env.PG_URL });

async function main() {
  try {
    await client.connect();
    console.log("📡 Conectado ao PostgreSQL");

    const resDiasAgregados = await client.query("SELECT id FROM leitura_dia");
    const idsAgregados = new Set(resDiasAgregados.rows.map(r => r.id));

    const diaAtual = DateTime.now().toFormat("yyyyLLdd");

    const resDias = await client.query(`
      SELECT DISTINCT SUBSTRING(id FROM 1 FOR 8) as dia
      FROM leituras
      ORDER BY dia
    `);

    for (const row of resDias.rows) {
      const dia = row.dia;
      if (dia >= diaAtual) continue; // ignora o dia atual
      if (idsAgregados.has(dia)) {
        console.log(`⏩ Dia ${dia} já agregado. Pulando.`);
        continue;
      }

      const dados = await client.query(`
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
        WHERE SUBSTRING(id FROM 1 FOR 8) = $1
      `, [dia]);

      await client.query(`
        INSERT INTO leitura_dia (
          id, temp_min, temp_max, temp_media,
          umidade_min, umidade_max, umidade_media,
          pressao_min, pressao_max, pressao_media,
          lux_min, lux_max, lux_media
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [dia, ...Object.values(dados.rows[0])]);

      console.log(`✔ Dados agregados com sucesso para o dia ${dia}`);
    }

    console.log("🏁 Agregação diária concluída.");
  } catch (err) {
    console.error("Erro ao executar agregação diária:", err.message);
  } finally {
    await client.end();
  }
}

main();
