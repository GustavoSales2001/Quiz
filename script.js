const paths = {
  inicial: {
    label: "Inicial",
    resultTitle: "Seu caminho inicial para bolsa nos EUA",
    resultText:
      "Seu perfil indica um caminho inicial para bolsa nos EUA. O próximo passo é entender suas chances reais, os documentos necessários e quais universidades podem fazer sentido para você.",
    questions: [
      {
        key: "descoberta_inicial",
        title: "O que você mais quer descobrir agora?",
        options: [
          "Se tenho chance de conseguir bolsa",
          "Quanto eu precisaria investir",
          "Quais universidades poderiam aceitar meu perfil",
          "Quais documentos eu preciso preparar"
        ]
      },
      {
        key: "prazo_inicial",
        title: "Quando você gostaria de começar esse plano?",
        options: [
          "O quanto antes",
          "Nos próximos meses",
          "No próximo ano",
          "Ainda estou pesquisando"
        ]
      }
    ]
  },
  transfer: {
    label: "Transferência",
    resultTitle: "Seu caminho possível de transferência",
    resultText:
      "Seu perfil indica um possível caminho de transferência. Nesse caso, é importante avaliar créditos, histórico acadêmico, prazos e oportunidades de bolsa.",
    questions: [
      {
        key: "motivo_transferencia",
        title: "Você pensa em transferir por qual motivo?",
        options: [
          "Buscar uma bolsa melhor",
          "Mudar para uma universidade nos EUA",
          "Melhorar minhas oportunidades acadêmicas",
          "Ainda quero entender se transferência faz sentido"
        ]
      },
      {
        key: "historico_academico",
        title: "Você já tem histórico acadêmico da instituição atual?",
        options: [
          "Sim",
          "Tenho, mas preciso organizar",
          "Ainda não",
          "Não sei quais documentos preciso"
        ]
      }
    ]
  },
  cos: {
    label: "Orientação estratégica",
    resultTitle: "Seu caminho de orientação estratégica",
    resultText:
      "Seu perfil indica que o melhor primeiro passo é uma orientação estratégica. Antes de iniciar qualquer processo, vale entender suas chances, seu momento e o caminho mais seguro para estudar nos EUA.",
    questions: [
      {
        key: "obstaculo_cos",
        title: "O que mais te impede de começar?",
        options: [
          "Não sei se tenho perfil",
          "Não sei quanto custa",
          "Não sei por onde começar",
          "Tenho medo de fazer algo errado"
        ]
      },
      {
        key: "preferencia_cos",
        title: "O que você gostaria de receber agora?",
        options: [
          "Uma análise do meu perfil",
          "Um plano mais claro",
          "Orientação sobre bolsas",
          "Ajuda para entender os próximos passos"
        ]
      }
    ]
  }
};

const firstQuestion = {
  key: "caminho",
  title: "Em qual momento você está hoje?",
  options: [
    {
      value: "inicial",
      text: "Quero começar do zero e entender minhas chances de estudar nos EUA"
    },
    {
      value: "transfer",
      text: "Já estudo em uma faculdade e quero entender possibilidades de transferência"
    },
    {
      value: "cos",
      text: "Quero estudar fora, mas ainda não sei por onde começar"
    }
  ]
};

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

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || ""
  };
}

function getCurrentQuestions() {
  const questions = [firstQuestion];
  const pathKey = answers[firstQuestion.key];

  if (pathKey && paths[pathKey]) {
    questions.push(...paths[pathKey].questions);
  }

  return questions;
}

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

  currentQuestion = 0;
  renderQuestion();
}

function renderQuestion() {
  const currentQuestions = getCurrentQuestions();
  const question = currentQuestions[currentQuestion];
  const hasAnswer = Boolean(answers[question.key]);

  document.getElementById("question-number").innerText =
    `Pergunta ${currentQuestion + 1} de ${currentQuestions.length}`;

  document.getElementById("question-title").innerText = question.title;

  const progress = ((currentQuestion + 1) / currentQuestions.length) * 100;
  document.getElementById("progress-bar").style.width = `${progress}%`;

  const optionsContainer = document.getElementById("options");
  optionsContainer.innerHTML = "";

  question.options.forEach((option) => {
    const optionValue = option.value || option;
    const optionText = option.text || option;
    const optionElement = document.createElement("div");

    optionElement.className = "option";
    optionElement.innerText = optionText;

    if (answers[question.key] === optionValue) {
      optionElement.classList.add("selected");
    }

    optionElement.onclick = () => {
      if (question.key === firstQuestion.key && answers[firstQuestion.key] && answers[firstQuestion.key] !== optionValue) {
        const previousPath = answers[firstQuestion.key];
        if (paths[previousPath]) {
          paths[previousPath].questions.forEach((item) => {
            delete answers[item.key];
          });
        }
      }

      answers[question.key] = optionValue;
      renderQuestion();
    };

    optionsContainer.appendChild(optionElement);
  });

  const backButton = document.getElementById("back-button");
  const nextButton = document.getElementById("next-button");

  backButton.style.display = currentQuestion === 0 ? "none" : "block";
  nextButton.innerText =
    currentQuestion === currentQuestions.length - 1 ? "Finalizar" : "Próxima";
  nextButton.disabled = !hasAnswer;
}

