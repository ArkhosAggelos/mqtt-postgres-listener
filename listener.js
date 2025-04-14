import dotenv from "dotenv";
import mqtt from "mqtt";
import pkg from "pg";
const { Client } = pkg;

dotenv.config();

// Configurações MQTT
const mqttClient = mqtt.connect({
  host: process.env.MQTT_BROKER,
  port: parseInt(process.env.MQTT_PORT),
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: "mqtts"
});

// Configurações PostgreSQL
const pgClient = new Client({ connectionString: process.env.PG_URL });

async function conectarPostgres(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await pgClient.connect();
      console.log("Conectado ao PostgreSQL");
      return;
    } catch (err) {
      console.error(`Tentativa ${i + 1} falhou:`, err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

conectarPostgres();

// MQTT conectado
mqttClient.on("connect", () => {
  console.log("MQTT conectado");
  mqttClient.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (!err) console.log(`Inscrito no tópico ${process.env.MQTT_TOPIC}`);
  });
});

// Quando chega uma mensagem
mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("Recebido:", payload);

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

    console.log("✅ Inserido com sucesso");
  } catch (err) {
    console.error("Erro ao inserir:", err.message);
  }
});
