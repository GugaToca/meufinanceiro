// app.js

// Referências dos elementos da interface
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const toRegisterBtn = document.getElementById("to-register");
const toLoginBtn = document.getElementById("to-login");

const loginErrorEl = document.getElementById("login-error");
const registerErrorEl = document.getElementById("register-error");

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

const transactionForm = document.getElementById("transaction-form");
const transactionErrorEl = document.getElementById("transaction-error");
const transactionSuccessEl = document.getElementById("transaction-success");
const transactionsBody = document.getElementById("transactions-body");
const emptyStateEl = document.getElementById("empty-state");

const balanceAmountEl = document.getElementById("balance-amount");
const incomeAmountEl = document.getElementById("income-amount");
const expenseAmountEl = document.getElementById("expense-amount");

const dateInput = document.getElementById("date");
const currentPeriodEl = document.getElementById("current-period");

// Estado
let currentUser = null;
let unsubscribeTransactions = null;

/* Utilidades */

function formatMoney(value) {
  const number = Number(value) || 0;
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(date) {
  if (!(date instanceof Date)) return "";
  return date.toLocaleDateString("pt-BR");
}

function clearAuthErrors() {
  loginErrorEl.textContent = "";
  registerErrorEl.textContent = "";
}

function toggleLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Aguarde...";
    button.disabled = true;
  } else {
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
    button.disabled = false;
  }
}

// Define data padrão (hoje)
(function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
  currentPeriodEl.textContent = `Hoje - ${dd}/${mm}/${yyyy}`;
})();

/* Tabs de login/cadastro */

function showLogin() {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  clearAuthErrors();
}

function showRegister() {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  clearAuthErrors();
}

tabLogin.addEventListener("click", showLogin);
tabRegister.addEventListener("click", showRegister);
toRegisterBtn.addEventListener("click", showRegister);
toLoginBtn.addEventListener("click", showLogin);

/* Autenticação */

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthErrors();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    loginErrorEl.textContent = "Preencha e-mail e senha.";
    return;
  }

  const submitBtn = loginForm.querySelector("button[type='submit']");
  toggleLoading(submitBtn, true);

  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
  } catch (error) {
    console.error("Erro no login:", error);
    let message = "Não foi possível entrar. Verifique seus dados.";
    if (error.code === "auth/user-not-found") {
      message = "Usuário não encontrado.";
    } else if (error.code === "auth/wrong-password") {
      message = "Senha incorreta.";
    } else if (error.code === "auth/invalid-email") {
      message = "E-mail inválido.";
    }
    loginErrorEl.textContent = message;
  } finally {
    toggleLoading(submitBtn, false);
  }
});

// Cadastro
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthErrors();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  if (!email || !password) {
    registerErrorEl.textContent = "Preencha e-mail e senha.";
    return;
  }
  if (password.length < 6) {
    registerErrorEl.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  const submitBtn = registerForm.querySelector("button[type='submit']");
  toggleLoading(submitBtn, true);

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    registerForm.reset();
  } catch (error) {
    console.error("Erro no cadastro:", error);
    let message = "Não foi possível criar a conta.";
    if (error.code === "auth/email-already-in-use") {
      message = "Este e-mail já está em uso.";
    } else if (error.code === "auth/invalid-email") {
      message = "E-mail inválido.";
    }
    registerErrorEl.textContent = message;
  } finally {
    toggleLoading(submitBtn, false);
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

/* Observa estado de autenticação */

auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    // Logado
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userEmailEl.textContent = user.email || "";
    userEmailEl.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    subscribeToTransactions();
  } else {
    // Não logado
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userEmailEl.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    userEmailEl.textContent = "";
    clearTransactionsUI();
    if (unsubscribeTransactions) {
      unsubscribeTransactions();
      unsubscribeTransactions = null;
    }
  }
});

/* Firestore: transações */

function getUserTransactionsRef() {
  if (!currentUser) return null;
  return db.collection("users").doc(currentUser.uid).collection("transactions");
}

function clearTransactionsUI() {
  transactionsBody.innerHTML = "";
  emptyStateEl.classList.remove("hidden");
  balanceAmountEl.textContent = "R$ 0,00";
  incomeAmountEl.textContent = "R$ 0,00";
  expenseAmountEl.textContent = "R$ 0,00";
}

