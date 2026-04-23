const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

content = content.replace(
    'const q = query(collection(db, "coaches"), where("promotorCode", "in", state.promotorCodes.slice(0, 30)));',
    'const q = query(collection(db, "coaches"));'
);

content = content.replace(
    `const coachData = doc.data();\n                        const cName = coachData.coachName || 'Sin Nombre';`,
    `const coachData = doc.data();\n                        if (!state.promotorCodes.includes(coachData.promotorCode)) return;\n                        const cName = coachData.coachName || 'Sin Nombre';`
);

content = content.replace(
    'const q = query(collection(db, "users"), where("teamCode", "in", state.teamCodes.slice(0, 30)));',
    'const q = query(collection(db, "users"));'
);

content = content.replace(
    `const agentData = doc.data();\n                        if (agentData.agentName)`,
    `const agentData = doc.data();\n                        if (!state.teamCodes.includes(agentData.teamCode)) return;\n                        if (agentData.agentName)`
);

const oldRefresh = `function refreshTeamSelects() {
                const ids = ['lb-team-filter', 'kpi-team-sel', 'chart-team-sel', 'rpt-team-sel'];
                const promF = document.getElementById('chart-prom-sel').value; // Basic anchor

                const filteredCodes = Object.keys(state.coachMap).filter(tc => !promF || state.teamToPromotorMap[tc] === promF);
                const opts = filteredCodes.map(code => \`<option value="\${code}">\${state.coachMap[code]}</option>\`).join('');

                ids.forEach(id => {
                    const el = document.getElementById(id); if (!el) return;
                    const cur = el.value;
                    el.innerHTML = '<option value="">Todos los equipos</option>' + opts;
                    if (filteredCodes.includes(cur)) el.value = cur; else el.value = '';
                });
            }`;

const newRefresh = `function refreshTeamSelects() {
                const mappings = [
                    { t: 'lb-team-filter', p: 'lb-prom-filter' },
                    { t: 'kpi-team-sel', p: 'kpi-prom-sel' },
                    { t: 'chart-team-sel', p: 'chart-prom-sel' },
                    { t: 'rpt-team-sel', p: 'rpt-prom-sel' }
                ];
                mappings.forEach(({t, p}) => {
                    const promF = document.getElementById(p) ? document.getElementById(p).value : '';
                    const filteredCodes = Object.keys(state.coachMap).filter(tc => !promF || state.teamToPromotorMap[tc] === promF);
                    const opts = filteredCodes.map(code => \`<option value="\${code}">\${state.coachMap[code]}</option>\`).join('');
                    const el = document.getElementById(t); if (!el) return;
                    const cur = el.value;
                    el.innerHTML = '<option value="">Todos los equipos</option>' + opts;
                    if (filteredCodes.includes(cur)) el.value = cur; else el.value = '';
                });
            }`;

content = content.replace(oldRefresh, newRefresh);

fs.writeFileSync('index.html', content);
console.log('Patched correctly');
