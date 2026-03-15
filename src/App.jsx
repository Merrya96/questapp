import { useState, useEffect, useRef } from "react";
import { genererQuetes, demanderCoach, genererProchaineQuestion, genererProgrammeComplet } from "./coach.js";

const MOT_DE_PASSE = "2501";

const SL = {
  bg: "#0a0e1a", bgCard: "#111827", bgSecondary: "#0d1526",
  border: "#1e3a5f", borderGlow: "#00b4d8",
  cyan: "#00b4d8", cyanLight: "#90e0ef",
  green: "#00f5a0", yellow: "#ffd60a",
  red: "#ff4d6d", purple: "#9b5de5",
  text: "#e0f4ff", muted: "#7ea8c4",
};

const CATEGORY_COLORS = {
  Physique: { bg: "#0d2b1a", text: "#00f5a0", border: "#00f5a0" },
  Nutrition: { bg: "#2b1a0d", text: "#ffd60a", border: "#ffd60a" },
  Escalade: { bg: "#1a0d2b", text: "#9b5de5", border: "#9b5de5" },
  Technique: { bg: "#1a0d2b", text: "#9b5de5", border: "#9b5de5" },
  Mental: { bg: "#0d1a2b", text: "#00b4d8", border: "#00b4d8" },
  Théorie: { bg: "#0d1a2b", text: "#00b4d8", border: "#00b4d8" },
  default: { bg: "#1a1a2b", text: "#7ea8c4", border: "#7ea8c4" },
};

