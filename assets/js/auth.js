import { getFirebaseClient } from './firebase-client.js';

const form = document.getElementById('authForm');
const registering = document.body.dataset.authPage === 'register';
const alertBox = document.getElementById('formAlert');
const submitButton = document.getElementById('submitButton');
let client;
let submitting = false;

function alertMessage(message, success = false) {
  alertBox.textContent = message;
  alertBox.classList.toggle('success', success);
  alertBox.hidden = false;
}

function clearErrors() {
  alertBox.hidden = true;
  form.querySelectorAll('.field').forEach(field => field.classList.remove('invalid'));
  form.querySelectorAll('input[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
}

function fieldError(id, message) {
  const input = document.getElementById(id);
  input.closest('.field').classList.add('invalid');
  input.setAttribute('aria-invalid', 'true');
  document.getElementById(`${id}Error`).textContent = message;
  return input;
}

function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect. Please try again.',
    'auth/wrong-password': 'Email or password is incorrect. Please try again.',
    'auth/user-not-found': 'Email or password is incorrect. Please try again.',
    'auth/user-disabled': 'This account is disabled. Contact your administrator.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network unavailable. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase Authentication.'
  };
  return messages[error?.code] || 'Something went wrong. Please try again.';
}

form.addEventListener('input', event => {
  if (!event.target.matches('input')) return;
  event.target.removeAttribute('aria-invalid');
  const field = event.target.closest('.field');
  field?.classList.remove('invalid');
  const error = document.getElementById(`${event.target.id}Error`);
  if (error) error.textContent = '';
});

document.querySelectorAll('[data-toggle-password]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(showing));
    button.setAttribute('aria-label', `${showing ? 'Hide' : 'Show'} ${input.id === 'confirmPassword' ? 'confirm password' : 'password'}`);
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearErrors();
  const name = registering ? document.getElementById('displayName').value.trim() : '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm = registering ? document.getElementById('confirmPassword').value : '';
  let firstInvalid;
  if (registering && !name) firstInvalid = fieldError('displayName', 'Enter your name.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const invalid = fieldError('email', 'Enter a valid email address.');
    firstInvalid ||= invalid;
  }
  if (!password || (registering && password.length < 6)) {
    const invalid = fieldError('password', registering ? 'Use at least 6 characters.' : 'Enter your password.');
    firstInvalid ||= invalid;
  }
  if (registering && confirm !== password) {
    const invalid = fieldError('confirmPassword', 'Passwords do not match.');
    firstInvalid ||= invalid;
  }
  if (firstInvalid) { firstInvalid.focus(); return; }

  submitButton.disabled = true;
  submitting = true;
  submitButton.querySelector('span').textContent = registering ? 'Creating account…' : 'Signing in…';
  try {
    client ||= await getFirebaseClient();
    if (registering) {
      const result = await client.authSdk.createUserWithEmailAndPassword(client.auth, email, password);
      await client.authSdk.updateProfile(result.user, { displayName: name }).catch(() => {});
    } else {
      await client.authSdk.signInWithEmailAndPassword(client.auth, email, password);
    }
    window.location.replace('index.php');
  } catch (error) {
    alertMessage(friendlyError(error));
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = registering ? 'Create account' : 'Sign in to dashboard';
    submitting = false;
  }
});

const resetButton = document.getElementById('resetPassword');
resetButton?.addEventListener('click', async () => {
  clearErrors();
  const emailInput = document.getElementById('email');
  const email = emailInput.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldError('email', 'Enter your email address first, then select Forgot password.').focus();
    return;
  }
  resetButton.disabled = true;
  try {
    client ||= await getFirebaseClient();
    await client.authSdk.sendPasswordResetEmail(client.auth, email);
    alertMessage('If an account uses this email, a password reset link is on its way.', true);
  } catch (error) {
    alertMessage(friendlyError(error));
  } finally {
    resetButton.disabled = false;
  }
});

try {
  client = await getFirebaseClient();
  const user = await new Promise(resolve => {
    const unsubscribe = client.authSdk.onAuthStateChanged(client.auth, currentUser => {
      unsubscribe();
      resolve(currentUser);
    }, () => resolve(null));
  });
  if (user && !user.isAnonymous && !submitting) window.location.replace('index.php');
} catch (error) {
  alertMessage(error.message || 'Unable to load sign-in. Check your connection and reload.');
  submitButton.disabled = true;
}
