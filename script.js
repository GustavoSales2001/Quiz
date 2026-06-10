const questions = [
  {
    key: "idade",
    title: "Qual sua idade?",
    options: [
      "Menos de 18 anos",
      "18 a 21 anos",
      "22 a 25 anos",
      "26 a 30 anos",
      "Mais de 30 anos"
    ]
  },
  {
    key: "nivel_ingles",
    title: "Qual seu nível de inglês?",
    options: [
      "Iniciante",
      "Intermediário",
      "Avançado",
      "Fluente"
    ]
  },
  {
    key: "ensino_medio",
    title: "Você já concluiu o ensino médio?",
    options: [
      "Sim, já concluí",
      "Estou concluindo atualmente",
      "Não, ainda não concluí"
    ]
  },
  {
    key: "faculdade_atual",
    title: "Está cursando faculdade atualmente?",
    options: [
      "Sim, estou cursando",
      "Não, ainda não estou"
    ]
  },
  {
    key: "objetivo_academico",
    title: "Qual seu objetivo acadêmico?",
    options: [
      "Graduação",
      "Transferência",
      "Pós-graduação",
      "Mestrado",
      "Doutorado"
    ]
  },
  {
    key: "quando_iniciar",
    title: "Quando pretende iniciar seus estudos?",
    options: [
      "Nos próximos 3 meses",
      "Em 6 meses",
      "No próximo ano",
      "Ainda não decidi"
    ]
  },
  {
    key: "investimento_mensal",
    title: "Qual sua faixa de investimento mensal?",
    options: [
      "Até R$ 1.000",
      "R$ 1.000 - R$ 2.500",
      "R$ 2.500 - R$ 5.000",
      "Acima de R$ 5.000"
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
  const objetivo = data.objetivo_academico;
  const prazo = data.quando_iniciar;

  let classificacao = "LEAD_INICIAL";
  let temperatura = "frio";
  let enviarSimpleDesk = false;

  if (
    objetivo === "Graduação" ||
    objetivo === "Transferência" ||
    objetivo === "Pós-graduação" ||
    objetivo === "Mestrado" ||
    objetivo === "Doutorado"
  ) {
    classificacao = "LEAD_TRANSFER";
    temperatura = "morno";
    enviarSimpleDesk = true;
  }

  if (prazo === "Nos próximos 3 meses" || prazo === "Em 6 meses") {
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

const loadingSteps = [
  "Validando dados",
  "Verificando cadastro",
  "Gravando no banco",
  "Enviando para equipe",
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

    updateLoadingStep(2);

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

  title.innerText = "Tudo certo!";
  text.innerText = "Com base nas suas respostas, vamos analisar seu perfil e identificar possíveis oportunidades acadêmicas compatíveis com seus objetivos.";
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