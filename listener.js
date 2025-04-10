require("dotenv").config();
const mqtt = require("mqtt");
const { Client } = require("pg");

// Configurações MQTT
const mqttOptions = {
  host: process.env.MQTT_BROKER,
  port: parseInt(process.env.MQTT_PORT),
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: "mqtts"
};

// Conexão ao broker MQTT (HiveMQ Cloud)
const mqttClient = mqtt.connect(mqttOptions);

mqttClient.on("connect", () => {
  console.log("📡 Conectado ao broker MQTT");
  mqttClient.subscribe("estacao/externo", (err) => {
    if (!err) console.log("🛰️ Inscrito no tópico: estacao/externo");
  });
});

// Conexão ao banco PostgreSQL (Railway)
const pgClient = new Client({ connectionString: process.env.PG_URL });

pgClient.connect()
  .then(() => console.log("📦 Conectado ao PostgreSQL"))
  .catch((err) => console.error("Erro ao conectar no banco:", err));

// Quando uma mensagem MQTT for recebida
mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("📥 Mensagem recebida:", payload);

    const query = `
      INSERT INTO leituras (temperatura, umidade, pressao, lux, previsao, datahora)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await pgClient.query(query, [
      payload.temperatura,
      payload.umidade,
      payload.pressao,
      payload.lux,
      payload.previsao
    ]);

    console.log("✅ Dados inseridos com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao processar mensagem:", err.message);
  }
});
