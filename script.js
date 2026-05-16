const questions = [
  {
    key: "objetivo",
    title: "Qual é o seu principal objetivo?",
    options: [
      "Estudar inglês nos EUA",
      "Fazer faculdade ou pós nos EUA",
      "Conseguir uma bolsa de estudos",
      "Usar o esporte como caminho para estudar fora",
      "Entender como posso continuar nos EUA de forma regular"
    ]
  },
  {
    key: "interesse_bolsa",
    title: "Você tem interesse em bolsa de estudos?",
    options: [
      "Sim, é minha prioridade",
      "Sim, mas também quero entender outras opções",
      "Talvez, depende dos requisitos",
      "Não necessariamente, quero estudar fora mesmo sem bolsa"
    ]
  },
  {
    key: "perfil_esportivo",
    title: "Você pratica ou já praticou algum esporte?",
    options: [
      "Sim, em nível competitivo",
      "Sim, de forma amadora",
      "Já pratiquei, mas parei",
      "Não pratico esporte"
    ]
  },
  {
    key: "prazo",
    title: "Em quanto tempo você quer iniciar esse plano?",
    options: [
      "O quanto antes",
      "Nos próximos 3 meses",
      "Nos próximos 6 meses",
      "No próximo ano",
      "Ainda não tenho prazo definido"
    ]
  },
  {
    key: "momento_academico",
    title: "Qual é seu momento acadêmico atual?",
    options: [
      "Ensino médio em andamento",
      "Ensino médio concluído",
      "Faculdade em andamento",
      "Faculdade concluída",
      "Quero estudar inglês, independente da formação"
    ]
  }
];

const API_BASE_URL = window.API_BASE_URL || (window.location.hostname === "localhost" ? "http://localhost:3000" : "");

let currentQuestion = 0;
let answers = {};

function startQuiz() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");

  renderQuestion();
}

function renderQuestion() {
  const question = questions[currentQuestion];
  const hasAnswer = Boolean(answers[question.key]);

  document.getElementById("question-number").innerText =
    `Pergunta ${currentQuestion + 1} de ${questions.length}`;

  document.getElementById("question-title").innerText = question.title;

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  document.getElementById("progress-bar").style.width = `${progress}%`;

  const optionsContainer = document.getElementById("options");
  optionsContainer.innerHTML = "";

  question.options.forEach((option) => {
    const optionElement = document.createElement("div");

    optionElement.className = "option";
    optionElement.innerText = option;

    if (answers[question.key] === option) {
      optionElement.classList.add("selected");
    }

    optionElement.onclick = () => {
      answers[question.key] = option;
      renderQuestion();
    };

    optionsContainer.appendChild(optionElement);
  });

  const backButton = document.getElementById("back-button");
  const nextButton = document.getElementById("next-button");

  backButton.style.display = currentQuestion === 0 ? "none" : "block";

  nextButton.innerText =
    currentQuestion === questions.length - 1 ? "Finalizar" : "Próxima";

  nextButton.disabled = !hasAnswer;
}

function goNext() {
  const question = questions[currentQuestion];

  if (!answers[question.key]) {
    alert("Escolha uma opção para continuar.");
    return;
  }

  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  } else {
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("lead-screen").classList.remove("hidden");
  }
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

function classifyLead(data) {
  const objetivo = data.objetivo;
  const bolsa = data.interesse_bolsa;
  const esporte = data.perfil_esportivo;
  const prazo = data.prazo;

  let classificacao = "LEAD_INICIAL";
  let temperatura = "frio";
  let enviarSimpleDesk = false;

  if (
    objetivo === "Usar o esporte como caminho para estudar fora" ||
    (
      bolsa.includes("Sim") &&
      (
        esporte === "Sim, em nível competitivo" ||
        esporte === "Sim, de forma amadora"
      )
    )
  ) {
    classificacao = "BOLSA_ESPORTIVA";
    temperatura = "quente";
    enviarSimpleDesk = true;
  } else if (objetivo === "Conseguir uma bolsa de estudos") {
    classificacao = "BOLSA_ACADEMICA";
    temperatura = "morno";
    enviarSimpleDesk = true;
  } else if (objetivo === "Estudar inglês nos EUA") {
    classificacao = "INGLES_EUA";
    temperatura = "morno";
    enviarSimpleDesk = true;
  } else if (objetivo === "Fazer faculdade ou pós nos EUA") {
    classificacao = "UNIVERSIDADE_EUA";
    temperatura = "morno";
    enviarSimpleDesk = true;
  } else if (objetivo === "Entender como posso continuar nos EUA de forma regular") {
    classificacao = "MANTER_NOS_EUA";
    temperatura = "quente";
    enviarSimpleDesk = true;
  }

  if (prazo === "O quanto antes" || prazo === "Nos próximos 3 meses") {
    temperatura = "quente";
  }

  return {
    classificacao,
    temperatura,
    enviar_simpledesk: enviarSimpleDesk
  };
}

function validateLeadFields(name, phone, email) {
  if (!name || !phone || !email) {
    alert("Preencha nome, WhatsApp e e-mail para continuar.");
    return false;
  }

  return true;
}

async function submitLead() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!validateLeadFields(name, phone, email)) {
    return;
  }

  const leadData = {
    nome: name,
    whatsapp: phone,
    email: email,
    origem: "instagram_ads",
    campanha: "bolsas_estudo_eua",
    respostas: answers,
    ...answers
  };

  const classification = classifyLead(leadData);

  const payload = {
    ...leadData,
    ...classification,
    created_at: new Date().toISOString()
  };

  try {
    await fetch(`${API_BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    showResult(classification);
  } catch (error) {
    console.error(error);
    alert("Não foi possível enviar suas respostas agora. Tente novamente em instantes.");
  }
}

function showResult(classification) {
  document.getElementById("lead-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  const title = document.getElementById("result-title");
  const text = document.getElementById("result-text");

  const messages = {
    BOLSA_ESPORTIVA: {
      title: "Seu perfil indica interesse em bolsa esportiva",
      text: "Pelo que você respondeu, existe conexão entre seu objetivo, seu perfil esportivo e caminhos de estudo nos EUA."
    },
    BOLSA_ACADEMICA: {
      title: "Seu perfil indica interesse em bolsa acadêmica",
      text: "Seu objetivo parece conectado a possibilidades de estudo com bolsa ou condições mais acessíveis."
    },
    INGLES_EUA: {
      title: "Seu perfil indica interesse em escola de inglês",
      text: "Seu caminho pode estar relacionado a programas de inglês nos EUA, de acordo com seu objetivo atual."
    },
    UNIVERSIDADE_EUA: {
      title: "Seu perfil indica interesse em universidade",
      text: "Seu objetivo se conecta a caminhos acadêmicos em universidades ou programas de graduação e pós."
    },
    MANTER_NOS_EUA: {
      title: "Seu perfil indica necessidade de direcionamento rápido",
      text: "Seu objetivo exige uma análise mais cuidadosa para entender os próximos passos de estudo nos EUA."
    },
    LEAD_INICIAL: {
      title: "Seu perfil está em fase inicial",
      text: "Você ainda parece estar no momento de pesquisa. Mesmo assim, suas respostas ajudam a indicar os melhores caminhos."
    }
  };

  const selectedMessage =
    messages[classification.classificacao] || messages.LEAD_INICIAL;

  title.innerText = selectedMessage.title;
  text.innerText = selectedMessage.text;
}

function restartQuiz() {
  currentQuestion = 0;
  answers = {};

  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");

  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("email").value = "";
}