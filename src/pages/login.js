// Login. There's no sign-up anywhere: your one account was made by hand in
// Supabase, and public sign-ups are switched off.
import { supabase } from '../lib/supabase.js';

export function renderLogin(root) {
  root.innerHTML = `
    <div class="login">
      <section class="login__intro">
        <p class="kicker">Desk</p>
        <h1>Back at it.</h1>
        <p class="login__aside">Log in once on this device and it'll remember you.</p>
      </section>

      <form class="login__card" novalidate>
        <label class="field">
          <span>Email</span>
          <input name="email" type="email" autocomplete="username" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn--primary" type="submit">Let me in</button>
      </form>
    </div>
  `;

  const form = root.querySelector('form');
  const errorEl = root.querySelector('.form-error');
  const button = form.querySelector('button');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // stop the browser's default "reload the page" submit
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) {
      showError('Need both of those.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Checking…';
    errorEl.hidden = true;

    // Supabase checks the password and, if it's right, stores a session in
    // localStorage. main.js is listening for that and swaps in the app.
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      button.disabled = false;
      button.textContent = 'Let me in';
      showError(
        error.status === 400
          ? "That email and password don't match."
          : "Couldn't reach the server. Check your connection?",
      );
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
}