function getCatColor(cat) { return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default; }
const DEFAULT_PROFIL = { poids: 62.1, graissePercent: 16.9, muscle: 49, proteines: 87, cotation: "6b+", semaine: 1 };
function aujourdhui() { return new Date().toISOString().split("T")[0]; }
function load(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

function SLCard({ children, style = {}, color = SL.borderGlow, glow = false }) {
  return (
    <div style={{ background: SL.bgCard, border: `1px solid ${color}`, borderRadius: 4, padding: "14px 16px", position: "relative", boxShadow: glow ? `0 0 12px ${color}40, inset 0 0 20px ${color}08` : "none", ...style }}>
      <div style={{ position: "absolute", top: -1, left: -1, width: 12, height: 12, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <div style={{ position: "absolute", top: -1, right: -1, width: 12, height: 12, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      <div style={{ position: "absolute", bottom: -1, left: -1, width: 12, height: 12, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      {children}
    </div>
  );
}

function SLButton({ children, onClick, color = SL.cyan, style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: "transparent", border: `1px solid ${color}`, color, padding: "10px 20px", fontSize: 13, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, textTransform: "uppercase", boxShadow: disabled ? "none" : `0 0 8px ${color}40`, ...style }}>
      {children}
    </button>
  );
}

function LoginScreen({ onLogin }) {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(false);
  function tenter() {
    if (code === MOT_DE_PASSE) { save("auth", true); onLogin(); }
    else { setErreur(true); setCode(""); setTimeout(() => setErreur(false), 2000); }
  }
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: SL.bg, padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: SL.cyan, letterSpacing: 4, marginBottom: 8, textTransform: "uppercase" }}>Système d'accès</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: SL.text, letterSpacing: 2, marginBottom: 4, fontFamily: "'Orbitron', sans-serif" }}>QUEST APP</div>
        <div style={{ fontSize: 12, color: SL.muted, marginBottom: 32 }}>[ Accès privé — identification requise ]</div>
        <SLCard color={erreur ? SL.red : SL.cyan} glow={!erreur} style={{ padding: 24 }}>
          <div style={{ fontSize: 11, color: SL.muted, marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" }}>Code d'accès</div>
          <input type="password" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && tenter()} autoFocus style={{ width: "100%", background: SL.bgSecondary, border: `1px solid ${erreur ? SL.red : SL.border}`, color: SL.cyan, fontSize: 24, padding: "10px", textAlign: "center", letterSpacing: 12, outline: "none", marginBottom: erreur ? 8 : 16, fontFamily: "'Orbitron', sans-serif" }} />
          {erreur && <div style={{ fontSize: 11, color: SL.red, marginBottom: 12, letterSpacing: 1 }}>[ CODE INCORRECT ]</div>}
          <SLButton onClick={tenter} disabled={code.length === 0} style={{ width: "100%" }}>Accéder →</SLButton>
        </SLCard>
      </div>
    </div>
  );
}

function OnboardingConversationnel({ nomProjet, objetProjet, onTerminer }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("conversation");
  const [programme, setProgramme] = useState(null);
  const [ajustement, setAjustement] = useState("");
  const [erreurMsg, setErreurMsg] = useState(null);
  const bottomRef = useRef(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    poserProchaineQuestion([]);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, phase]);

  const nbQuestions = messages.filter(m => m.role === "coach").length;
  const presque = nbQuestions >= 4;

  async function poserProchaineQuestion(hist) {
    setLoading(true);
    setErreurMsg(null);
    try {
      const result = await genererProchaineQuestion(nomProjet, objetProjet, hist);
      if (result.termine) {
        setPhase("synthesis");
        await genererProgramme(hist);
      } else {
        setMessages(prev => [...prev, { role: "coach", text: result.question }]);
      }
    } catch (e) {
      console.error("Erreur question:", e);
      setErreurMsg("Erreur de connexion. Réessaie.");
    }
    setLoading(false);
  }

  async function genererProgramme(hist) {
    setLoading(true);
    try {
      const prog = await genererProgrammeComplet(nomProjet, objetProjet, hist);
      setProgramme(prog);
      setPhase("validation");
    } catch (e) {
      console.error("Erreur programme:", e);
      setErreurMsg("Erreur lors de la génération : " + e.message);
      setPhase("conversation");
    }
    setLoading(false);
  }

  async function envoyerReponse() {
    if (!inputValue.trim() || loading) return;
    const reponse = inputValue.trim();
    setInputValue("");
    const newMessages = [...messages, { role: "user", text: reponse }];
    setMessages(newMessages);
    await poserProchaineQuestion(newMessages);
  }

  async function demanderAjustement() {
    if (!ajustement.trim()) return;
    const msg = ajustement.trim();
    setAjustement("");
    setPhase("synthesis");
    const newMessages = [...messages, { role: "user", text: `Ajustement : ${msg}` }];
    setMessages(newMessages);
    await genererProgramme(newMessages);
  }

  if (phase === "synthesis") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${SL.border}`, borderTop: `2px solid ${SL.cyan}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
        <div style={{ fontSize: 12, color: SL.cyan, letterSpacing: 2, textAlign: "center", marginBottom: 8 }}>ANALYSE EN COURS...</div>
        <div style={{ fontSize: 10, color: SL.muted, letterSpacing: 1, textAlign: "center" }}>Génération de ton programme personnalisé</div>
      </div>
    );
  }

  if (phase === "validation" && programme) {
    return (
      <div>
        <div style={{ fontSize: 10, color: SL.green, letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>[ Programme généré — Validation requise ]</div>

        <SLCard color={SL.green} glow style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: SL.green, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>Résumé du profil</div>
          <div style={{ fontSize: 12, color: SL.text, lineHeight: 1.7, marginBottom: 10 }}>{programme.resume}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, border: `1px solid ${SL.cyan}`, color: SL.cyan, padding: "2px 8px", letterSpacing: 1 }}>NIV. {programme.niveau?.toUpperCase()}</span>
            {programme.pointsForts?.map((p, i) => <span key={i} style={{ fontSize: 10, border: `1px solid ${SL.green}`, color: SL.green, padding: "2px 8px" }}>+ {p}</span>)}
            {programme.pointsFaibles?.map((p, i) => <span key={i} style={{ fontSize: 10, border: `1px solid ${SL.yellow}`, color: SL.yellow, padding: "2px 8px" }}>⚠ {p}</span>)}
          </div>
        </SLCard>

        <SLCard color={SL.cyan} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: SL.cyan, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>Plan d'action — 4 semaines</div>
          {programme.planAction && Object.entries(programme.planAction).map(([sem, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: SL.cyan, width: 60, flexShrink: 0, letterSpacing: 1, paddingTop: 1 }}>SEM. {i + 1}</div>
              <div style={{ fontSize: 12, color: SL.text, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </SLCard>

        <SLCard color={SL.purple} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: SL.purple, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>Objectifs</div>
          <div style={{ fontSize: 11, color: SL.muted, marginBottom: 4, letterSpacing: 1 }}>1 MOIS →</div>
          <div style={{ fontSize: 12, color: SL.text, marginBottom: 8 }}>{programme.objectif1mois}</div>
          <div style={{ fontSize: 11, color: SL.muted, marginBottom: 4, letterSpacing: 1 }}>3 MOIS →</div>
          <div style={{ fontSize: 12, color: SL.text }}>{programme.objectif3mois}</div>
        </SLCard>

        <SLCard color={SL.border} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: SL.muted, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Logique du programme</div>
          <div style={{ fontSize: 12, color: SL.text, lineHeight: 1.6, fontStyle: "italic" }}>{programme.logique}</div>
        </SLCard>

        <SLButton onClick={() => onTerminer(programme)} color={SL.green} style={{ width: "100%", marginBottom: 10 }}>✓ Valider et lancer les quêtes</SLButton>

        <div style={{ marginBottom: 8 }}>
          <textarea value={ajustement} onChange={e => setAjustement(e.target.value)} placeholder="Un ajustement ? (ex: moins de séances par semaine...)" style={{ width: "100%", background: SL.bgSecondary, border: `1px solid ${SL.border}`, color: SL.text, fontSize: 12, padding: "8px 10px", resize: "none", outline: "none", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.5, boxSizing: "border-box" }} rows={2} />
          <SLButton onClick={demanderAjustement} disabled={!ajustement.trim()} color={SL.yellow} style={{ width: "100%", marginTop: 6 }}>Demander un ajustement →</SLButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: SL.cyan, letterSpacing: 3, marginBottom: 2 }}>[ ENTRETIEN DE DÉCOUVERTE ]</div>
          <div style={{ fontSize: 13, color: SL.text, letterSpacing: 1 }}>{nomProjet}</div>
        </div>
        <div style={{ fontSize: 9, color: presque ? SL.green : SL.muted, letterSpacing: 1, textAlign: "right", border: `1px solid ${presque ? SL.green : SL.border}`, padding: "3px 8px" }}>
          {presque ? "[ PRESQUE PRÊT ]" : "[ EN COURS ]"}
        </div>
      </div>

      <div style={{ height: 3, background: SL.border, marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${Math.min(100, (nbQuestions / 5) * 100)}%`, background: presque ? SL.green : SL.cyan, boxShadow: `0 0 6px ${presque ? SL.green : SL.cyan}`, transition: "width 0.4s" }} />
      </div>

      {erreurMsg && <div style={{ fontSize: 11, color: SL.red, marginBottom: 10, letterSpacing: 1, border: `1px solid ${SL.red}`, padding: "6px 10px" }}>[ {erreurMsg} ]</div>}

      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12, minHeight: 300 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "coach" && <div style={{ fontSize: 9, color: SL.cyan, letterSpacing: 2, marginBottom: 3 }}>[ COACH ]</div>}
            <div style={{ fontSize: 13, lineHeight: 1.6, padding: "8px 12px", maxWidth: "88%", background: m.role === "user" ? SL.bgSecondary : SL.bgCard, border: `1px solid ${m.role === "user" ? SL.cyan : SL.border}`, color: m.role === "user" ? SL.cyan : SL.text, boxShadow: m.role === "user" ? `0 0 6px ${SL.cyan}30` : "none" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, color: SL.cyan, letterSpacing: 2 }}>[ COACH ]</div>
            <div style={{ fontSize: 11, color: SL.muted, animation: "pulse 1s infinite" }}>...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: `1px solid ${SL.border}`, paddingTop: 12 }}>
        <textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerReponse(); } }}
          placeholder="Ta réponse... (Entrée pour envoyer)"
          disabled={loading}
          style={{ width: "100%", background: SL.bgSecondary, border: `1px solid ${SL.border}`, color: SL.text, fontSize: 13, padding: "8px 10px", resize: "none", outline: "none", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 8, opacity: loading ? 0.5 : 1 }}
          rows={2}
        />
        <SLButton onClick={envoyerReponse} disabled={!inputValue.trim() || loading} style={{ width: "100%" }}>Envoyer →</SLButton>
      </div>
    </div>
  );
}

export default function App() {
  const [authentifie, setAuthentifie] = useState(() => load("auth", false));
  const [tab, setTab] = useState("quests");
  const [quests, setQuests] = useState(() => { const d = load("quests_date", null); return d === aujourdhui() ? load("quests", []) : []; });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [profil, setProfil] = useState(() => load("profil", DEFAULT_PROFIL));
  const [editingMetric, setEditingMetric] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [historique, setHistorique] = useState(() => load("historique", []));
  const [projets, setProjets] = useState(() => load("projets", []));
  const [projetActif, setProjetActif] = useState(() => load("projetActif", null));
  const [onboarding, setOnboarding] = useState(null);
  const [chatMessages, setChatMessages] = useState([{ role: "ai", text: "Système initialisé. Je suis ton coach personnel. Quel est ton état aujourd'hui ?" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { save("quests", quests); save("quests_date", aujourdhui()); }, [quests]);
  useEffect(() => { save("profil", profil); }, [profil]);
  useEffect(() => { save("projets", projets); }, [projets]);
  useEffect(() => { save("projetActif", projetActif); }, [projetActif]);

  useEffect(() => {
    const lastDate = load("quests_date", null);
    if (lastDate && lastDate !== aujourdhui()) {
      const oldQuests = load("quests", []);
      if (oldQuests.length > 0) {
        const resume = `${oldQuests.filter(q => q.done).length}/${oldQuests.length} quêtes accomplies`;
        const newHisto = [{ date: lastDate, resume, quests: oldQuests }, ...historique].slice(0, 30);
        setHistorique(newHisto); save("historique", newHisto);
      }
      setQuests([]);
    }
  }, []);

  if (!authentifie) return <LoginScreen onLogin={() => setAuthentifie(true)} />;

  const doneCount = quests.filter(q => q.done).length;
  const totalCount = quests.length;

  async function lancerQuetes() {
    setLoading(true); setError(null);
    try {
      const pp = projetActif?.profilProjet || null;
      const nouvelles = await genererQuetes(profil, historique.slice(0, 3), pp);
      setQuests(nouvelles.map((q, i) => ({ ...q, id: i + 1, done: false })));
    } catch { setError("Erreur de connexion au système."); }
    setLoading(false);
  }

  async function envoyerMessage() {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim(); setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const reponse = await demanderCoach(msg, profil, historique.slice(0, 3), projetActif?.profilProjet || null);
      setChatMessages(prev => [...prev, { role: "ai", text: reponse }]);
    } catch { setChatMessages(prev => [...prev, { role: "ai", text: "[ Erreur de connexion ]" }]); }
    setChatLoading(false);
  }

  function toggleQuest(id) { setQuests(prev => prev.map(q => q.id === id ? { ...q, done: !q.done } : q)); }
  function startEdit(key, value) { setEditingMetric(key); setTempValue(value); }
  function saveMetric(key) { setProfil(prev => ({ ...prev, [key]: parseFloat(tempValue) || tempValue })); setEditingMetric(null); }

  function supprimerProjet(id) {
    const newProjets = projets.filter(p => p.id !== id);
    setProjets(newProjets);
    if (projetActif?.id === id) { setProjetActif(newProjets.length > 0 ? newProjets[0] : null); setQuests([]); }
  }

  function demarrerOnboarding(nomProjet, objetProjet) { setOnboarding({ nomProjet, objetProjet }); }

  function terminerOnboarding(profilProjet) {
    const newProjet = { id: Date.now(), nom: onboarding.nomProjet, objetProjet: onboarding.objetProjet, profilProjet, dateCreation: aujourdhui() };
    const newProjets = [...projets, newProjet];
    setProjets(newProjets); setProjetActif(newProjet);
    setOnboarding(null); setTab("quests"); setQuests([]);
  }

  const grouped = quests.reduce((acc, q) => { if (!acc[q.category]) acc[q.category] = []; acc[q.category].push(q); return acc; }, {});

  if (onboarding) {
    return (
      <div style={styles.root}><div style={styles.phone}>
        <div style={styles.header}>
          <button style={{ background: "none", border: "none", color: SL.cyan, fontSize: 13, cursor: "pointer", letterSpacing: 1 }} onClick={() => setOnboarding(null)}>← ANNULER</button>
        </div>
        <div style={{ ...styles.body, display: "flex", flexDirection: "column" }}>
          <OnboardingConversationnel nomProjet={onboarding.nomProjet} objetProjet={onboarding.objetProjet} onTerminer={terminerOnboarding} />
        </div>
      </div></div>
    );
  }

  return (
    <div style={styles.root}><div style={styles.phone}>
      <div style={styles.header}>
        {selectedQuest ? <button style={{ background: "none", border: "none", color: SL.cyan, fontSize: 13, cursor: "pointer", letterSpacing: 1 }} onClick={() => setSelectedQuest(null)}>← RETOUR</button> : (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: SL.text, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron', sans-serif" }}>{tabLabel(tab)}</div>
            {projetActif && tab === "quests" && <div style={{ fontSize: 10, color: SL.cyan, marginTop: 2, letterSpacing: 1 }}>▶ {projetActif.nom}</div>}
          </div>
        )}
      </div>
      <div style={styles.body}>
        {selectedQuest ? <QuestDetail quest={selectedQuest} onToggle={toggleQuest} /> :
         tab === "quests" ? <QuestsTab quests={quests} grouped={grouped} doneCount={doneCount} totalCount={totalCount} loading={loading} error={error} onGenerate={lancerQuetes} onSelect={setSelectedQuest} onToggle={toggleQuest} projetActif={projetActif} onGoProjects={() => setTab("projects")} /> :
         tab === "profile" ? <ProfileTab profil={profil} editingMetric={editingMetric} tempValue={tempValue} onEdit={startEdit} onSave={saveMetric} onTempChange={setTempValue} /> :
         tab === "coach" ? <CoachTab messages={chatMessages} input={chatInput} loading={chatLoading} onInputChange={setChatInput} onSend={envoyerMessage} /> :
         tab === "projects" ? <ProjectsTab projets={projets} projetActif={projetActif} onSelectProjet={(p) => { setProjetActif(p); setQuests([]); setTab("quests"); }} onNouveauProjet={demarrerOnboarding} onSupprimerProjet={supprimerProjet} /> :
         <HistoryTab historique={historique} quests={quests} />}
      </div>
      <div style={styles.nav}>
        {[{ id: "quests", label: "Quêtes", icon: "⚡" }, { id: "profile", label: "Statut", icon: "◈" }, { id: "coach", label: "Coach", icon: "◉" }, { id: "projects", label: "Projets", icon: "◆" }, { id: "history", label: "Logs", icon: "▤" }].map(t => (
          <button key={t.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "8px 0", color: tab === t.id ? SL.cyan : SL.muted, borderTop: tab === t.id ? `1px solid ${SL.cyan}` : "1px solid transparent" }} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontSize: 8, letterSpacing: 1, textTransform: "uppercase" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div></div>
  );
}

function QuestsTab({ quests, grouped, doneCount, totalCount, loading, error, onGenerate, onSelect, onToggle, projetActif, onGoProjects }) {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  if (loading) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}><div style={{ width: 32, height: 32, border: `2px solid ${SL.border}`, borderTop: `2px solid ${SL.cyan}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} /><div style={{ fontSize: 12, color: SL.cyan, letterSpacing: 2 }}>GÉNÉRATION DES QUÊTES...</div></div>;
  if (!projetActif) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}><div style={{ fontSize: 13, color: SL.cyan, letterSpacing: 3, marginBottom: 8 }}>[ AUCUN PROJET ACTIF ]</div><div style={{ fontSize: 11, color: SL.muted, marginBottom: 24, lineHeight: 1.8 }}>Crée ton premier projet pour<br />commencer à recevoir des quêtes.</div><SLButton onClick={onGoProjects}>Créer un projet →</SLButton></div>;
  if (quests.length === 0) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}><div style={{ fontSize: 11, color: SL.cyan, letterSpacing: 3, marginBottom: 4 }}>[ QUÊTE JOURNALIÈRE ]</div><div style={{ fontSize: 16, fontWeight: 700, color: SL.text, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>{projetActif.nom}</div>{projetActif.profilProjet && <div style={{ fontSize: 11, color: SL.muted, marginBottom: 24, lineHeight: 1.7, padding: "0 16px" }}>{projetActif.profilProjet.resume}</div>}{error && <div style={{ fontSize: 11, color: SL.red, marginBottom: 12 }}>[ {error} ]</div>}<SLButton onClick={onGenerate} color={SL.green}>Générer les quêtes ✨</SLButton></div>;
  return (
    <div>
      <SLCard color={SL.cyan} style={{ marginBottom: 16, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div><div style={{ fontSize: 20, fontWeight: 700, color: SL.cyan, fontFamily: "'Orbitron', sans-serif" }}>{doneCount}<span style={{ fontSize: 13, color: SL.muted }}>/{totalCount}</span></div><div style={{ fontSize: 10, color: SL.muted, letterSpacing: 1 }}>QUÊTES ACCOMPLIES</div></div>
          <div style={{ fontSize: 18, fontWeight: 700, color: pct === 100 ? SL.green : SL.cyan }}>{pct}%</div>
        </div>
        <div style={{ height: 4, background: SL.border, position: "relative" }}><div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, background: pct === 100 ? SL.green : SL.cyan, boxShadow: `0 0 6px ${pct === 100 ? SL.green : SL.cyan}`, transition: "width 0.4s ease" }} /></div>
      </SLCard>
      {error && <div style={{ fontSize: 11, color: SL.red, marginBottom: 12, letterSpacing: 1, textAlign: "center" }}>[ {error} ]</div>}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: getCatColor(cat).text, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase", borderLeft: `2px solid ${getCatColor(cat).text}`, paddingLeft: 8 }}>[ {cat} ]</div>
          {items.map(q => (
            <div key={q.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, padding: "10px 12px", background: SL.bgCard, border: `1px solid ${q.done ? SL.green : SL.border}`, cursor: "pointer", opacity: q.done ? 0.6 : 1 }}>
              <button style={{ width: 18, height: 18, border: `1px solid ${q.done ? SL.green : SL.border}`, background: q.done ? SL.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", marginTop: 2 }} onClick={() => onToggle(q.id)}>{q.done && <span style={{ color: SL.bg, fontSize: 10, fontWeight: 700 }}>✓</span>}</button>
              <div style={{ flex: 1 }} onClick={() => onSelect(q)}>
                <div style={{ fontSize: 13, color: q.done ? SL.muted : SL.text, textDecoration: q.done ? "line-through" : "none", letterSpacing: 0.5 }}>{q.title}</div>
                <div style={{ fontSize: 10, color: SL.muted, marginTop: 3 }}>{q.duration} · {q.difficulty} · <span style={{ color: SL.cyan }}>Détail →</span></div>
              </div>
            </div>
          ))}
        </div>
      ))}
      <button style={{ width: "100%", background: "transparent", border: `1px solid ${SL.border}`, color: SL.muted, padding: "8px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginTop: 4 }} onClick={onGenerate}>↻ Régénérer</button>
    </div>
  );
}

function QuestDetail({ quest, onToggle }) {
  const cat = getCatColor(quest.category);
  const ytQuery = encodeURIComponent(quest.title + " tutoriel");
  return (
    <div>
      <SLCard color={cat.border} glow style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: cat.text, letterSpacing: 3, marginBottom: 6, textTransform: "uppercase" }}>[ {quest.category} — {quest.difficulty} ]</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: SL.text, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{quest.title}</div>
        <div style={{ fontSize: 11, color: SL.muted, letterSpacing: 1 }}>Durée : {quest.duration}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <SLButton onClick={() => onToggle(quest.id)} color={quest.done ? SL.muted : SL.green} style={{ flex: 1 }}>{quest.done ? "✓ Accompli" : "Marquer accompli"}</SLButton>
          <a href={`https://www.youtube.com/results?search_query=${ytQuery}`} target="_blank" rel="noreferrer" style={{ flex: 0.5, background: "transparent", border: `1px solid ${SL.red}`, color: SL.red, padding: "10px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", textTransform: "uppercase" }}>▶ Vidéo</a>
        </div>
      </SLCard>
      <div style={{ fontSize: 10, color: SL.cyan, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>[ Pourquoi cette quête ]</div>
      <div style={{ background: SL.bgCard, border: `1px solid ${SL.border}`, padding: "12px 14px", marginBottom: 14, fontSize: 12, color: SL.text, lineHeight: 1.7 }}>{quest.why}</div>
      <div style={{ fontSize: 10, color: SL.cyan, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>[ Instructions ]</div>
      {quest.steps?.map((step, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
          <div style={{ width: 20, height: 20, background: SL.bgSecondary, border: `1px solid ${SL.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: SL.cyan, flexShrink: 0, fontFamily: "'Orbitron', sans-serif" }}>{i + 1}</div>
          <div style={{ fontSize: 12, color: SL.text, lineHeight: 1.5, paddingTop: 2 }}>{step}</div>
        </div>
      ))}
      <div style={{ background: "#1a0d2b", border: `1px solid ${SL.purple}`, padding: "10px 12px", marginTop: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: SL.purple, letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>[ Conseil du coach ]</div>
        <div style={{ fontSize: 11, color: SL.cyanLight, lineHeight: 1.6 }}>{quest.tip}</div>
      </div>
    </div>
  );
}

function ProjectsTab({ projets, projetActif, onSelectProjet, onNouveauProjet, onSupprimerProjet }) {
  const [nomProjet, setNomProjet] = useState("");
  const [objetProjet, setObjetProjet] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const peutDemarrer = nomProjet.trim().length > 0 && objetProjet.trim().length > 0;
  return (
    <div>
      {projets.length === 0 && !showInput && <div style={{ fontSize: 12, color: SL.muted, textAlign: "center", margin: "32px 0", letterSpacing: 2 }}>[ AUCUN PROJET ENREGISTRÉ ]</div>}
      {projets.map(p => (
        <div key={p.id} style={{ background: SL.bgCard, border: `1px solid ${p.id === projetActif?.id ? SL.cyan : SL.border}`, padding: 14, marginBottom: 10, boxShadow: p.id === projetActif?.id ? `0 0 10px ${SL.cyan}30` : "none" }}>
          <div style={{ cursor: "pointer" }} onClick={() => onSelectProjet(p)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: SL.text, letterSpacing: 1, textTransform: "uppercase" }}>{p.nom}</div>
              {p.id === projetActif?.id && <span style={{ fontSize: 9, color: SL.cyan, letterSpacing: 2, border: `1px solid ${SL.cyan}`, padding: "1px 6px" }}>ACTIF</span>}
            </div>
            {p.profilProjet && <div style={{ fontSize: 11, color: SL.muted, lineHeight: 1.5, marginBottom: 8 }}>{p.profilProjet.resume}</div>}
            {p.profilProjet && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: SL.cyan, border: `1px solid ${SL.border}`, padding: "1px 6px", letterSpacing: 1 }}>NIV. {p.profilProjet.niveau}</span>
              <span style={{ fontSize: 10, color: SL.muted, border: `1px solid ${SL.border}`, padding: "1px 6px" }}>{p.profilProjet.objectif1mois}</span>
            </div>}
          </div>
          <div style={{ marginTop: 10, borderTop: `1px solid ${SL.border}`, paddingTop: 8 }}>
            {confirmDelete === p.id ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: SL.red, flex: 1, letterSpacing: 1 }}>[ Confirmer la suppression ? ]</span>
                <button style={{ fontSize: 10, background: SL.red, color: SL.bg, border: "none", padding: "3px 10px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif" }} onClick={() => { onSupprimerProjet(p.id); setConfirmDelete(null); }}>OUI</button>
                <button style={{ fontSize: 10, background: "transparent", color: SL.muted, border: `1px solid ${SL.border}`, padding: "3px 10px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif" }} onClick={() => setConfirmDelete(null)}>NON</button>
              </div>
            ) : <button style={{ fontSize: 10, color: SL.red, background: "none", border: "none", cursor: "pointer", letterSpacing: 1, fontFamily: "'Rajdhani', sans-serif" }} onClick={() => setConfirmDelete(p.id)}>✕ Supprimer</button>}
          </div>
        </div>
      ))}
      {showInput ? (
        <SLCard color={SL.cyan} glow>
          <div style={{ fontSize: 11, color: SL.cyan, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>[ Nouveau projet ]</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: SL.muted, marginBottom: 6, letterSpacing: 2 }}>NOM DU PROJET</div>
            <input value={nomProjet} onChange={e => setNomProjet(e.target.value)} placeholder="Ex: Escalade 2025..." style={{ width: "100%", background: SL.bgSecondary, border: `1px solid ${SL.border}`, color: SL.text, fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "'Rajdhani', sans-serif", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: SL.muted, marginBottom: 6, letterSpacing: 2 }}>OBJECTIF</div>
            <textarea value={objetProjet} onChange={e => setObjetProjet(e.target.value)} placeholder="Ex: Progresser en escalade de bloc..." style={{ width: "100%", background: SL.bgSecondary, border: `1px solid ${SL.border}`, color: SL.text, fontSize: 13, padding: "8px 10px", resize: "none", outline: "none", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.5, boxSizing: "border-box" }} rows={3} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SLButton onClick={() => { if (peutDemarrer) { onNouveauProjet(nomProjet.trim(), objetProjet.trim()); setShowInput(false); setNomProjet(""); setObjetProjet(""); } }} disabled={!peutDemarrer} style={{ flex: 1 }}>Démarrer →</SLButton>
            <button style={{ flex: 0.4, background: "transparent", border: `1px solid ${SL.border}`, color: SL.muted, fontSize: 11, cursor: "pointer", fontFamily: "'Rajdhani', sans-serif" }} onClick={() => { setShowInput(false); setNomProjet(""); setObjetProjet(""); }}>Annuler</button>
          </div>
        </SLCard>
      ) : <button style={{ width: "100%", background: "transparent", border: `1px dashed ${SL.border}`, color: SL.muted, padding: 14, fontSize: 12, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginTop: 4 }} onClick={() => setShowInput(true)}>+ Nouveau projet</button>}
    </div>
  );
}

function ProfileTab({ profil, editingMetric, tempValue, onEdit, onSave, onTempChange }) {
  const rows = [
    { key: "poids", label: "Poids", value: profil.poids, target: 60.5, max: 80, unit: "kg", color: SL.green },
    { key: "graissePercent", label: "Masse grasse", value: profil.graissePercent, target: 13, max: 30, unit: "%", color: SL.yellow },
    { key: "muscle", label: "Masse musculaire", value: profil.muscle, target: 52, max: 70, unit: "kg", color: SL.purple },
    { key: "proteines", label: "Protéines", value: profil.proteines, target: 130, max: 130, unit: "g", color: SL.cyan },
  ];
  return (
    <div>
      <div style={{ fontSize: 10, color: SL.muted, letterSpacing: 2, marginBottom: 14 }}>[ APPUIE SUR UNE VALEUR POUR MODIFIER ]</div>
      {rows.map(r => (
        <div key={r.key} style={{ background: SL.bgCard, border: `1px solid ${SL.border}`, padding: "12px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: SL.muted, letterSpacing: 1, textTransform: "uppercase" }}>{r.label}</span>
            {editingMetric === r.key ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={tempValue} onChange={e => onTempChange(e.target.value)} style={{ width: 70, background: SL.bgSecondary, border: `1px solid ${r.color}`, color: r.color, fontSize: 14, padding: "2px 6px", outline: "none", textAlign: "right", fontFamily: "'Rajdhani', sans-serif" }} autoFocus />
                <button style={{ fontSize: 11, background: r.color, color: SL.bg, border: "none", padding: "2px 8px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }} onClick={() => onSave(r.key)}>OK</button>
              </div>
            ) : (
              <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "baseline", gap: 4 }} onClick={() => onEdit(r.key, r.value)}>
                <span style={{ fontSize: 18, fontWeight: 700, color: r.color, fontFamily: "'Orbitron', sans-serif" }}>{r.value}</span>
                <span style={{ fontSize: 11, color: SL.muted }}>{r.unit}</span>
                <span style={{ fontSize: 10, color: r.color, marginLeft: 4 }}>✎</span>
              </button>
            )}
          </div>
          <div style={{ height: 3, background: SL.border }}><div style={{ height: "100%", width: `${Math.min(100, (r.value / r.max) * 100)}%`, background: r.color, boxShadow: `0 0 4px ${r.color}`, transition: "width 0.4s" }} /></div>
          <div style={{ fontSize: 10, color: SL.muted, marginTop: 4, letterSpacing: 1 }}>Objectif : {r.target} {r.unit}</div>
        </div>
      ))}
    </div>
  );
}

function CoachTab({ messages, input, loading, onInputChange, onSend }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "ai" && <div style={{ fontSize: 9, color: SL.cyan, letterSpacing: 2, marginBottom: 3 }}>[ COACH ]</div>}
            <div style={{ fontSize: 12, lineHeight: 1.6, padding: "8px 12px", maxWidth: "85%", background: m.role === "user" ? SL.bgSecondary : SL.bgCard, border: `1px solid ${m.role === "user" ? SL.cyan : SL.border}`, color: m.role === "user" ? SL.cyan : SL.text, boxShadow: m.role === "user" ? `0 0 6px ${SL.cyan}30` : "none" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 11, color: SL.cyan, letterSpacing: 2, animation: "pulse 1s infinite" }}>[ En cours... ]</div>}
      </div>
      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${SL.border}`, paddingTop: 12 }}>
        <input value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={e => e.key === "Enter" && onSend()} placeholder="Message au coach..." style={{ flex: 1, background: SL.bgSecondary, border: `1px solid ${SL.border}`, color: SL.text, fontSize: 13, padding: "8px 12px", outline: "none", fontFamily: "'Rajdhani', sans-serif" }} />
        <button style={{ background: SL.cyan, color: SL.bg, border: "none", padding: "8px 14px", fontSize: 14, cursor: "pointer", fontWeight: 700, fontFamily: "'Rajdhani', sans-serif" }} onClick={onSend}>→</button>
      </div>
    </div>
  );
}

function HistoryTab({ historique, quests }) {
  const categories = ["Physique", "Nutrition", "Escalade", "Technique", "Mental", "Théorie"];
  return (
    <div>
      <div style={{ fontSize: 10, color: SL.cyan, letterSpacing: 3, marginBottom: 14, textTransform: "uppercase" }}>[ Journal — Aujourd'hui ]</div>
      {categories.map(cat => {
        const total = quests.filter(q => q.category === cat).length;
        if (total === 0) return null;
        const done = quests.filter(q => q.category === cat && q.done).length;
        const col = getCatColor(cat);
        return (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: col.text, width: 56, letterSpacing: 1, textTransform: "uppercase" }}>{cat}</span>
            <div style={{ flex: 1, height: 4, background: SL.border }}><div style={{ height: "100%", width: `${Math.round((done / total) * 100)}%`, background: col.text, boxShadow: `0 0 4px ${col.text}`, transition: "width 0.4s" }} /></div>
            <span style={{ fontSize: 10, color: SL.muted, width: 28, textAlign: "right" }}>{done}/{total}</span>
          </div>
        );
      })}
      {historique.length > 0 && <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 10, color: SL.cyan, letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>[ Historique ]</div>
        {historique.map((jour, i) => <div key={i} style={{ background: SL.bgCard, border: `1px solid ${SL.border}`, padding: "10px 12px", marginBottom: 6 }}><div style={{ fontSize: 11, color: SL.muted, letterSpacing: 1, marginBottom: 2 }}>{jour.date}</div><div style={{ fontSize: 12, color: SL.text }}>{jour.resume}</div></div>)}
      </div>}
      {historique.length === 0 && quests.length === 0 && <div style={{ fontSize: 11, color: SL.muted, textAlign: "center", marginTop: 24, letterSpacing: 2 }}>[ Aucun historique disponible ]</div>}
    </div>
  );
}

function tabLabel(tab) { return { quests: "Quêtes du jour", profile: "Statut", coach: "Coach IA", projects: "Projets", history: "Journal" }[tab]; }

const styles = {
  root: { display: "flex", justifyContent: "center", padding: "1rem", background: SL.bg, minHeight: "100vh" },
  phone: { width: "100%", maxWidth: 390, background: SL.bg, border: `1px solid ${SL.border}`, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 700 },
  header: { padding: "14px 16px 12px", borderBottom: `1px solid ${SL.border}`, display: "flex", alignItems: "center", background: SL.bgSecondary },
  body: { flex: 1, overflowY: "auto", padding: 16 },
  nav: { display: "flex", borderTop: `1px solid ${SL.border}`, background: SL.bgSecondary },
};

const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  * { scrollbar-width: thin; scrollbar-color: #1e3a5f #0a0e1a; }
  *::-webkit-scrollbar { width: 4px; }
  *::-webkit-scrollbar-track { background: #0a0e1a; }
  *::-webkit-scrollbar-thumb { background: #1e3a5f; }
  input::placeholder, textarea::placeholder { color: #7ea8c4; opacity: 0.5; }
`;
document.head.appendChild(styleTag);
