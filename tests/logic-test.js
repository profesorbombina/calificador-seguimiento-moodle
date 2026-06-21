const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)?.[1];
assert(script, "No se encontró el script principal");
new Function(script);

function functionSource(name) {
  const start = script.indexOf(`function ${name}(`);
  assert(start >= 0, `No se encontró ${name}`);
  const opening = script.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = opening; index < script.length; index += 1) {
    const char = script[index];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return script.slice(start, index + 1);
  }
  throw new Error(`Función incompleta: ${name}`);
}

[
  "normalizeText",
  "cleanPersonName",
  "isAccessValue",
  "isParticipantStatus",
  "extractParticipantListSection",
  "accessToDays",
  "formatAccessDays",
  "parseMoodleParticipants",
  "sortStudentRows",
  "toggleParticipantStateControls"
].forEach(name => vm.runInThisContext(functionSource(name)));

assert.strictEqual(accessToDays("1 día 16 horas"), 1.67);
assert.strictEqual(accessToDays("9 días 22 horas"), 9.92);
assert.strictEqual(accessToDays("10 horas 32 minutos"), 0.44);
assert.strictEqual(formatAccessDays(1.67, "1 día 16 horas"), "1,67");
assert.strictEqual(formatAccessDays(null, "Nunca"), "Nunca");

const copiedPage = `
Navegación ajena al listado
Seleccionar todos
Nombre
Ordenar por Nombre Ascendente
/ Apellido(s)
Seleccionar todos
Nombre
Ordenar por Nombre Ascendente
/ Apellido(s)
Seleccionar 'Ana Pérez'
Ana Pérez
ana@example.com
Estudiante
Comisión A
1 día 16 horas
Activo
Seleccionar 'Luis Gómez'
Luis Gómez
luis@example.com
Estudiante
Comisión B
10 horas 32 minutos
Suspendido
Pie de página
`;

const cropped = extractParticipantListSection(copiedPage);
assert(!cropped.includes("Navegación ajena"));
const participants = parseMoodleParticipants(copiedPage);
assert.strictEqual(participants.length, 2);
assert.strictEqual(participants[0].name, "Ana Pérez");
assert.strictEqual(participants[0].accessDays, 1.67);
assert.strictEqual(participants[1].accessDays, 0.44);
assert.strictEqual(participants[1].status, "Suspendido");

global.document = { querySelectorAll: () => [] };
global.state = { tableSort: { key: "accessDays", direction: "asc" } };
const rows = [{ name: "Tres", accessDays: 9.92 }, { name: "Uno", accessDays: 0.44 }, { name: "Dos", accessDays: 1.67 }];
sortStudentRows(rows);
assert.deepStrictEqual(rows.map(row => row.name), ["Uno", "Dos", "Tres"]);
state.tableSort.direction = "desc";
sortStudentRows(rows);
assert.deepStrictEqual(rows.map(row => row.name), ["Tres", "Dos", "Uno"]);

global.metricElements = { activeCard: {}, suspendedCard: {} };
global.elements = { participantStateFilterField: {}, participantStateFilter: { value: "all" } };
toggleParticipantStateControls({ hasActiveParticipants: true, hasSuspendedParticipants: false, hasParticipantStates: true });
assert.strictEqual(metricElements.activeCard.hidden, false);
assert.strictEqual(metricElements.suspendedCard.hidden, true);
assert.strictEqual(elements.participantStateFilterField.hidden, false);

console.log("OK: sintaxis, participantes, días, métricas condicionales y ordenamiento");
