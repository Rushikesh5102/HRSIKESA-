// Sovereign Calculator Logic - Engineered by Gāṇḍīva
let currentInput = '0';
let previousInput = '';
let operation = null;
let shouldResetScreen = false;

const mainDisplay = document.getElementById('mainDisplay');
const historyDisplay = document.getElementById('historyDisplay');

function updateDisplay() {
  mainDisplay.textContent = currentInput;
  if (operation != null) {
    historyDisplay.textContent = `${previousInput} ${getOperatorSymbol(operation)}`;
  } else {
    historyDisplay.textContent = '';
  }
}

function getOperatorSymbol(op) {
  switch (op) {
    case '+': return '+';
    case '-': return '−';
    case '*': return '×';
    case '/': return '÷';
    default: return '';
  }
}

function appendNumber(number) {
  if (currentInput === '0' || shouldResetScreen) {
    if (number === '.') {
      currentInput = '0.';
    } else {
      currentInput = number;
    }
    shouldResetScreen = false;
  } else {
    if (number === '.' && currentInput.includes('.')) return;
    currentInput += number;
  }
  updateDisplay();
}

function appendOperator(op) {
  if (operation !== null && !shouldResetScreen) {
    computeResult();
  }
  previousInput = currentInput;
  operation = op;
  shouldResetScreen = true;
  updateDisplay();
}

function computeResult() {
  if (operation === null || shouldResetScreen) return;
  
  let computation;
  const prev = parseFloat(previousInput);
  const current = parseFloat(currentInput);

  if (isNaN(prev) || isNaN(current)) return;

  switch (operation) {
    case '+':
      computation = prev + current;
      break;
    case '-':
      computation = prev - current;
      break;
    case '*':
      computation = prev * current;
      break;
    case '/':
      if (current === 0) {
        currentInput = 'Error: Div/0';
        operation = null;
        previousInput = '';
        shouldResetScreen = true;
        updateDisplay();
        return;
      }
      computation = prev / current;
      break;
    default:
      return;
  }

  // Round to prevent floating-point anomalies
  currentInput = (Math.round(computation * 100000000) / 100000000).toString();
  historyDisplay.textContent = `${prev} ${getOperatorSymbol(operation)} ${current} =`;
  operation = null;
  previousInput = '';
  shouldResetScreen = true;
  mainDisplay.textContent = currentInput;
}

function clearAll() {
  currentInput = '0';
  previousInput = '';
  operation = null;
  shouldResetScreen = false;
  updateDisplay();
}

function deleteLast() {
  if (shouldResetScreen) return;
  if (currentInput.length === 1 || currentInput === 'Error: Div/0') {
    currentInput = '0';
  } else {
    currentInput = currentInput.slice(0, -1);
  }
  updateDisplay();
}

function applyPercentage() {
  const current = parseFloat(currentInput);
  if (isNaN(current)) return;
  currentInput = (current / 100).toString();
  updateDisplay();
}

function calculateSquareRoot() {
  const current = parseFloat(currentInput);
  if (isNaN(current) || current < 0) {
    currentInput = 'Error: Invalid';
    shouldResetScreen = true;
    updateDisplay();
    return;
  }
  currentInput = (Math.round(Math.sqrt(current) * 100000000) / 100000000).toString();
  historyDisplay.textContent = `√(${current}) =`;
  shouldResetScreen = true;
  mainDisplay.textContent = currentInput;
}

// Keyboard shortcuts support
window.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
  if (e.key === '.') appendNumber('.');
  if (e.key === '=' || e.key === 'Enter') computeResult();
  if (e.key === 'Backspace') deleteLast();
  if (e.key === 'Escape') clearAll();
  if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') appendOperator(e.key);
  if (e.key === '%') applyPercentage();
});
