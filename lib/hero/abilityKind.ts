/*
 * How an ability is used, which is how the Abilities tab groups them:
 *   Passive      always on, nothing to do
 *   Manoeuvre    something you just do, usually for Willpower
 *   Move         needs an action roll of your Dyad dice
 *   Trigger move something you do in answer to an event
 *   Ritual       longer, bigger workings
 * The rules label some of these in their text; the rest are read from the wording, with a few set by hand below.
 */
export type AbilityKind = "passive" | "manoeuvre" | "move" | "trigger" | "ritual";

export const KIND_ORDER: readonly AbilityKind[] = ["passive", "manoeuvre", "move", "trigger", "ritual"];
export const KIND_LABEL: Record<AbilityKind, string> = { passive: "Passives", manoeuvre: "Manoeuvres", move: "Moves", trigger: "Trigger moves", ritual: "Rituals" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Set by hand where the wording alone gets it wrong, keyed by the ability's name */
const OVERRIDES: Record<string, AbilityKind> = {
  "guided-actions": "passive",
  "shapeshifter": "manoeuvre",
  "aching-change": "passive",
  "trust-no-face": "passive",
  "product-of-magick": "passive",
  "bolstered-by-magick": "manoeuvre",
  "duelist": "trigger",
  "adaptive-tactician": "passive",
  "master-of-shadows": "passive",
  "security-spike": "ritual",
  "frenzy-fury": "manoeuvre",
  "tunnel-vision-fury": "manoeuvre",
  "form-mastery": "manoeuvre",
  "hold-the-line": "manoeuvre",
  "field-notes": "manoeuvre",
  "high-noon": "manoeuvre",
  "quick-fingered": "trigger",
  "emergency-field": "trigger",
  "trick-shot": "move",
  "echoes-in-the-dust": "move",
  "read-the-crowd": "manoeuvre",
  "port-familiar": "manoeuvre",
  "credentials": "manoeuvre",
  "connected": "manoeuvre",
  "wanted": "passive",
  "sage-advice": "manoeuvre",
  "redline": "manoeuvre",
  "hard-graft": "passive",
  "structural-eye": "manoeuvre",
  "routine-job": "passive",
  "psychometry": "manoeuvre",
  "bolstered-resolve": "passive",
  "aura-of-protection": "passive",
  "stand-firm": "trigger",
  "living-weapon": "passive",
  "backstab-protocol": "passive",
  "transcendence": "trigger",
  "deployable-turret": "manoeuvre",
  "minefield": "manoeuvre",
  "siege-master": "passive",
  "bolstered-by-technology": "manoeuvre",
  "targeted-navigator": "manoeuvre",
  "cosmic-flow": "trigger",
  "silent-execution": "passive",
  "savage-protector": "passive",
};

/** What every Hero can do, whatever their build; shown as plain lozenges under each heading */
export const BASIC_ACTIONS: Record<AbilityKind, readonly string[]> = {
  passive: [],
  manoeuvre: ["Disengage (1WP)", "Object interaction", "Reload", "Stand up (1WP)", "Swap weapon", "Use an item"],
  move: ["Attack", "Dodge", "Grapple", "Hide", "Influence", "Shove", "Steal", "Study"],
  trigger: ["Opportunity attack", "Ready trigger"],
  ritual: ["Use a tool"],
};

export function abilityKind(name: string, text: string): AbilityKind {
  const o = OVERRIDES[slug(name)];
  if (o) return o;
  if (/\bas a manoeuvre\b|\(manoeuvre\)/i.test(text)) return "manoeuvre";
  if (/\britual\b/i.test(text)) return "ritual";
  if (/\btrigger moves?\b|\(trigger\)/i.test(text)) return "trigger";
  if (/\bmake (?:a|an) [a-z() ]{0,30}?(?:roll|check)\b/i.test(text)) return "move";
  if (/\bmark off\b[^.]{0,40}\bto\b|\bexpend a willpower\b|\bmark(?:ing)? off a willpower to\b|\bmark (?:\d|a|one|two) willpower to\b/i.test(text)) return "manoeuvre";
  return "passive";
}
