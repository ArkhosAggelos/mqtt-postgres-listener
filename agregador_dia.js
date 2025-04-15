// Importa bibliotecas
import dotenv from "dotenv";
import pkg from "pg";

const { Client } = pkg;
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

// Conexão com o PostgreSQL
const client = new Client({
  connectionString: process.env.PG_URL,
});

await client.connect();
console.log("✅ Conectado ao PostgreSQL");

// Seleciona os dias únicos com base nas horas da tabela de agregação horária
const resultadoDias = await client.query(`
  SELECT DISTINCT SUBSTRING(id, 1, 8) AS dia
  FROM leituras_hora
  ORDER BY dia
`);

for (const linha of resultadoDias.rows) {
  const dia = linha.dia;

  // Verifica se esse dia já foi agregado
  const jaExiste = await client.query(`SELECT 1 FROM leitura_dia WHERE id = $1`, [dia]);
  if (jaExiste.rowCount > 0) {
    console.log(`⏩ Dia ${dia} já agregado. Pulando.`);
    continue;
  }

  // Agrega os dados por dia com base nas horas disponíveis
  const resultado = await client.query(
    `
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
    WHERE SUBSTRING(id, 1, 8) = $1
  `,
    [dia]
  );

  // Insere os dados agregados na tabela de agregação diária
  const r = resultado.rows[0];
  await client.query(
    `
    INSERT INTO leitura_dia (
      id, temp_min, temp_max, temp_media,
      umidade_min, umidade_max, umidade_media,
      pressao_min, pressao_max, pressao_media,
      lux_min, lux_max, lux_media
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `,
    [dia, r.temp_min, r.temp_max, r.temp_media, r.umidade_min, r.umidade_max, r.umidade_media, r.pressao_min, r.pressao_max, r.pressao_media, r.lux_min, r.lux_max, r.lux_media]
  );

  console.log(`✔ Dados agregados com sucesso para o dia ${dia}`);
}

console.log("🏁 Agregação diária concluída.");
await client.end(); // Finaliza a conexão com o banco
