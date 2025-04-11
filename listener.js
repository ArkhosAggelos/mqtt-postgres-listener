// listener.js (versão com "type": "module")

import dotenv from "dotenv";
import mqtt from "mqtt";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

// MQTT
const mqttOptions = {
  host: process.env.MQTT_BROKER,
  port: parseInt(process.env.MQTT_PORT),
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: "mqtts"
};

const mqttClient = mqtt.connect(mqttOptions);

mqttClient.on("connect", () => {
  console.log("Conectado ao broker MQTT");
  mqttClient.subscribe("estacao/externo", (err) => {
    if (!err) console.log("Inscrito no tópico: estacao/externo");
  });
});

// PostgreSQL
const pgClient = new Client({ connectionString: process.env.PG_URL });
//pgClient.connect().then(() => console.log("Conectado ao PostgreSQL"));

async function conectarPostgres(retentativas = 5) {
  for (let i = 0; i < retentativas; i++) {
    try {
      await pgClient.connect();
      console.log("Conectado ao PostgreSQL");
      return;
    } catch (err) {
      console.error(`Erro ao conectar, tentativa ${i + 1}/${retentativas}:`, err.message);
      await new Promise((r) => setTimeout(r, 3000)); // aguarda 3s
    }
  }
  process.exit(1); // encerra se falhar
}

conectarPostgres();

mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("Mensagem recebida:", payload);

    const query = `INSERT INTO leituras (temperatura, umidade, pressao, lux, previsao, datahora)
                   VALUES ($1, $2, $3, $4, $5, NOW())`;

    await pgClient.query(query, [
      payload.temperatura,
      payload.umidade,
      payload.pressao,
      payload.lux,
      payload.previsao
    ]);

    console.log("Dados inseridos no banco.");
  } catch (err) {
    console.error("Erro ao processar mensagem:", err.message);
  }
});
