import { useEffect, useMemo, useState } from "react";

const defaultResult = {
  disease: "No prediction yet",
  confidence: "0%",
  confidenceRaw: 0,
  matches: [],
  selectedSymptoms: [],
  timestamp: "",
  graph: {
    disease: "",
    symptoms: [],
  },
};

const defaultPatient = {
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientId: "",
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function AuthView({ mode, onModeChange, onSubmit, onBack, error, busy }) {
  const [form, setForm] = useState({ username: "", password: "" });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="auth-layout">
      <section className="info-card">
        <div className="eyebrow">Patient workflow</div>
        <h1>AyurPredict Access Portal</h1>
        <p className="lead">
          Log in first, enter patient details on the next page, then continue to the symptom
          analysis and disease graph view.
        </p>

        <div className="info-grid">
          <div className="info-item">
            <strong>Step 1</strong>
            Secure login for staff access.
          </div>
          <div className="info-item">
            <strong>Step 2</strong>
            Patient intake with name, age, gender, and patient ID.
          </div>
          <div className="info-item">
            <strong>Step 3</strong>
            Symptom selection, ranked disease results, and a disease-symptom graph.
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="brand">
          Ayur<span>Predict</span>
        </div>
        <p className="subcopy">Log in or register to continue.</p>
        <button className="ghost-btn auth-back-btn" type="button" onClick={onBack}>
          Back to Welcome Page
        </button>

        <div className="tabs">
          <button
            className={`tab ${mode === "login" ? "active" : ""}`}
            type="button"
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
          <button
            className={`tab ${mode === "register" ? "active" : ""}`}
            type="button"
            onClick={() => onModeChange("register")}
          >
            Register
          </button>
        </div>

        {error ? <div className="message error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </div>

          <button className="submit-btn" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "register" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </div>
  );
}

function WelcomeView({ onChooseMode }) {
  return (
    <div className="welcome-shell">
      <section className="welcome-hero">
        <div className="welcome-copy">
          <div className="eyebrow">Ayurvedic Clinical Support</div>
          <h1>AyurPredict</h1>
          <p className="lead">
            A guided symptom analysis workspace for ayurvedic disease assessment, patient intake,
            ranked predictions, and symptom-relationship visualization.
          </p>

          <div className="welcome-actions">
            <button className="primary-btn welcome-btn" type="button" onClick={() => onChooseMode("login")}>
              Login
            </button>
            <button className="ghost-btn welcome-btn" type="button" onClick={() => onChooseMode("register")}>
              Register
            </button>
          </div>
        </div>

        <div className="welcome-visual">
          <div className="welcome-panel">
            <h2>Smart Patient Workflow</h2>
            <p>
              Start from secure access, continue through patient intake, and move into structured
              symptom-based prediction.
            </p>
          </div>
          <div className="welcome-grid">
            <div className="welcome-card">
              <strong>Patient Intake</strong>
              Capture name, age, gender, and patient ID before analysis.
            </div>
            <div className="welcome-card">
              <strong>Symptom Analysis</strong>
              Select symptoms from a curated knowledge-driven library.
            </div>
            <div className="welcome-card">
              <strong>Disease Ranking</strong>
              Review the highest-confidence disease with matched symptom details.
            </div>
            <div className="welcome-card">
              <strong>Visual Graph</strong>
              See the selected disease in the center with related symptoms around it.
            </div>
          </div>
          <p className="welcome-credit">
            Background reference:{" "}
            <a
              href="https://www.mefohhealthcare.in/top-10-ayurvedic-medicine-manufacturers-in-india"
              target="_blank"
              rel="noreferrer"
            >
              Mefoh Healthcare
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function PatientDetailsView({ user, patient, onChange, onContinue, onLogout, error }) {
  function handleSubmit(event) {
    event.preventDefault();
    onContinue();
  }

  return (
    <div className="patient-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            Ayur<span>Predict</span>
          </div>
          <p className="sidebar-copy">
            Complete patient intake before moving to symptom analysis and prediction.
          </p>
        </div>

        <div className="side-card">
          <span className="side-label">Logged in user</span>
          <div>{user.username}</div>
        </div>

        <div className="side-card">
          <span className="side-label">Current step</span>
          <div className="side-value">01</div>
        </div>

        <nav className="side-nav">
          <button className="side-link active" type="button">
            Patient Details
          </button>
          <button className="logout-btn" type="button" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="page-title">Patient Intake Form</h1>
            <p className="page-subtitle">
              Enter the patient details here, then continue to the symptom selection page.
            </p>
          </div>
          <div className="user-badge">{user.username}</div>
        </div>

        <section className="patient-card">
          <div className="patient-intro">
            <div>
              <h2 className="panel-title">Patient Information</h2>
              <p className="panel-copy">
                These details stay with the current workflow and appear on the prediction screen.
              </p>
            </div>
            <div className="status-chip">Step 1 of 2</div>
          </div>

          {error ? <div className="message error">{error}</div> : null}

          <form className="patient-form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="patientName">Patient Name</label>
              <input
                id="patientName"
                value={patient.patientName}
                onChange={(event) => onChange("patientName", event.target.value)}
                placeholder="Enter patient name"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="patientId">Patient ID</label>
              <input
                id="patientId"
                value={patient.patientId}
                onChange={(event) => onChange("patientId", event.target.value)}
                placeholder="Enter patient ID"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="patientAge">Age</label>
              <input
                id="patientAge"
                type="number"
                min="0"
                value={patient.patientAge}
                onChange={(event) => onChange("patientAge", event.target.value)}
                placeholder="Enter age"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="patientGender">Gender</label>
              <select
                id="patientGender"
                className="select-input"
                value={patient.patientGender}
                onChange={(event) => onChange("patientGender", event.target.value)}
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="patient-form-actions">
              <button className="primary-btn" type="submit">
                Enter
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

function DiseaseGraph({ graph }) {
  const symptoms = graph?.symptoms || [];
  const center = 310;
  const centerRadius = 110;
  const nodeRadius = 74;
  const orbitRadius = 210;
  const nodePalette = ["tone-blue", "tone-teal", "tone-sand", "tone-mist"];

  if (!graph?.disease || !symptoms.length) {
    return (
      <div className="graph-empty">
        Run a prediction to show the most confident disease in the center and all of its symptoms
        around it.
      </div>
    );
  }

  return (
    <div className="graph-canvas">
      <svg className="graph-svg" viewBox="0 0 620 620" aria-hidden="true">
        {symptoms.map((symptom, index) => {
          const angle = (Math.PI * 2 * index) / symptoms.length - Math.PI / 2;
          const x1 = center + Math.cos(angle) * centerRadius;
          const y1 = center + Math.sin(angle) * centerRadius;
          const x2 = center + Math.cos(angle) * (orbitRadius - nodeRadius + 8);
          const y2 = center + Math.sin(angle) * (orbitRadius - nodeRadius + 8);

          return <line className="graph-svg-line" key={`line-${symptom}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </svg>

      <div className="graph-center">
        <span className="graph-center-label">Top disease</span>
        <strong>{graph.disease}</strong>
      </div>

      {symptoms.map((symptom, index) => {
        const angle = (Math.PI * 2 * index) / symptoms.length - Math.PI / 2;
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        const nodeStyle = {
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        };
        const toneClass = nodePalette[index % nodePalette.length];

        return (
          <div className="graph-node-wrap" key={symptom} style={nodeStyle}>
            <div className={`graph-node ${toneClass}`}>{symptom}</div>
          </div>
        );
      })}
    </div>
  );
}

function PredictionView({
  user,
  patient,
  symptoms,
  result,
  search,
  setSearch,
  selectedSymptoms,
  onToggleSymptom,
  onSelectVisible,
  onClear,
  onPredict,
  onOpenHistory,
  onBackToPatient,
  onLogout,
  error,
  busy,
}) {
  const visibleSymptoms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return symptoms.filter((symptom) => symptom.toLowerCase().includes(query));
  }, [search, symptoms]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            Ayur<span>Predict</span>
          </div>
          <p className="sidebar-copy">
            Symptom selection, disease ranking, and a visual graph based on the top prediction.
          </p>
        </div>

        <div className="side-card">
          <span className="side-label">Patient</span>
          <div>{patient.patientName}</div>
        </div>

        <div className="side-card">
          <span className="side-label">Patient ID</span>
          <div>{patient.patientId}</div>
        </div>

        <nav className="side-nav">
          <button className="side-link" type="button" onClick={onBackToPatient}>
            Patient Details
          </button>
          <button className="side-link active" type="button">
            Symptom Selection
          </button>
          <button className="side-link" type="button" onClick={onOpenHistory}>
            Prediction History
          </button>
          <button className="logout-btn" type="button" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="page-title">Symptom Analysis</h1>
            <p className="page-subtitle">
              Select symptoms for {patient.patientName}, run the prediction, and review the graph
              below.
            </p>
          </div>
          <div className="user-badge">{user.username}</div>
        </div>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Patient</span>
            <div className="summary-value patient-summary">{patient.patientName}</div>
          </div>
          <div className="summary-card">
            <span className="summary-label">Age / Gender</span>
            <div className="summary-value patient-summary">
              {patient.patientAge} / {patient.patientGender}
            </div>
          </div>
          <div className="summary-card">
            <span className="summary-label">Patient ID</span>
            <div className="summary-value patient-summary">{patient.patientId}</div>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <h2 className="panel-title">Symptom Selection</h2>
            <p className="panel-copy">
              Mark all symptoms that apply, then submit them to the backend for analysis.
            </p>

            <div className="toolbar">
              <input
                className="search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search symptoms"
              />
              <div className="actions">
                <button className="ghost-btn" type="button" onClick={() => onSelectVisible(visibleSymptoms)}>
                  Select visible
                </button>
                <button className="ghost-btn" type="button" onClick={onClear}>
                  Clear all
                </button>
                <button className="primary-btn" type="button" disabled={busy} onClick={onPredict}>
                  {busy ? "Running..." : "Run prediction"}
                </button>
              </div>
            </div>

            <div className="selection-row">
              <strong>{selectedSymptoms.length} symptoms selected</strong>
              <span>Only the selected symptoms are sent to the backend.</span>
            </div>

            {visibleSymptoms.length ? (
              <div className="symptom-grid">
                {visibleSymptoms.map((symptom) => {
                  const checked = selectedSymptoms.includes(symptom);
                  return (
                    <label className={`symptom-option ${checked ? "checked" : ""}`} key={symptom}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSymptom(symptom)}
                      />
                      <span className="symptom-label">{symptom}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="empty-list visible">No symptoms match the current search.</div>
            )}
          </div>

          <aside className="panel">
            <div className="result-header">
              <div>
                <h2 className="panel-title">Prediction Results</h2>
                <p className="panel-copy">Review the top disease and all matching disease options.</p>
              </div>
              <div className="status-chip">Ready</div>
            </div>

            {error ? <div className="message error">{error}</div> : null}

            <h3 className="result-disease">{result.disease}</h3>
            <p className="result-copy">
              {result.matches.length
                ? `Found ${result.matches.length} matching disease${result.matches.length === 1 ? "" : "s"}.`
                : "Submit a symptom set to generate a prediction summary."}
            </p>

            <div className="metric-box">
              <div className="metric-row">
                <span>Top confidence</span>
                <span>{result.confidence}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${result.confidenceRaw}%` }} />
              </div>
            </div>

            <div className="section-block">
              <h4 className="section-heading">Selected Symptoms</h4>
              <div className="selected-list">
                {(result.selectedSymptoms.length ? result.selectedSymptoms : selectedSymptoms).map((symptom) => (
                  <span className="selected-pill" key={symptom}>
                    {symptom}
                  </span>
                ))}
                {!result.selectedSymptoms.length && !selectedSymptoms.length ? (
                  <span className="selected-pill">No symptoms selected</span>
                ) : null}
              </div>
            </div>

            <div className="section-block">
              <h4 className="section-heading">Matching Diseases</h4>
              <div className="matches-list">
                {result.matches.length ? (
                  result.matches.map((match) => (
                    <div className="match-card" key={match.disease}>
                      <div className="match-head">
                        <div className="match-disease">{match.disease}</div>
                        <div className="match-confidence">{match.confidence}</div>
                      </div>
                      <div className="match-copy">
                        Matched symptoms: {match.matchedSymptoms.join(", ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="match-card">
                    <div className="match-copy">
                      Ranked disease matches will appear here after prediction.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="result-meta">
              {result.timestamp
                ? `Top result saved at ${new Date(result.timestamp).toLocaleString()}.`
                : "Predictions are stored in your account history after each successful run."}
            </p>
          </aside>
        </section>

        <section className="graph-panel">
          <div className="graph-panel-header">
            <div>
              <h2 className="panel-title">Disease Symptom Graph</h2>
              <p className="panel-copy">
                The highest-confidence disease is shown in the center, with all symptoms from the
                knowledge file arranged around it.
              </p>
            </div>
          </div>

          <DiseaseGraph graph={result.graph} />
        </section>
      </main>
    </div>
  );
}

function HistoryView({ user, patient, records, onBack, onLogout }) {
  return (
    <div className="history-shell">
      <div className="topbar history-topbar">
        <div className="brand">
          Ayur<span>Predict</span>
        </div>
        <div className="actions">
          {patient.patientName ? <div className="user-badge">{patient.patientName}</div> : null}
          <button className="ghost-btn" type="button" onClick={onBack}>
            Back to Symptoms
          </button>
          <button className="ghost-btn" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      <section className="hero">
        <h1>Prediction History</h1>
        <p>Review saved patient name, patient ID, disease, and confidence for previous predictions.</p>
      </section>

      <section className="table-panel">
        {records.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient Name</th>
                  <th>Patient ID</th>
                  <th>Predicted Disease</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td>{record.patient_name || "-"}</td>
                    <td>{record.patient_identifier || "-"}</td>
                    <td className="disease">{record.disease}</td>
                    <td>
                      <span
                        className={`badge ${
                          record.confidencePct >= 75
                            ? "high"
                            : record.confidencePct >= 50
                              ? "medium"
                              : "low"
                        }`}
                      >
                        {record.confidencePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No prediction history is available yet. Return to the symptom page and run a prediction.
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [result, setResult] = useState(defaultResult);
  const [dashboardError, setDashboardError] = useState("");
  const [history, setHistory] = useState([]);
  const [screen, setScreen] = useState("patient");
  const [search, setSearch] = useState("");
  const [patient, setPatient] = useState(defaultPatient);
  const [patientError, setPatientError] = useState("");
  const [guestScreen, setGuestScreen] = useState("welcome");

  useEffect(() => {
    api("/api/auth/session")
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setScreen("patient");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    api("/api/symptoms")
      .then((data) => setSymptoms(data.symptoms))
      .catch((error) => setDashboardError(error.message));
  }, [user]);

  async function handleAuthSubmit(form) {
    setBusy(true);
    setAuthError("");

    try {
      const path = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUser(data.user);
      setScreen("patient");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function updatePatient(field, value) {
    setPatient((current) => ({ ...current, [field]: value }));
  }

  function continueToSymptoms() {
    if (!patient.patientName.trim() || !patient.patientAge || !patient.patientGender || !patient.patientId.trim()) {
      setPatientError("Please enter patient name, age, gender, and patient ID.");
      return;
    }

    setPatientError("");
    setScreen("prediction");
  }

  function toggleSymptom(symptom) {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    );
  }

  function selectVisible(visibleSymptoms) {
    setSelectedSymptoms((current) => Array.from(new Set([...current, ...visibleSymptoms])));
  }

  function clearSelection() {
    setSelectedSymptoms([]);
    setResult(defaultResult);
    setDashboardError("");
  }

  async function runPrediction() {
    setBusy(true);
    setDashboardError("");

    try {
      const data = await api("/api/predict", {
        method: "POST",
        body: JSON.stringify({
          symptoms: selectedSymptoms,
          patient,
        }),
      });
      setResult(data);
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openHistory() {
    try {
      const data = await api("/api/history");
      setHistory(data.records);
      setScreen("history");
    } catch (error) {
      setDashboardError(error.message);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setSelectedSymptoms([]);
    setSymptoms([]);
    setHistory([]);
    setResult(defaultResult);
    setDashboardError("");
    setAuthError("");
    setPatient(defaultPatient);
    setPatientError("");
    setScreen("patient");
    setSearch("");
    setGuestScreen("welcome");
  }

  if (!user) {
    if (guestScreen === "welcome") {
      return <WelcomeView onChooseMode={(mode) => {
        setAuthMode(mode);
        setGuestScreen("auth");
      }} />;
    }

    return (
      <AuthView
        mode={authMode}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
        onBack={() => setGuestScreen("welcome")}
        error={authError}
        busy={busy}
      />
    );
  }

  if (screen === "history") {
    return (
      <HistoryView
        user={user}
        patient={patient}
        records={history}
        onBack={() => setScreen("prediction")}
        onLogout={logout}
      />
    );
  }

  if (screen === "patient") {
    return (
      <PatientDetailsView
        user={user}
        patient={patient}
        onChange={updatePatient}
        onContinue={continueToSymptoms}
        onLogout={logout}
        error={patientError}
      />
    );
  }

  return (
    <PredictionView
      user={user}
      patient={patient}
      symptoms={symptoms}
      result={result}
      search={search}
      setSearch={setSearch}
      selectedSymptoms={selectedSymptoms}
      onToggleSymptom={toggleSymptom}
      onSelectVisible={selectVisible}
      onClear={clearSelection}
      onPredict={runPrediction}
      onOpenHistory={openHistory}
      onBackToPatient={() => setScreen("patient")}
      onLogout={logout}
      error={dashboardError}
      busy={busy}
    />
  );
}
