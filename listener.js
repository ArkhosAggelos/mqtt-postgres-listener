// listener.js
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

// PostgreSQL
const pgClient = new Client({ connectionString: process.env.PG_URL });
await pgClient.connect();

mqttClient.on("connect", () => {
  console.log("Conectado ao MQTT");
  mqttClient.subscribe("estacao/externo");
});

mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("Mensagem recebida:", payload);

    const query = `INSERT INTO leituras (id, temperatura, umidade, pressao, lux, previsao)
                   VALUES ($1, $2, $3, $4, $5, $6)`;

    await pgClient.query(query, [
      payload.id,
      payload.temperatura,
      payload.umidade,
      payload.pressao,
      payload.lux,
      payload.previsao
    ]);

    console.log("Dados inseridos com sucesso.");
  } catch (err) {
    console.error("Erro ao inserir:", err.message);
  }
});
