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

    // Busca as horas únicas já agregadas
    const resAgregadas = await client.query("SELECT id FROM leituras_hora");
    const idsAgregados = new Set(resAgregadas.rows.map(r => r.id));

    // Hora atual no formato 'YYYYMMDDHH'
    const horaAtual = DateTime.now().toFormat("yyyyLLddHH");

    // Busca todas as horas com dados e que ainda não foram agregadas
    const resHoras = await client.query(`
      SELECT DISTINCT SUBSTRING(id FROM 1 FOR 10) as hora
      FROM leituras
      ORDER BY hora
    `);

    for (const row of resHoras.rows) {
      const hora = row.hora;
      if (hora >= horaAtual) continue; // pula hora atual ou futura
      if (idsAgregados.has(hora)) {
        console.log(`⏩ Hora ${hora} já agregada. Pulando.`);
        continue;
      }

      // Faz agregação dessa hora
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
        WHERE SUBSTRING(id FROM 1 FOR 10) = $1
      `, [hora]);

      await client.query(`
        INSERT INTO leituras_hora (
          id, temp_min, temp_max, temp_media,
          umidade_min, umidade_max, umidade_media,
          pressao_min, pressao_max, pressao_media,
          lux_min, lux_max, lux_media
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [hora, ...Object.values(dados.rows[0])]);

      console.log(`✔ Dados agregados com sucesso para a hora ${hora}`);
    }

    console.log("🏁 Agregação horária concluída.");
  } catch (err) {
    console.error("Erro ao executar agregação por hora:", err.message);
  } finally {
    await client.end();
  }
}

main();