function goNext() {
  const currentQuestions = getCurrentQuestions();
  const question = currentQuestions[currentQuestion];

  if (!answers[question.key]) {
    alert("Escolha uma opção para continuar.");
    return;
  }

  if (currentQuestion < currentQuestions.length - 1) {
    currentQuestion++;
    renderQuestion();
    return;
  }

  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("lead-screen").classList.remove("hidden");

  const nameField = document.getElementById("name");
  if (nameField && startName) {
    nameField.value = startName;
  }
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

function classifyLead(data) {
  const path = data.caminho;
  const prazo = data.prazo_inicial || data.preferencia_cos || data.historico_academico || "";

  let classificacao = "LEAD_INICIAL";
  let temperatura = "frio";
  let enviarSimpleDesk = true;

  if (path === "transfer") {
    classificacao = "LEAD_TRANSFER";
  } else if (path === "cos") {
    classificacao = "LEAD_COS";
  }

  if (String(prazo).includes("O quanto antes") || String(prazo).includes("Nos próximos meses") || String(prazo).includes("Sim") || String(prazo).includes("Tenho")) {
    temperatura = "quente";
  } else if (String(prazo).includes("Ainda")) {
    temperatura = "morno";
  }

  return {
    classificacao,
    temperatura,
    enviar_simpledesk: enviarSimpleDesk,
    caminho: path
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

const loadingSteps = [
  "Analisando suas respostas",
  "Identificando seu caminho ideal",
  "Verificando suas chances de bolsa",
  "Preparando seu resultado",
  "Finalizando"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showLoading() {
  document.getElementById("lead-screen").classList.add("hidden");
  document.getElementById("loading-screen").classList.remove("hidden");
  updateLoadingStep(0);
}

function hideLoading() {
  document.getElementById("loading-screen").classList.add("hidden");
}

function updateLoadingStep(stepIndex) {
  const stepElements = Array.from(document.querySelectorAll(".loading-step"));
  const loadingText = document.getElementById("loading-subtext");

  stepElements.forEach((stepElement, index) => {
    stepElement.classList.toggle("active", index === stepIndex);
    stepElement.classList.toggle("complete", index < stepIndex);
  });

  if (loadingText) {
    loadingText.innerText = stepIndex < loadingSteps.length
      ? `${loadingSteps[stepIndex]}...`
      : "Concluído!";
  }
}

function validateLeadFields(name, phone, email) {
  if (!name || !phone || !email) {
    showErrorMessage("Por favor, informe nome, e-mail e WhatsApp para prosseguir.");
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
    showLoading();
    clearErrorMessage();
    await sleep(650);

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

    updateLoadingStep(1);
    await sleep(850);

    if (checkResult.exists) {
      hideLoading();
      document.getElementById("lead-screen").classList.remove("hidden");
      showErrorMessage(
        "Identificamos que esse e-mail ou WhatsApp já está cadastrado. Se precisar de ajuda, aguarde o contato da nossa equipe."
      );
      return;
    }

    const utmParams = getUtmParams();
    const leadData = {
      nome: name,
      whatsapp: phone,
      email: email,
      origem: "instagram_ads",
      campanha: "bolsas_estudo_eua",
      caminho: answers[firstQuestion.key],
      respostas: answers,
      ...answers,
      ...utmParams
    };

    const classification = classifyLead(leadData);
    const payload = {
      ...leadData,
      ...classification,
      created_at: new Date().toISOString()
    };

    updateLoadingStep(2);
    await sleep(650);

    const response = await fetch(`${API_BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    updateLoadingStep(3);
    await sleep(850);

    const result = await response.json();

    if (!response.ok) {
      hideLoading();
      document.getElementById("lead-screen").classList.remove("hidden");

      if (response.status === 409) {
        showErrorMessage(
          result.message || "Esse e-mail ou WhatsApp já está cadastrado."
        );
        return;
      }

      throw new Error(result.message || "Erro ao enviar lead.");
    }

    updateLoadingStep(4);
    await sleep(1000);

    hideLoading();
    showResult(classification);
  } catch (error) {
    console.error(error);
    hideLoading();
    document.getElementById("lead-screen").classList.remove("hidden");
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
  const pathKey = answers[firstQuestion.key];
  const pathData = paths[pathKey];

  title.innerText = pathData?.resultTitle || "Tudo certo!";
  text.innerText = pathData?.resultText ||
    "Com base nas suas respostas, vamos analisar seu perfil e identificar possíveis oportunidades acadêmicas compatíveis com seus objetivos.";
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