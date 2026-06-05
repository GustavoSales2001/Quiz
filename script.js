const questions = [
  {
    key: "objetivo",
    title: "Qual é o seu principal objetivo?",
    options: [
      "Estudar inglês nos EUA",
      "Fazer faculdade ou pós nos EUA",
      "Conseguir uma bolsa de estudos",
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

function getConfiguredApiBaseUrl() {
  const configField = document.getElementById("api-base-url");
  const customUrl = configField?.value.trim();

  if (customUrl) {
    return customUrl;
  }

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://quiz-production-8349.up.railway.app";
}

const API_BASE_URL = window.API_BASE_URL || getConfiguredApiBaseUrl();

let currentQuestion = 0;
let answers = {};
let startName = "";

function startQuiz() {
  const startNameField = document.getElementById("start-name");
  startName = startNameField ? startNameField.value.trim() : "";

  if (!startName) {
    alert("Por favor, informe seu nome completo para começar.");
    return;
  }

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");

  const nameField = document.getElementById("name");

  if (nameField) {
    nameField.value = startName;
  }

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

    const nameField = document.getElementById("name");

    if (nameField && startName) {
      nameField.value = startName;
    }
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
  const prazo = data.prazo;

  let classificacao = "LEAD_INICIAL";
  let temperatura = "frio";
  let enviarSimpleDesk = false;

  if (objetivo === "Entender como posso continuar nos EUA de forma regular") {
    classificacao = "LEAD_COS";
    temperatura = "quente";
    enviarSimpleDesk = true;
  } else if (
    objetivo === "Fazer faculdade ou pós nos EUA" ||
    objetivo === "Conseguir uma bolsa de estudos"
  ) {
    classificacao = "LEAD_TRANSFER";
    temperatura = "morno";
    enviarSimpleDesk = true;
  } else {
    classificacao = "LEAD_INICIAL";
    temperatura = "morno";
    enviarSimpleDesk = false;
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

function showErrorMessage(message) {
  const errorElement = document.getElementById("form-error");
  errorElement.innerText = message;
  errorElement.classList.remove("hidden");
}

function clearErrorMessage() {
  const errorElement = document.getElementById("form-error");
  errorElement.innerText = "";
  errorElement.classList.add("hidden");
}

function validateLeadFields(name, phone, email) {
  if (!name || !phone || !email) {
    showErrorMessage("Por favor, informe nome, WhatsApp e e-mail para prosseguir.");
    return false;
  }

  clearErrorMessage();
  return true;
}

async function submitLead() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!validateLeadFields(name, phone, email)) {
    return;
  }

  try {
    const checkResponse = await fetch(`${API_BASE_URL}/api/leads/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        whatsapp: phone
      })
    });

    const checkResult = await checkResponse.json();

    if (checkResult.exists) {
      showErrorMessage(
        "Identificamos que esse e-mail ou WhatsApp já está cadastrado. Se precisar de ajuda, aguarde o contato da nossa equipe."
      );
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

    const response = await fetch(`${API_BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        showErrorMessage(
          result.message || "Esse e-mail ou WhatsApp já está cadastrado."
        );
        return;
      }

      throw new Error(result.message || "Erro ao enviar lead.");
    }

    showResult(classification);
  } catch (error) {
    console.error(error);
    showErrorMessage(
      "Não foi possível enviar suas respostas no momento. Por favor, tente novamente em alguns instantes."
    );
  }
}

function showResult(classification) {
  document.getElementById("lead-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  const title = document.getElementById("result-title");
  const text = document.getElementById("result-text");

  const messages = {
    LEAD_TRANSFER: {
      title: "Seu perfil indica caminho transfer",
      text: "Seu objetivo parece ligado a um processo de transferência ou mudança de curso/estudo nos EUA."
    },
    LEAD_COS: {
      title: "Seu perfil indica caminho COS",
      text: "Pelo que você respondeu, há conexão com necessidades de mudança de status ou continuidade regular nos EUA."
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
  startName = "";

  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");

  const startNameField = document.getElementById("start-name");

  if (startNameField) {
    startNameField.value = "";
  }

  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("email").value = "";

  clearErrorMessage();
}