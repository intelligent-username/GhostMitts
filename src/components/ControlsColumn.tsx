import { AuthPanel } from "./AuthPanel";

interface ControlsColumnProps {
  mode: "time" | "combos";
  setMode: (mode: "time" | "combos") => void;
  timeInputMin: string;
  setTimeInputMin: (val: string) => void;
  timeInputSec: string;
  setTimeInputSec: (val: string) => void;
  comboInput: string;
  setComboInput: (val: string) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  isSessionActive: boolean;
  hasStarted: boolean;
  username: string | null;
  authBusy: boolean;
  apiConnected: boolean | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function ControlsColumn({
  mode,
  setMode,
  timeInputMin,
  setTimeInputMin,
  timeInputSec,
  setTimeInputSec,
  comboInput,
  setComboInput,
  onStart,
  onPause,
  onReset,
  isSessionActive,
  hasStarted,
  username,
  authBusy,
  apiConnected,
  onLogin,
  onRegister,
  onLogout,
}: ControlsColumnProps) {
  return (
    <div className="controls-col">
      <div className="toggle-container">
        <button
          className={`toggle-btn ${mode === "time" ? "active" : ""}`}
          onClick={() => setMode("time")}
        >
          Time
        </button>
        <button
          className={`toggle-btn ${mode === "combos" ? "active" : ""}`}
          onClick={() => setMode("combos")}
        >
          Combos
        </button>
      </div>

      <div className="controls">
        {mode === "time" ? (
          <div className="time-inputs">
            <div className="input-group">
              <span className="input-label">Min</span>
              <input
                type="number"
                className="styled-input"
                value={timeInputMin}
                onChange={e => setTimeInputMin(e.target.value)}
                min="0"
              />
            </div>
            <div className="input-group">
              <span className="input-label">Sec</span>
              <input
                type="number"
                className="styled-input"
                value={timeInputSec}
                onChange={e => setTimeInputSec(e.target.value)}
                min="0"
                max="59"
              />
            </div>
          </div>
        ) : (
          <div className="input-group">
            <span className="input-label">How Many?</span>
            <input
              type="number"
              className="styled-input"
              value={comboInput}
              onChange={e => setComboInput(e.target.value)}
              min="1"
            />
          </div>
        )}

        <div className="button-group">
          {!isSessionActive && (
            <button className="start-btn" onClick={onStart}>
              {hasStarted ? "RESUME" : "START"}
            </button>
          )}
          {isSessionActive && (
            <button className="pause-btn" onClick={onPause}>
              PAUSE
            </button>
          )}
          {hasStarted && (
            <button className="reset-btn" onClick={onReset}>
              END / RESET
            </button>
          )}
        </div>
      </div>
      
      <AuthPanel
        username={username}
        isBusy={authBusy}
        apiConnected={apiConnected}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
      />
    </div>
  );
}
