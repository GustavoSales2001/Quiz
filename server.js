const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

const dbConfig =
  process.env.DB_HOST &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

async function checkExistingLead(email, whatsapp) {
  if (!pool) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(whatsapp);

  const [rows] = await pool.execute(
    `
      SELECT id, nome, email, whatsapp
      FROM leads
      WHERE LOWER(email) = ?
         OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
      LIMIT 1
    `,
    [normalizedEmail, normalizedPhone]
  );

  return rows.length > 0 ? rows[0] : null;
}

app.post("/api/leads/check", async (req, res) => {
  try {
    const { email, whatsapp } = req.body;

    if (!email || !whatsapp) {
      return res.status(400).json({
        exists: false,
        message: "E-mail e WhatsApp são obrigatórios."
      });
    }

    const existingLead = await checkExistingLead(email, whatsapp);

    if (existingLead) {
      return res.status(200).json({
        exists: true,
        message: "Esse e-mail ou WhatsApp já está cadastrado."
      });
    }

    return res.status(200).json({
      exists: false,
      message: "Cadastro disponível."
    });
  } catch (error) {
    console.error("Erro ao verificar lead:", error.message);

    return res.status(500).json({
      exists: false,
      message: "Erro ao verificar lead."
    });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const lead = req.body;

    lead.email = normalizeEmail(lead.email);
    lead.whatsapp = normalizePhone(lead.whatsapp);

    console.log("Novo lead recebido:", lead);

    const existingLead = await checkExistingLead(lead.email, lead.whatsapp);

    if (existingLead) {
      return res.status(409).json({
        success: false,
        message: "Esse e-mail ou WhatsApp já está cadastrado."
      });
    }

    await saveLeadToDatabase(lead);

    await enviarParaSimpleDesk(lead);

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
  const SIMPLEDESK_API_URL = process.env.SIMPLEDESK_API_URL;
  const SIMPLEDESK_API_KEY = process.env.SIMPLEDESK_API_KEY;

  if (!SIMPLEDESK_API_URL) {
    console.log("URL do SimpleDesk não configurada.");
    return;
  }

  if (!lead.enviar_simpledesk) {
    console.log("Lead não marcado para envio ao SimpleDesk.");
    return;
  }

  const payloadSimpleDesk = {
    name: lead.nome,
    phone: lead.whatsapp,
    email: lead.email,
    origem: lead.origem,
    campanha: lead.campanha,
    classificacao: lead.classificacao,
    temperatura: lead.temperatura,
    respostas: lead.respostas
  };

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (SIMPLEDESK_API_KEY) {
      headers.token = SIMPLEDESK_API_KEY;
    }

    const response = await axios.post(
      SIMPLEDESK_API_URL,
      payloadSimpleDesk,
      { headers }
    );

    console.log("Lead enviado para SimpleDesk:", response.data);
  } catch (error) {
    console.log("Erro ao enviar para SimpleDesk.");
    console.log("URL usada:", SIMPLEDESK_API_URL);
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);
  }
}

async function enviarParaWebhookGeral(lead) {
  const GENERAL_WEBHOOK_URL = process.env.GENERAL_WEBHOOK_URL;

  if (!GENERAL_WEBHOOK_URL) {
    console.log("Webhook geral não configurado.");
    return;
  }

  try {
    await axios.post(GENERAL_WEBHOOK_URL, lead);

    console.log("Lead enviado para webhook geral:", lead.nome);
  } catch (error) {
    console.log("Erro ao enviar para webhook geral.");
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);
  }
}

async function initializeDatabase() {
  if (!pool) {
    console.log("MySQL não configurado. Pulando inicialização do banco de dados.\n");
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
      (
        nome,
        whatsapp,
        email,
        origem,
        campanha,
        classificacao,
        temperatura,
        enviar_simpledesk,
        respostas,
        created_at
      )
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    lead.nome,
    normalizePhone(lead.whatsapp),
    normalizeEmail(lead.email),
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