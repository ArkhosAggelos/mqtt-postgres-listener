// agregador_dia.js
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;
import { DateTime } from "luxon";

dotenv.config();

// Conexão com o banco de dados
const client = new Client({ connectionString: process.env.PG_URL });
await client.connect();
console.log("Conectado ao PostgreSQL");

// Obtém data atual em Brasília (UTC-3)
const agora = DateTime.now().setZone("America/Sao_Paulo");

// Somente após 00h01 é permitido agregar o dia anterior
if (agora.hour < 0) {
  console.log("⏳ Ainda não é meia-noite, agregação do dia anterior não permitida.");
  process.exit(0);
}

// Define qual dia vamos agregar (ontem)
const dia = agora.minus({ days: 1 }).toFormat("yyyyLLdd");
console.log("📅 Agregando dados do dia:", dia);

// Verifica se esse dia já foi agregado
const checar = await client.query("SELECT 1 FROM leitura_dia WHERE id = $1", [dia]);
if (checar.rowCount > 0) {
  console.log("⏩ Dia", dia, "já foi agregado. Pulando.");
  process.exit(0);
}

// Agrega com base no ID do dia
const consulta = await client.query(`
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
  WHERE id LIKE '${dia}%'
`);

const dados = consulta.rows[0];

if (!dados.temp_min) {
  console.log("⚠️ Nenhum dado encontrado para o dia", dia);
  process.exit(0);
}

// Insere dados agregados na tabela leitura_dia
await client.query(`
  INSERT INTO leitura_dia (
    id, temp_min, temp_max, temp_media,
    umidade_min, umidade_max, umidade_media,
    pressao_min, pressao_max, pressao_media,
    lux_min, lux_max, lux_media
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
`, [dia, ...Object.values(dados)]);

console.log("✅ Dados agregados com sucesso para o dia", dia);
process.exit(0);
