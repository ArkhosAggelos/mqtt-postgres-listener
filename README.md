# 🌤️ MQTT → PostgreSQL Listener

Projeto que atua como **listener MQTT**: recebe dados de uma estação meteorológica baseada em ESP8266 (NodeMCU) 
via HiveMQ e insere as leituras em um banco de dados PostgreSQL hospedado no Railway.

---

## 📦 Estrutura do Projeto

```text
mqtt-postgres-listener/
├── listener.js         # Listener principal
├── package.json        # Configuração do projeto Node.js
└── .env.example        # Variáveis de ambiente de exemplo
```

---

## 📡 Descrição Geral

Este listener escuta o tópico MQTT `estacao/externo`, espera uma mensagem em JSON como esta:

```json
{
  "id": "20250413123045",
  "temperatura": 24.7,
  "umidade": 69.1,
  "pressao": 914.2,
  "lux": 155.8,
  "previsao": "Chuva ou tempestade"
}
```

O campo `id` é gerado no próprio NodeMCU no formato `YYYYMMDDHHMMSS`.

---

## 🛠️ Tecnologias

- **Node.js** com `mqtt`, `pg` e `dotenv`
- **MQTT Broker**: HiveMQ Cloud
- **PostgreSQL**: Railway (conexão privada)
- **ESP8266**: envia dados de sensores via Wi-Fi para o broker

---

## 🗃️ Estrutura da Tabela no PostgreSQL

Tabela: `leituras`

| Coluna        | Tipo   | Descrição                         |
|---------------|--------|-----------------------------------|
| `id`          | `text` | Chave primária (`YYYYMMDDHHMMSS`) |
| `temperatura` | `real` | Temperatura ambiente (°C)         |
| `umidade`     | `real` | Umidade relativa (%)              |
| `pressao`     | `real` | Pressão atmosférica (hPa)         |
| `lux`         | `real` | Nível de luminosidade (lux)       |
| `previsao`    | `text` | Previsão simples baseada na pressão |

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` no Railway ou localmente com:

```env
# MQTT Broker HiveMQ
MQTT_BROKER=#$%#$%#$%#$%#$%#$%#$%#$%.s1.eu.hivemq.cloud
MQTT_PORT=88...
MQTT_USERNAME=esp8266_#####
MQTT_PASSWORD=**********

# PostgreSQL Railway (conexão privada)
PG_URL=${ Postgres.DATABASE_URL }
```

---

## 🚀 Como Executar Localmente (opcional)

```bash
# Instale as dependências
npm install

# Execute o listener
npm start
```

---

## ☁️ Deploy no Railway

1. Crie um novo projeto no [Railway](https://railway.app)
2. Adicione um serviço PostgreSQL
3. Crie a tabela `leituras` com os campos descritos acima
4. Deploy este repositório via GitHub
5. Configure as variáveis `.env` em `Variables`
6. Veja os dados chegando via Logs → PostgreSQL → Data

---

## 📡 Projeto do NodeMCU

O dispositivo ESP8266 coleta os dados dos sensores, gera o `id` com base em NTP e envia via MQTT em JSON. 

---

## 📋 Licença

Este projeto é livre para fins educacionais e acadêmicos. 👨‍🏫👩‍🔬

---

## 👨‍💻 Autor

Desenvolvido por [ArkhosAggelos](https://github.com/ArkhosAggelos)
