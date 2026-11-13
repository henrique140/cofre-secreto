let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, delay = 0) {
  if (!soundEnabled) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

const SoundFX = {
  key: () => playTone(520, "square", 0.06),
  error: () => { playTone(180, "sawtooth", 0.12); playTone(130, "sawtooth", 0.18, 0.1); },
  warn: () => { playTone(380, "square", 0.08); playTone(440, "square", 0.08, 0.08); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => playTone(f, "square", 0.15, i * 0.1)); },
  lose: () => { [392, 349, 311, 261].forEach((f, i) => playTone(f, "sawtooth", 0.2, i * 0.15)); }
};

let secretCode = generateSecret();
const inputs = [...document.querySelectorAll(".digit-input")];
const submitBtn = document.getElementById("submitBtn");
const restartBtn = document.getElementById("restartBtn");
const soundToggleBtn = document.getElementById("soundToggle");
const statusEl = document.getElementById("status");
const attemptsLeftEl = document.getElementById("attemptsLeft");
const stateValueEl = document.getElementById("stateValue");
const historyEl = document.getElementById("history");

let attemptsLeft = 20;
let gameOver = false;

soundToggleBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? "SOM: ON" : "SOM: OFF";
  if (soundEnabled) SoundFX.key();
});

function generateSecret() {
  const digits = Array.from({ length: 10 }, (_, i) => String(i));
  const shuffled = digits.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).join("");
}

function setStatus(message, type = "") {
  statusEl.innerHTML = message;
  statusEl.className = "status";
  if (type) statusEl.classList.add(type);
}

function focusNext(index) {
  if (index < inputs.length - 1) {
    inputs[index + 1].focus();
  }
}

function getCurrentGuess() {
  return inputs.map(input => input.value).join("");
}

function clearInputs() {
  inputs.forEach(input => {
    input.value = "";
    input.disabled = false;
  });
  inputs[0].focus();
}

function disableInputs() {
  inputs.forEach(input => input.disabled = true);
}

function renderHistory() {
  historyEl.innerHTML = "";
  const attempts = JSON.parse(localStorage.getItem("cofreHistorico") || "[]");

  if (!attempts.length) {
    historyEl.innerHTML = "<div style='color: var(--muted); text-align: center; padding: 20px 0; font-size: 0.65rem; line-height: 1.5;'>Vazio.</div>";
    return;
  }

  attempts.forEach(item => {
    const row = document.createElement("div");
    row.className = "attempt";

    row.innerHTML = `
      <div class="attempt-code">${item.guess}</div>
      <div class="attempt-meta">
        <div class="indicator" title="Certo e na posição certa">
          <span class="dot green"></span> ${item.certos}
        </div>
        <div class="indicator" title="Certo mas na posição errada">
          <span class="dot yellow"></span> ${item.lugarErrado}
        </div>
      </div>
    `;
    historyEl.appendChild(row);
  });
}

function saveAttempt(guess, certos, lugarErrado) {
  const attempts = JSON.parse(localStorage.getItem("cofreHistorico") || "[]");
  attempts.unshift({ guess, certos, lugarErrado });
  localStorage.setItem("cofreHistorico", JSON.stringify(attempts.slice(0, 15)));
}

function calculateFeedback(guess, secret) {
  let certos = 0;
  let lugarErrado = 0;

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      certos++;
    } else if (secret.includes(guess[i])) {
      lugarErrado++;
    }
  }

  return { certos, lugarErrado };
}

function handleGuess() {
  if (gameOver) return;

  const guess = getCurrentGuess();

  if (guess.length !== 4 || !/^\d+$/.test(guess)) {
    SoundFX.error();
    setStatus("Erro:<br>Digite 4 digitos.", "error");
    return;
  }

  if (new Set(guess).size !== 4) {
    SoundFX.error();
    setStatus("Erro:<br>Nao repita digitos.", "error");
    return;
  }

  const { certos, lugarErrado } = calculateFeedback(guess, secretCode);

  attemptsLeft--;
  attemptsLeftEl.textContent = attemptsLeft;

  saveAttempt(guess, certos, lugarErrado);
  renderHistory();

  if (certos === 4) {
    SoundFX.win();
    stateValueEl.textContent = "VENCEU";
    stateValueEl.style.color = "var(--success)";
    setStatus(`COFRE ABERTO!<br>Senha correta.`, "success");
    gameOver = true;
    disableInputs();
    return;
  }

  if (attemptsLeft === 0) {
    SoundFX.lose();
    stateValueEl.textContent = "PERDEU";
    stateValueEl.style.color = "var(--danger)";
    setStatus(`GAME OVER!<br>A senha era: ${secretCode}`, "error");
    gameOver = true;
    disableInputs();
    return;
  }

  SoundFX.warn();
  stateValueEl.textContent = "ATIVO";
  setStatus(`Quase lá!<br>Restam ${attemptsLeft} tentativas.`, "warn");
  clearInputs();
}

function resetGame() {
  SoundFX.key();
  secretCode = generateSecret();
  localStorage.removeItem("cofreHistorico");
  historyEl.innerHTML = "";
  stateValueEl.textContent = "ATIVO";
  stateValueEl.style.color = "var(--text)";
  attemptsLeft = 20;
  attemptsLeftEl.textContent = attemptsLeft;
  gameOver = false;
  clearInputs();
  setStatus("Voce tem 20 tentativas.<br>Digite uma senha.");
  renderHistory();
}

inputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 1);
    if (input.value) {
      SoundFX.key();
      if (index < inputs.length - 1) {
        focusNext(index);
      }
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace") {
      if (input.value) {
        input.value = "";
        event.preventDefault();
        return;
      }
      if (index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = "";
        event.preventDefault();
      }
      return;
    }

    if (event.key === "Enter") {
      handleGuess();
    }
  });
});

submitBtn.addEventListener("click", handleGuess);
restartBtn.addEventListener("click", resetGame);

clearInputs();
renderHistory();