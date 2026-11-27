import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

export default function App() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState(null); // { type, title, detail, bloom }
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/stats`);
      setStats(await res.json());
      setError("");
    } catch {
      setError("Cannot reach the backend. Is it running on port 5000?");
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const addHistory = (entry) => setHistory((h) => [entry, ...h].slice(0, 8));

  const check = async () => {
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/check/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      let view;
      if (data.source === "bloom") {
        view = {
          type: "success",
          title: `"${data.username}" is available`,
          detail: "Bloom filter found a 0 bit, so the name is definitely new. The database was not queried.",
        };
      } else if (data.available) {
        view = {
          type: "warning",
          title: `"${data.username}" is available`,
          detail: "All bits were 1 (false positive), so the database was queried and it is actually free.",
        };
      } else {
        view = {
          type: "danger",
          title: `"${data.username}" is taken`,
          detail: "All bits were 1, so the database was queried and it confirmed the name exists.",
        };
      }
      setResult({ ...view, bloom: data.bloom });
      addHistory({ action: "Check", username: data.username, outcome: view.type });
      setError("");
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
      loadStats();
    }
  };

  const register = async () => {
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      const data = await res.json();
      const ok = res.ok;
      setResult({
        type: ok ? "success" : "danger",
        title: ok ? `Registered "${data.username}"` : data.message,
        detail: ok ? "Saved to MongoDB and added to the Bloom filter." : "Pick a different username.",
      });
      addHistory({ action: "Register", username: name.toLowerCase(), outcome: ok ? "success" : "danger" });
      setError("");
    } catch {
      setError("Cannot reach the backend. Is it running on port 5000?");
    } finally {
      setLoading(false);
      loadStats();
    }
  };

  const onKey = (e) => e.key === "Enter" && check();

  return (
    <div className="page">
      <header>
        <h1>Bloom Filter</h1>
        <p>Username availability checker. A Bloom filter answers first and MongoDB is only asked when needed.</p>
      </header>

      <section className="card">
        <div className="row">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={onKey}
            placeholder="Enter a username"
            autoFocus
          />
          <button onClick={check} disabled={loading || !username.trim()}>Check</button>
          <button className="secondary" onClick={register} disabled={loading || !username.trim()}>
            Register
          </button>
        </div>

        {error && <div className="banner danger">{error}</div>}

        {result && (
          <div className={`banner ${result.type}`}>
            <strong>{result.title}</strong>
            <span>{result.detail}</span>
          </div>
        )}

        {result?.bloom && (
          <div className="bits">
            <h3>Bit positions checked</h3>
            <div className="chips">
              {result.bloom.map((b) => (
                <span key={b.position} className={`chip ${b.bit ? "one" : "zero"}`}>
                  #{b.position} = {b.bit}
                </span>
              ))}
            </div>
            <small>Any 0 means "definitely not in the set". All 1s means "probably in the set".</small>
          </div>
        )}
      </section>

      {stats && (
        <section className="card">
          <h3>Stats</h3>
          <div className="grid">
            <Stat label="Total checks" value={stats.totalChecks} />
            <Stat label="DB queries saved" value={stats.dbHitsSaved} accent="green" />
            <Stat label="DB queries made" value={stats.dbHits} />
            <Stat label="False positives" value={stats.falsePositives} accent="amber" />
            <Stat label="Items in filter" value={stats.itemsAdded} />
            <Stat label="Bits set" value={`${stats.fillPercent}%`} />
          </div>
          <p className="muted">
            Filter size: {stats.filterBits.toLocaleString()} bits, {stats.hashesPerItem} positions per username
          </p>
        </section>
      )}

      {history.length > 0 && (
        <section className="card">
          <h3>Recent activity</h3>
          <ul className="history">
            {history.map((h, i) => (
              <li key={i}>
                <span className={`dot ${h.outcome}`} />
                <b>{h.action}</b> {h.username}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat ${accent || ""}`}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
