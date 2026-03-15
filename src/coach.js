const API_KEY = "REMPLACE_PAR_TA_CLE";

async function callClaude(prompt, maxTokens = 2000) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) { const err = await response.text(); throw new Error(err); }
  const data = await response.json();
  return data.content[0].text;
}

function parseObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Pas de JSON objet trouvé dans : " + text.substring(0, 100));
  return JSON.parse(match[0]);
}

function parseArray(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Pas de JSON tableau trouvé dans : " + text.substring(0, 100));
  return JSON.parse(match[0]);
}

export async function genererProchaineQuestion(nomProjet, objetProjet, historique) {
  const historiqueTexte = historique.map(m => `${m.role === "coach" ? "Coach" : "Utilisateur"}: ${m.text}`).join("\n");
  const nbQuestions = historique.filter(m => m.role === "coach").length;

  const prompt = `Tu es un coach personnel expert. Tu mènes un entretien rapide pour créer un programme personnalisé.

Projet : "${nomProjet}" — Objectif : "${objetProjet}"

Conversation :
${historiqueTexte || "(Début)"}

Questions posées jusqu'ici : ${nbQuestions}

Règles STRICTES :
- Pose UNE seule question courte et directe
- Adapte au type de projet (pas de questions physiques pour un projet intellectuel)
- Rebondis sur les réponses précédentes
- MAXIMUM 5 questions au total — sois efficace
- À la question 4 ou 5, si tu as assez d'infos, dis que le programme est presque prêt dans ta question
- Après 5 questions OU si tu as toutes les infos essentielles, réponds {"termine": true}

Réponds UNIQUEMENT avec ce JSON :
{"termine": false, "question": "ta question ?"}
ou
{"termine": true}`;

  const text = await callClaude(prompt, 200);
  return parseObject(text);
}

export async function genererProgrammeComplet(nomProjet, objetProjet, historique) {
  const historiqueTexte = historique.map(m => `${m.role === "coach" ? "Coach" : "Utilisateur"}: ${m.text}`).join("\n");

  const prompt = `Tu es un coach expert. Génère un programme personnalisé basé sur cette conversation.

Projet : "${nomProjet}" — Objectif : "${objetProjet}"

Conversation :
${historiqueTexte}

Génère UNIQUEMENT ce JSON valide et complet, sans texte avant ou après. Garde les valeurs courtes (max 80 caractères par champ texte) :
{
  "resume": "2 phrases max sur le profil",
  "niveau": "débutant",
  "pointsForts": ["fort1", "fort2"],
  "pointsFaibles": ["faible1", "faible2"],
  "disponibilites": "résumé court",
  "contraintes": "contraintes ou aucune",
  "metriques": [
    {"label": "métrique1", "valeur": "valeur", "unite": "unité"},
    {"label": "métrique2", "valeur": "valeur", "unite": "unité"},
    {"label": "métrique3", "valeur": "valeur", "unite": "unité"}
  ],
  "objectif1mois": "objectif concret court",
  "objectif3mois": "objectif concret court",
  "planAction": {
    "semaine1": "focus semaine 1",
    "semaine2": "focus semaine 2",
    "semaine3": "focus semaine 3",
    "semaine4": "focus semaine 4"
  },
  "logique": "2 phrases sur la logique"
}`;

  const text = await callClaude(prompt, 1800);
  console.log("Réponse programme (début):", text.substring(0, 300));
  return parseObject(text);
}

export async function genererQuetes(profil, historique, projetProfil = null) {
  const contexteProjet = projetProfil ? `
Profil :
- ${projetProfil.resume}
- Niveau : ${projetProfil.niveau}
- Points forts : ${projetProfil.pointsForts?.join(', ')}
- Points faibles : ${projetProfil.pointsFaibles?.join(', ')}
- Dispo : ${projetProfil.disponibilites}
- Contraintes : ${projetProfil.contraintes || 'aucune'}
- Objectif 1 mois : ${projetProfil.objectif1mois}
- Objectif 3 mois : ${projetProfil.objectif3mois}
` : `Profil basique : ${profil.poids}kg, ${profil.graissePercent}% graisse, cotation ${profil.cotation}`;

  const prompt = `Tu es un coach personnel expert.

${contexteProjet}

Historique : ${historique.length > 0 ? historique.map(h => `${h.date}: ${h.resume}`).join(', ') : "aucun"}

Génère exactement 5 quêtes adaptées au profil.

Réponds UNIQUEMENT avec ce JSON :
[
  {
    "category": "catégorie",
    "title": "titre court",
    "duration": "durée",
    "difficulty": "Facile | Modérée | Élevée",
    "why": "2 phrases max",
    "steps": ["étape 1", "étape 2", "étape 3"],
    "tip": "conseil court"
  }
]`;

  const text = await callClaude(prompt, 2000);
  return parseArray(text);
}

export async function demanderCoach(message, profil, historique, projetProfil = null) {
  const contexte = projetProfil
    ? `Projet : ${projetProfil.resume}. Niveau : ${projetProfil.niveau}. Objectif : ${projetProfil.objectif3mois}.`
    : `Poids : ${profil.poids}kg, Cotation : ${profil.cotation}.`;

  const prompt = `Tu es un coach personnel expert, bienveillant et direct.
Contexte : ${contexte}
Message : ${message}
Réponds en 3-4 phrases max en français.`;

  return await callClaude(prompt, 500);
}
