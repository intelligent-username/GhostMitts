import { useState } from "react";

interface AuthPanelProps {
  username: string | null;
  isBusy: boolean;
  apiConnected: boolean | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AuthPanel({ username, isBusy, apiConnected, onLogin, onRegister, onLogout }: AuthPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const uname = formUsername.trim();
    const pwd = formPassword;

    if (!uname || !pwd) {
      setError("Username and password are required.");
      return;
    }

    try {
      if (mode === "login") {
        await onLogin(uname, pwd);
      } else {
        await onRegister(uname, pwd);
      }
      setFormPassword("");
      setIsOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Authentication failed";
      setError(message);
    }
  };

  return (
    <div className="auth-panel">
      {username ? (
        <div className="auth-logged-in">
          <span className="auth-user">Signed in as {username}</span>
          <button className="auth-secondary-btn" onClick={() => onLogout()} disabled={isBusy}>
            {isBusy ? "..." : "Log out"}
          </button>
        </div>
      ) : (
        <button className="auth-link-prompt" onClick={() => setIsOpen(true)}>
          Log in to save your presets and sessions
        </button>
      )}

      <div className={`auth-connection ${apiConnected === true ? "ok" : apiConnected === false ? "down" : "pending"}`}>
        {apiConnected === null ? "Checking API..." : apiConnected ? "API connected" : "API offline"}
      </div>

      {isOpen && (
        <div className="auth-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-top">
              <h3>{mode === "login" ? "Login" : "Create account"}</h3>
              <button className="auth-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="auth-switch-row">
              <button
                type="button"
                className={`auth-switch-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-switch-btn ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            <div className="auth-form-viewport">
              <div className={`auth-form-track ${mode === "register" ? "register" : "login"}`}>
                <div className="auth-form-page">
                  <p className="auth-mode-copy">Welcome back. Sign in to sync your presets.</p>

                  <div className="auth-form-row">
                    <label>Username</label>
                    <input
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="auth-input"
                      autoComplete="username"
                      maxLength={64}
                    />
                  </div>

                  <div className="auth-form-row">
                    <label>Password</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="auth-input"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="auth-form-page">
                  <p className="auth-mode-copy">Create an account to store presets and daily stats.</p>

                  <div className="auth-form-row">
                    <label>Username</label>
                    <input
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="auth-input"
                      autoComplete="username"
                      maxLength={64}
                    />
                  </div>

                  <div className="auth-form-row">
                    <label>Password</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="auth-input"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" onClick={submit} disabled={isBusy}>
              {isBusy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
