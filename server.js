const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

const dbConfig = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME
  ? {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    }
  : null;

const pool = dbConfig ? mysql.createPool(dbConfig) : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/api/leads", async (req, res) => {
  try {
    const lead = req.body;

    console.log("Novo lead recebido:", lead);

    // Salva o lead no MySQL, se o banco estiver configurado.
    await saveLeadToDatabase(lead);

    if (lead.enviar_simpledesk === true) {
      await enviarParaSimpleDesk(lead);
    }

    // Aqui você também pode enviar para Google Sheets, Airtable, CRM ou webhook.
    await enviarParaWebhookGeral(lead);

    return res.status(200).json({
      success: true,
      message: "Lead recebido com sucesso",
      classificacao: lead.classificacao,
      temperatura: lead.temperatura,
      enviado_simpledesk: lead.enviar_simpledesk
    });

  } catch (error) {
    console.error("Erro ao receber lead:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao processar lead"
    });
  }
});

async function enviarParaSimpleDesk(lead) {
  const SIMPLE_DESK_WEBHOOK_URL = process.env.SIMPLE_DESK_WEBHOOK_URL;

  if (!SIMPLE_DESK_WEBHOOK_URL) {
    console.log("Webhook do SimpleDesk não configurado.");
    return;
  }

  const payloadSimpleDesk = {
    name: lead.nome,
    phone: lead.whatsapp,
    email: lead.email,
    source: lead.origem,
    campaign: lead.campanha,
    tag: lead.classificacao,
    custom_fields: {
      objetivo: lead.objetivo,
      interesse_bolsa: lead.interesse_bolsa,
      prazo: lead.prazo,
      momento_academico: lead.momento_academico,
      temperatura: lead.temperatura
    }
  };

  await axios.post(SIMPLE_DESK_WEBHOOK_URL, payloadSimpleDesk);

  console.log("Lead enviado para SimpleDesk:", lead.nome);
}

async function enviarParaWebhookGeral(lead) {
  const GENERAL_WEBHOOK_URL = process.env.GENERAL_WEBHOOK_URL;

  if (!GENERAL_WEBHOOK_URL) {
    console.log("Webhook geral não configurado.");
    return;
  }

  await axios.post(GENERAL_WEBHOOK_URL, lead);

  console.log("Lead enviado para webhook geral:", lead.nome);
}

async function initializeDatabase() {
  if (!pool) {
    console.log("MySQL não configurado. Pulando inicialização do banco de dados.");
    return;
  }

  const createLeadsTable = `
    CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      whatsapp VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      origem VARCHAR(100),
      campanha VARCHAR(100),
      classificacao VARCHAR(100),
      temperatura VARCHAR(50),
      enviar_simpledesk TINYINT(1) DEFAULT 0,
      respostas TEXT,
      created_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.execute(createLeadsTable);
  console.log("Tabela leads verificada/criada com sucesso.");
}

async function saveLeadToDatabase(lead) {
  if (!pool) {
    console.log("MySQL não configurado. Pulando gravação no banco de dados.");
    return;
  }

  const insertQuery = `
    INSERT INTO leads
      (nome, whatsapp, email, origem, campanha, classificacao, temperatura, enviar_simpledesk, respostas, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    lead.nome,
    lead.whatsapp,
    lead.email,
    lead.origem,
    lead.campanha,
    lead.classificacao,
    lead.temperatura,
    lead.enviar_simpledesk ? 1 : 0,
    JSON.stringify(lead.respostas || {}),
    new Date().toISOString().slice(0, 19).replace("T", " ")
  ];

  await pool.execute(insertQuery, values);
  console.log("Lead salvo no MySQL:", lead.nome);
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (pool) {
    await initializeDatabase();
  }

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar servidor:", error);
  process.exit(1);
});