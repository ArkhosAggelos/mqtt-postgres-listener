// agregador_hora.js
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

// Conecta ao banco PostgreSQL
const client = new Client({ connectionString: process.env.PG_URL });
await client.connect();
console.log("📡 Conectado ao PostgreSQL");

// Função para obter a hora atual no formato YYYYMMDDHH
function horaAtualFormatada() {
  const agora = new Date();
  agora.setUTCHours(agora.getUTCHours() + -3); // Ajusta para horário de Brasília (UTC-3)
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  const hora = String(agora.getHours()).padStart(2, "0");
  return `${ano}${mes}${dia}${hora}`;
}

// Obtem hora anterior para agregar (a última hora COMPLETA)
const horaLimite = horaAtualFormatada();
console.log(`🕒 Agregando até a hora anterior a ${horaLimite}`);

// Busca as horas únicas da tabela leituras
const resultado = await client.query(`
  SELECT DISTINCT LEFT(id, 10) AS hora
  FROM leituras
  WHERE LEFT(id, 10) < $1
  ORDER BY hora;
`, [horaLimite]);

for (const row of resultado.rows) {
  const hora = row.hora;

  // Verifica se já foi agregado
  const jaExiste = await client.query(`SELECT 1 FROM leituras_hora WHERE id = $1`, [hora]);
  if (jaExiste.rowCount > 0) {
    console.log(`⏩ Hora ${hora} já agregada. Pulando.`);
    continue;
  }

  // Executa a agregação para essa hora
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
    WHERE LEFT(id, 10) = $1
  `, [hora]);

  const dados = agregados.rows[0];
  await client.query(`
    INSERT INTO leituras_hora (id, temp_min, temp_max, temp_media, umidade_min, umidade_max, umidade_media, pressao_min, pressao_max, pressao_media, lux_min, lux_max, lux_media)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [hora, ...Object.values(dados)]);

  console.log(`✔ Agregado com sucesso para hora ${hora}`);
}

await client.end();
console.log("🏁 Agregação horária finalizada.");
