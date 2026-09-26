export type Intent = {
  id: string;
  label: string;
  detail: string;
};

export const intents: Intent[] = [
  { id: "idea", label: "I have an idea", detail: "Turn a thought into something tangible." },
  { id: "join", label: "I want to join a project", detail: "Find a direction that already has momentum." },
  { id: "collaborators", label: "I want to find collaborators", detail: "Meet people who complement your strengths." },
  { id: "portfolio", label: "I want to build my portfolio", detail: "Make work you are proud to show." },
];

export function getIntentLabel(intentId: string) {
  return intents.find((intent) => intent.id === intentId)?.label ?? intentId;
}
