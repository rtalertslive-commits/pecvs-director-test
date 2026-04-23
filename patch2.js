const fs = require('fs');
let text = fs.readFileSync('index.html', 'utf8');

const startTag = 'function refreshTeamSelects() {';
const endTag = '    function refreshAgentSelects() {';

const startIndex = text.indexOf(startTag);
const endIndex = text.indexOf(endTag);

const newRefresh = \unction refreshTeamSelects() {
                const mappings = [
                    { t: 'lb-team-filter', p: 'lb-prom-filter' },
                    { t: 'kpi-team-sel', p: 'kpi-prom-sel' },
                    { t: 'chart-team-sel', p: 'chart-prom-sel' },
                    { t: 'rpt-team-sel', p: 'rpt-prom-sel' }
                ];
                mappings.forEach(({t, p}) => {
                    const elPromF = document.getElementById(p);
                    const promF = elPromF ? elPromF.value : '';
                    const filteredCodes = Object.keys(state.coachMap).filter(tc => !promF || state.teamToPromotorMap[tc] === promF);
                    const opts = filteredCodes.map(code => \\\<option value="\\\">\\\</option>\\\).join('');
                    
                    const el = document.getElementById(t); 
                    if (!el) return;
                    const cur = el.value;
                    el.innerHTML = '<option value="">Todos los equipos</option>' + opts;
                    if (filteredCodes.includes(cur)) el.value = cur; else el.value = '';
                });
            }

\

const newText = text.slice(0, startIndex) + newRefresh + text.slice(endIndex);
fs.writeFileSync('index.html', newText);
