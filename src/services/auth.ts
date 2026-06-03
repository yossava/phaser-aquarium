import { supabase } from './supabase';
import { ensureCurrentUserProfile } from './profile-sync';

let userId: string | undefined;

export function getUserId(): string | undefined {
  return userId;
}

const SALT = 'coralhaven-v1';

function deriveEmail(username: string): string {
  return `${username}@coralhaven.game`;
}

function derivePassword(username: string): string {
  return `coralhaven-${username}-v1`;
}

function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

export async function initAuth(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    userId = session.user.id;
    await ensureCurrentUserProfile();
    return;
  }

  return new Promise((resolve) => {
    const container = document.getElementById('app')!;
    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        .auth-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: linear-gradient(180deg, #0b3a4d 0%, #071b2a 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Nunito', sans-serif;
        }
        .auth-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px; padding: 32px 28px;
          width: 100%; max-width: 360px; margin: 16px;
          color: #e4f2f9;
          backdrop-filter: blur(10px);
        }
        .auth-card h1 {
          font-size: 24px; font-weight: 700; margin: 0 0 4px;
          text-align: center;
        }
        .auth-card p.subtitle {
          font-size: 13px; text-align: center; margin: 0 0 24px;
          color: rgba(255,255,255,0.5);
        }
        .auth-card label {
          display: block; font-size: 12px; font-weight: 600;
          margin-bottom: 4px; color: rgba(255,255,255,0.6);
        }
        .auth-card input {
          width: 100%; padding: 10px 12px; margin-bottom: 12px;
          border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
          background: rgba(0,0,0,0.2); color: #fff;
          font-size: 14px; font-family: inherit;
          box-sizing: border-box;
        }
        .auth-card input:focus {
          outline: none; border-color: #3ea6d6;
        }
        .auth-card button {
          width: 100%; padding: 12px; border: none;
          border-radius: 8px; font-size: 15px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          margin-top: 4px;
        }
        .auth-card button.primary {
          background: #3ea6d6; color: #fff;
        }
        .auth-card button.primary:disabled {
          opacity: 0.5; cursor: default;
        }
        .auth-card .error {
          background: rgba(255,80,80,0.15);
          color: #ff6b6b; font-size: 13px;
          padding: 8px 12px; border-radius: 8px; margin-top: 8px;
          display: none;
        }
      </style>
      <div class="auth-overlay" id="auth-overlay">
        <div class="auth-card">
          <h1>Coral Haven</h1>
          <p class="subtitle">Enter a username to start</p>
          <form id="auth-form">
            <label for="auth-username">Username</label>
            <input id="auth-username" type="text" placeholder="reefkpr42" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9]+" autocomplete="off">
            <div class="error" id="auth-error"></div>
            <button id="auth-submit" class="primary" type="submit">Enter</button>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('auth-form') as HTMLFormElement;
    const usernameInput = document.getElementById('auth-username') as HTMLInputElement;
    const submit = document.getElementById('auth-submit') as HTMLButtonElement;
    const errorEl = document.getElementById('auth-error') as HTMLDivElement;
    const overlay = document.getElementById('auth-overlay')!;

    function showError(msg: string): void {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }

    function hideError(): void {
      errorEl.style.display = 'none';
    }

    // Disallow spaces and special chars as user types
    usernameInput.addEventListener('input', () => {
      usernameInput.value = usernameInput.value.replace(/[^a-zA-Z0-9]/g, '');
      hideError();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const raw = usernameInput.value;
      const username = sanitizeUsername(raw);

      if (username.length < 3) {
        showError('Username must be at least 3 characters.');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Connecting...';

      const email = deriveEmail(username);
      const password = derivePassword(username);

      try {
        // Try signing in first
        const signInResult = await supabase.auth.signInWithPassword({ email, password });

        if (signInResult.data.user) {
          userId = signInResult.data.user.id;
          await ensureCurrentUserProfile(username);
          overlay.remove();
          resolve();
          return;
        }

        // Sign in failed — try creating a new account
        const signUpResult = await supabase.auth.signUp({ email, password });

        if (signUpResult.data.user) {
          userId = signUpResult.data.user.id;
          await ensureCurrentUserProfile(username);
          overlay.remove();
          resolve();
          return;
        }

        // signUp might return no user if email already taken (username conflict)
        if (signUpResult.error) {
          if (signUpResult.error.message.includes('already registered') || signUpResult.error.message.includes('already exists')) {
            showError(`"${username}" is already taken. Try another.`);
          } else {
            showError(signUpResult.error.message);
          }
          submit.disabled = false;
          submit.textContent = 'Enter';
          return;
        }

        showError('Something went wrong. Try again.');
        submit.disabled = false;
        submit.textContent = 'Enter';
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        showError(message);
        submit.disabled = false;
        submit.textContent = 'Enter';
      }
    });
  });
}
