// agregador_dia.js
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

console.log("🟡 Iniciando agregador_dia.js");

// Conexão com o PostgreSQL
const client = new Client({ connectionString: process.env.PG_URL });
await client.connect();
console.log("📡 Conectado ao PostgreSQL");

// Hora local atual (ajustada para UTC-3, horário de Brasília)
const agora = new Date();
agora.setUTCHours(agora.getUTCHours() + -3);

// Somente executa a agregação diária após 23h59
if (agora.getHours() < 23) {
  console.log("⏳ Ainda não são 23h. Agregação diária será ignorada.");
  process.exit(0);
}

// Formata a data atual como string YYYYMMDD
const dataAtual = agora.toISOString().slice(0, 10).replace(/-/g, '');
const dataLimite = dataAtual;

// Busca os dias únicos nas leituras anteriores à data atual
const resultado = await client.query(`
  SELECT DISTINCT LEFT(id, 8) AS dia
  FROM leituras
  WHERE LEFT(id, 8) < $1
  ORDER BY dia;
`, [dataLimite]);

for (const row of resultado.rows) {
  const dia = row.dia;

  // Verifica se já existe agregação
  const jaExiste = await client.query(`SELECT 1 FROM leitura_dia WHERE id = $1`, [dia]);
  if (jaExiste.rowCount > 0) {
    console.log(`⏩ Dia ${dia} já agregado. Pulando.`);
    continue;
  }

  // Executa a agregação do dia
  const agregados = await client.query(`
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
    WHERE LEFT(id, 8) = $1
  `, [dia]);

  const dados = agregados.rows[0];
  await client.query(`
    INSERT INTO leitura_dia (id, temp_min, temp_max, temp_media, umidade_min, umidade_max, umidade_media, pressao_min, pressao_max, pressao_media, lux_min, lux_max, lux_media)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [dia, ...Object.values(dados)]);

  console.log(`✔ Agregado com sucesso para o dia ${dia}`);
}

await client.end();
console.log("🏁 Agregação diária finalizada.");
