import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

const cliente = new Client({
  connectionString: process.env.PG_URL,
});

await cliente.connect();
console.log("Conectado ao PostgreSQL");

// Obtemos a data de ontem no formato YYYYMMDD
const ontem = new Date();
ontem.setDate(ontem.getDate() - 1);
const yyyy = ontem.getFullYear();
const mm = String(ontem.getMonth() + 1).padStart(2, "0");
const dd = String(ontem.getDate()).padStart(2, "0");
const idOntem = `${yyyy}${mm}${dd}`;

console.log(`Verificando agregação do dia ${idOntem}...`);

// Verificamos se o dia já foi agregado
const { rows: existe } = await cliente.query(
  "SELECT 1 FROM leituras_dia WHERE id = $1 LIMIT 1",
  [idOntem]
);

if (existe.length > 0) {
  console.log(`Dia ${idOntem} já está agregado. Nada a fazer.`);
  await cliente.end();
  process.exit(0);
}

// Agrega os dados do dia anterior a partir da tabela leituras_hora
const resultado = await cliente.query(
  `
  SELECT
    MIN(temp_min) AS temp_min, MAX(temp_max) AS temp_max, AVG(temp_media) AS temp_media,
    MIN(umidade_min) AS umidade_min, MAX(umidade_max) AS umidade_max, AVG(umidade_media) AS umidade_media,
    MIN(pressao_min) AS pressao_min, MAX(pressao_max) AS pressao_max, AVG(pressao_media) AS pressao_media,
    MIN(lux_min) AS lux_min, MAX(lux_max) AS lux_max, AVG(lux_media) AS lux_media
  FROM leituras_hora
  WHERE id LIKE $1
`,
  [`${idOntem}%`]
);

const dados = resultado.rows[0];

// Inserimos os dados agregados na tabela leituras_dia
await cliente.query(
  `
  INSERT INTO leituras_dia (
    id,
    temp_min, temp_max, temp_media,
    umidade_min, umidade_max, umidade_media,
    pressao_min, pressao_max, pressao_media,
    lux_min, lux_max, lux_media
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
`,
  [
    idOntem,
    dados.temp_min, dados.temp_max, dados.temp_media,
    dados.umidade_min, dados.umidade_max, dados.umidade_media,
    dados.pressao_min, dados.pressao_max, dados.pressao_media,
    dados.lux_min, dados.lux_max, dados.lux_media
  ]
);

console.log(`✅ Agregação do dia ${idOntem} concluída.`);
await cliente.end();