// Escuta em tempo real as transações
function subscribeToTransactions() {
  if (!currentUser) return;
  const ref = getUserTransactionsRef();

  if (unsubscribeTransactions) {
    unsubscribeTransactions();
  }

  unsubscribeTransactions = ref
    .orderBy("date", "desc")
    .onSnapshot((snapshot) => {
      const docs = snapshot.docs;
      renderTransactions(docs);
    }, (error) => {
      console.error("Erro ao ouvir transações:", error);
    });
}

function renderTransactions(docs) {
  transactionsBody.innerHTML = "";

  if (!docs || docs.length === 0) {
    emptyStateEl.classList.remove("hidden");
    balanceAmountEl.textContent = "R$ 0,00";
    incomeAmountEl.textContent = "R$ 0,00";
    expenseAmountEl.textContent = "R$ 0,00";
    return;
  }

  emptyStateEl.classList.add("hidden");

  let totalIncome = 0;
  let totalExpense = 0;

  docs.forEach((doc) => {
    const data = doc.data();
    const type = data.type;
    const category = data.category || "-";
    const description = data.description || "-";
    const value = Number(data.value) || 0;
    const date = data.date && data.date.toDate ? data.date.toDate() : null;

    if (type === "entrada") {
      totalIncome += value;
    } else if (type === "saida") {
      totalExpense += value;
    }

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = date ? formatDate(date) : "-";

    const tdType = document.createElement("td");
    tdType.textContent = type === "entrada" ? "Entrada" : "Saída";
    tdType.style.color = type === "entrada" ? "#16a34a" : "#ef4444";
    tdType.style.fontWeight = "500";

    const tdCategory = document.createElement("td");
    tdCategory.textContent = category;

    const tdDesc = document.createElement("td");
    tdDesc.textContent = description;

    const tdValue = document.createElement("td");
    tdValue.textContent = formatMoney(value);
    tdValue.classList.add("right");
    tdValue.style.fontWeight = "500";

    tr.appendChild(tdDate);
    tr.appendChild(tdType);
    tr.appendChild(tdCategory);
    tr.appendChild(tdDesc);
    tr.appendChild(tdValue);

    transactionsBody.appendChild(tr);
  });

  const balance = totalIncome - totalExpense;

  incomeAmountEl.textContent = formatMoney(totalIncome);
  expenseAmountEl.textContent = formatMoney(totalExpense);
  balanceAmountEl.textContent = formatMoney(balance);
}

/* Formulário de nova transação */

transactionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  transactionErrorEl.textContent = "";
  transactionSuccessEl.textContent = "";

  if (!currentUser) {
    transactionErrorEl.textContent = "Você precisa estar logado para salvar.";
    return;
  }

  const type = document.getElementById("type").value;
  const dateStr = dateInput.value;
  const category = document.getElementById("category").value.trim();
  const description = document.getElementById("description").value.trim();
  const valueStr = document.getElementById("value").value;

  if (!dateStr || !category || !valueStr) {
    transactionErrorEl.textContent = "Preencha data, categoria e valor.";
    return;
  }

  const value = parseFloat(valueStr.replace(",", ".")); // caso digite vírgula
  if (isNaN(value) || value <= 0) {
    transactionErrorEl.textContent = "Informe um valor válido maior que zero.";
    return;
  }

  // Converte data (YYYY-MM-DD) para Date
  const [yyyy, mm, dd] = dateStr.split("-");
  const jsDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  const submitBtn = transactionForm.querySelector("button[type='submit']");
  toggleLoading(submitBtn, true);

  try {
    const ref = getUserTransactionsRef();
    await ref.add({
      type,
      category,
      description,
      value,
      date: jsDate,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    transactionSuccessEl.textContent = "Transação salva com sucesso!";
    transactionForm.reset();
    // Recoloca data atual e tipo entrada como padrão
    document.getElementById("type").value = "entrada";
    const today = new Date();
    const yyyyNow = today.getFullYear();
    const mmNow = String(today.getMonth() + 1).padStart(2, "0");
    const ddNow = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyyNow}-${mmNow}-${ddNow}`;

    setTimeout(() => {
      transactionSuccessEl.textContent = "";
    }, 2500);
  } catch (error) {
    console.error("Erro ao salvar transação:", error);
    transactionErrorEl.textContent =
      "Não foi possível salvar. Tente novamente.";
  } finally {
    toggleLoading(submitBtn, false);
  }
});
