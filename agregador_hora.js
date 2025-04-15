// agregador_hora.js
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;
import { DateTime } from "luxon";

dotenv.config();

// Conexão com o banco de dados
const client = new Client({ connectionString: process.env.PG_URL });
await client.connect();
console.log("Conectado ao PostgreSQL");

// Obtém data e hora local de Brasília (UTC-3)
const agora = DateTime.now().setZone("America/Sao_Paulo");

// Remove minutos e segundos e volta uma hora para pegar a hora encerrada
const horaParaAgregacao = agora.minus({ hours: 1 }).startOf("hour");
const id = horaParaAgregacao.toFormat("yyyyLLddHH"); // Ex: 2025041518

console.log("⏱️ Agregando hora encerrada:", id);

// Verifica se a hora já foi agregada anteriormente
const checar = await client.query("SELECT 1 FROM leituras_hora WHERE id = $1", [id]);
if (checar.rowCount > 0) {
  console.log("⏩ Hora", id, "já agregada. Pulando.");
  process.exit(0);
}

// Realiza a agregação dos dados da hora encerrada
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
  WHERE id LIKE '${id}%'
`);

const dados = consulta.rows[0];

// Se não houver dados para o período, pula
if (!dados.temp_min) {
  console.log("⚠️ Nenhum dado encontrado para a hora", id);
  process.exit(0);
}

// Insere os dados agregados na tabela leituras_hora
await client.query(`
  INSERT INTO leituras_hora (
    id, temp_min, temp_max, temp_media,
    umidade_min, umidade_max, umidade_media,
    pressao_min, pressao_max, pressao_media,
    lux_min, lux_max, lux_media
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
`, [id, ...Object.values(dados)]);

console.log("✅ Dados agregados com sucesso para a hora", id);
process.exit(0);
