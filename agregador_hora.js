// Importa bibliotecas necessárias
import dotenv from "dotenv"; // Gerencia variáveis de ambiente (.env)
import pkg from "pg";        // Biblioteca para conectar com o PostgreSQL

const { Client } = pkg;
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

// Conecta ao banco de dados PostgreSQL
const client = new Client({
  connectionString: process.env.PG_URL,
});

await client.connect();
console.log("✅ Conectado ao PostgreSQL");

// Consulta para obter as horas únicas presentes na tabela principal
const resultadoHoras = await client.query(`
  SELECT DISTINCT SUBSTRING(id, 1, 10) AS hora
  FROM leituras
  ORDER BY hora
`);

for (const linha of resultadoHoras.rows) {
  const hora = linha.hora;

  // Verifica se essa hora já foi agregada
  const jaExiste = await client.query(`SELECT 1 FROM leituras_hora WHERE id = $1`, [hora]);
  if (jaExiste.rowCount > 0) {
    console.log(`⏩ Hora ${hora} já agregada. Pulando.`);
    continue;
  }

  // Realiza os cálculos de agregação para temperatura, umidade, pressão e luminosidade
  const resultado = await client.query(
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
    WHERE SUBSTRING(id, 1, 10) = $1
  `,
    [hora]
  );

  // Insere os dados agregados na tabela de agregações por hora
  const r = resultado.rows[0];
  await client.query(
    `
    INSERT INTO leituras_hora (
      id, temp_min, temp_max, temp_media,
      umidade_min, umidade_max, umidade_media,
      pressao_min, pressao_max, pressao_media,
      lux_min, lux_max, lux_media
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `,
    [hora, r.temp_min, r.temp_max, r.temp_media, r.umidade_min, r.umidade_max, r.umidade_media, r.pressao_min, r.pressao_max, r.pressao_media, r.lux_min, r.lux_max, r.lux_media]
  );

  console.log(`✔ Dados agregados com sucesso para a hora ${hora}`);
}

console.log("🏁 Agregação horária concluída.");
await client.end(); // Encerra a conexão com o banco
