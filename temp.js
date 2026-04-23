
            // --- FIREBASE CONFIG ---
            const firebaseConfig = {
                apiKey: "AIzaSyDPNoWHEktWMcxHTnxpGrbtzYz4wEf2EHo",
                authDomain: "bitacora-agente.firebaseapp.com",
                projectId: "bitacora-agente",
                storageBucket: "bitacora-agente.firebasestorage.app",
                messagingSenderId: "322544925589",
                appId: "1:322544925589:web:25021c345574e9ee0c149c"
            };

            import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
            import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
            import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            const provider = new GoogleAuthProvider();

            // ????????? STATE ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            const COLS = ['P', 'E', 'C', 'V', 'S'];
            const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            let state = { directorName: '', directorCode: '', promotores: [], promotorCodes: [], promotorMap: {}, coaches: [], teamCodes: [], coachMap: {}, teamToPromotorMap: {}, agents: [], entries: [], reportes: [] };
            let user = null;
            let unsubPromotores = null;
            let unsubCoaches = null;
            let unsubAgents = null;

            // ????????? AUTH LOGIC ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            document.getElementById('login-btn').addEventListener('click', () => {
                signInWithPopup(auth, provider).catch(err => alert("Error login: " + err.message));
            });

            window.logout = function () {
                if (confirm("??Cerrar sesi??n?")) signOut(auth);
            };

            onAuthStateChanged(auth, async (u) => {
                if (u) {
                    user = u;
                    document.getElementById('login-overlay').classList.add('hidden');
                    await loadDirectorData();
                } else {
                    user = null;
                    document.getElementById('login-overlay').classList.remove('hidden');
                }
            });

            async function loadDirectorData() {
                if (!user) return;
                const docRef = doc(db, "directores", user.email);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    state.directorName = data.directorName || '';
                    state.directorCode = data.directorCode || '';
                    refreshAll();
                    startListeningPromotores();
                } else {
                    state.directorName = user.displayName;
                    openConfig();
                }
            }

            async function saveDirectorData() {
                if (!user) return;
                await setDoc(doc(db, "directores", user.email), {
                    directorName: state.directorName,
                    directorCode: state.directorCode
                });
            }

            function startListeningPromotores() {
                if (unsubPromotores) unsubPromotores();
                if (!state.directorCode) return;

                const q = query(collection(db, "promotores"), where("directorCode", "==", state.directorCode));
                unsubPromotores = onSnapshot(q, (snapshot) => {
                    const promotores = [];
                    const pCodes = [];
                    const pMap = {};
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        promotores.push(data.promotorName || 'Sin Nombre');
                        if (data.promotorCode) {
                            pCodes.push(data.promotorCode);
                            pMap[data.promotorCode] = data.promotorName;
                        }
                    });
                    state.promotores = promotores;
                    state.promotorCodes = pCodes;
                    state.promotorMap = pMap;
                    renderPromotorList();
                    refreshPromotorSelects();
                    startListeningCoaches();
                });
            }

            function startListeningCoaches() {
                if (unsubCoaches) unsubCoaches();
                if (!state.promotorCodes.length) {
                    state.coaches = [];
                    state.teamCodes = [];
                    startListeningAgents();
                    return;
                }

                const q = query(collection(db, "coaches"), where("promotorCode", "in", state.promotorCodes.slice(0, 30)));
                unsubCoaches = onSnapshot(q, (snapshot) => {
                    const allCoaches = [];
                    const allTeamCodes = [];
                    const coachMap = {};
                    const tToP = {};
                    const allAggregatedReportes = [];

                    snapshot.forEach((doc) => {
                        const coachData = doc.data();
                        const cName = coachData.coachName || 'Sin Nombre';
                        allCoaches.push(cName);
                        if (coachData.teamCode) {
                            allTeamCodes.push(coachData.teamCode);
                            coachMap[coachData.teamCode] = cName;
                            tToP[coachData.teamCode] = coachData.promotorCode;
                        }
                        if (coachData.reportes) {
                            coachData.reportes.forEach(r => {
                                r.coachName = cName;
                                r.promotorCode = coachData.promotorCode;
                                allAggregatedReportes.push(r);
                            });
                        }
                    });

                    state.coaches = allCoaches;
                    state.teamCodes = allTeamCodes;
                    state.coachMap = coachMap;
                    state.teamToPromotorMap = tToP;
                    state.reportes = allAggregatedReportes;

                    refreshTeamSelects();
                    startListeningAgents();
                });
            }

            function startListeningAgents() {
                if (unsubAgents) unsubAgents();
                if (!state.teamCodes.length) {
                    state.agents = [];
                    state.entries = [];
                    refreshAll();
                    return;
                }

                const q = query(collection(db, "users"), where("teamCode", "in", state.teamCodes.slice(0, 30)));
                unsubAgents = onSnapshot(q, (snapshot) => {
                    const allEntries = [];
                    const allAgents = [];
                    snapshot.forEach((doc) => {
                        const agentData = doc.data();
                        if (agentData.agentName) {
                            allAgents.push({ name: agentData.agentName, teamCode: agentData.teamCode });
                            if (agentData.entries) {
                                agentData.entries.forEach(e => {
                                    e.agent = agentData.agentName;
                                    e.teamCode = agentData.teamCode;
                                    allEntries.push(e);
                                });
                            }
                        }
                    });
                    state.agents = allAgents;
                    state.entries = allEntries;
                    refreshAll();
                });
            }

            function refreshAll() {
                document.getElementById('director-display').textContent = 'Director: ' + (state.directorName || '???');
                document.getElementById('dircode-display').textContent = 'C??digo: ' + (state.directorCode || '???');
                refreshPromotorSelects();
                refreshTeamSelects();
                refreshAgentSelects();
                renderLeaderboard();
                renderCharts();
                renderKPIs();
                refreshMonthFilters();
                renderReporteHistory();
            }

            function switchTab(name, btn) {
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.getElementById('tab-' + name).classList.add('active');
                btn.classList.add('active');
                if (name === 'charts') renderCharts();
                if (name === 'kpis') renderKPIs();
                if (name === 'leaderboard') renderLeaderboard();
                if (name === 'reporte') renderReporteHistory();
            }

            function openConfig() {
                document.getElementById('inp-director').value = state.directorName || '';
                document.getElementById('inp-dircode').value = state.directorCode || '';
                renderPromotorList();
                document.getElementById('config-modal').classList.add('open');
            }

            function closeConfig() { document.getElementById('config-modal').classList.remove('open'); }

            async function saveConfigDirector() {
                const name = document.getElementById('inp-director').value.trim();
                const code = document.getElementById('inp-dircode').value.trim().toUpperCase();
                if (!name || !code) return alert("Por favor ingresa nombre y c??digo.");

                state.directorName = name;
                state.directorCode = code;
                await saveDirectorData();
                alert("Configuraci??n guardada.");
                closeConfig();
                refreshAll();
                startListeningPromotores();
            }

            function renderPromotorList() {
                const el = document.getElementById('promotor-list');
                if (!el) return;
                if (!state.promotores.length) { el.innerHTML = '<div style="color:var(--slate);font-size:11px;">No hay promotores vinculados a??n.</div>'; return; }
                el.innerHTML = state.promotores.map(p => `<div class="agent-chip"><span><i class="fa fa-crown" style="margin-right:8px; color:var(--gold)"></i>${p}</span></div>`).join('');
            }

            function refreshPromotorSelects() {
                const ids = ['lb-prom-filter', 'kpi-prom-sel', 'chart-prom-sel', 'rpt-prom-sel'];
                const opts = Object.entries(state.promotorMap).map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
                ids.forEach(id => {
                    const el = document.getElementById(id); if (!el) return;
                    const cur = el.value;
                    el.innerHTML = '<option value="">Todos los promotores</option>' + opts;
                    el.value = cur;
                });
            }

            function refreshTeamSelects() {
                const ids = ['lb-team-filter', 'kpi-team-sel', 'chart-team-sel', 'rpt-team-sel'];
                const promF = document.getElementById('chart-prom-sel').value; // Basic anchor

                const filteredCodes = Object.keys(state.coachMap).filter(tc => !promF || state.teamToPromotorMap[tc] === promF);
                const opts = filteredCodes.map(code => `<option value="${code}">${state.coachMap[code]}</option>`).join('');

                ids.forEach(id => {
                    const el = document.getElementById(id); if (!el) return;
                    const cur = el.value;
                    el.innerHTML = '<option value="">Todos los equipos</option>' + opts;
                    if (filteredCodes.includes(cur)) el.value = cur; else el.value = '';
                });
            }

            function refreshAgentSelects() {
                const teamF = document.getElementById('chart-team-sel').value;
                let filteredAgents = state.agents;
                if (teamF) filteredAgents = state.agents.filter(a => a.teamCode === teamF);

                const opts = filteredAgents.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
                const sel = document.getElementById('chart-agent-sel');
                if (sel) {
                    const cur = sel.value;
                    sel.innerHTML = '<option value="__all__">Todos los agentes</option>' + opts;
                    if (filteredAgents.find(a => a.name === cur) || cur === '__all__') sel.value = cur;
                    else sel.value = '__all__';
                }
            }

            function refreshMonthFilters() {
                const meses = [...new Set(state.entries.map(e => e.mes))];
                const opts = meses.map(m => `<option value="${m}">${m}</option>`).join('');
                ['lb-mes-filter', 'chart-mes-sel', 'kpi-mes-sel'].forEach(id => {
                    const el = document.getElementById(id); if (!el) return;
                    const cur = el.value;
                    el.innerHTML = '<option value="">Todos los meses</option>' + opts;
                    if (meses.includes(cur)) el.value = cur;
                });
            }

            // ????????? LEADERBOARD ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            function ratio(a, b) { return b > 0 ? (a / b).toFixed(2) : '???'; }
            let showRedData = false;
            function toggleRed() {
                showRedData = !showRedData;
                renderLeaderboard();
                const btn = document.getElementById('btn-tog-red');
                btn.innerHTML = showRedData ? '<i class="fa fa-eye-slash"></i> Ocultar Conciliaci??n' : '<i class="fa fa-eye"></i> Ver Conciliaci??n Real';
                btn.classList.toggle('btn-red', showRedData);
            }

            function validateDay(d) {
                if (d.P === 0 && d.E === 0 && d.C === 0 && d.V === 0 && d.S === 0 && d.prima === 0) return { ok: true, errors: [] };
                const errors = [];
                if (d.P < d.E) errors.push("P < E");
                if (d.E < d.C) errors.push("E < C");
                if (d.C < d.V) errors.push("C < V");
                if (d.S < d.V) errors.push("S < V");
                if (d.V === 0 && d.S > 0) errors.push("S>0 requiere V>=1");
                if (d.S > 0 && d.prima < 1) errors.push("Requiere Prima");
                return { ok: errors.length === 0, errors };
            }

            function renderLeaderboard() {
                const mesF = document.getElementById('lb-mes-filter').value;
                const semF = document.getElementById('lb-sem-filter').value;
                const promF = document.getElementById('lb-prom-filter').value;
                const teamF = document.getElementById('lb-team-filter').value;
                let filtered = state.entries.filter(e => (!mesF || e.mes === mesF) && (!semF || e.semana == semF) && (!promF || state.teamToPromotorMap[e.teamCode] === promF) && (!teamF || e.teamCode === teamF));

                const agMap = {};
                filtered.forEach(e => {
                    if (!agMap[e.agent]) agMap[e.agent] = { P: 0, E: 0, C: 0, V: 0, S: 0, prima: 0, redS: 0, redPrima: 0 };
                    e.dias.forEach(d => {
                        const { ok } = validateDay(d);
                        if (ok) {
                            agMap[e.agent].P += d.P; agMap[e.agent].E += d.E; agMap[e.agent].C += d.C;
                            agMap[e.agent].V += d.V; agMap[e.agent].S += d.S; agMap[e.agent].prima += d.prima;
                        } else {
                            agMap[e.agent].redS += d.S; agMap[e.agent].redPrima += d.prima;
                        }
                    });
                });

                const agents = Object.keys(agMap);
                const thead = document.getElementById('lb-thead');
                const tbody = document.getElementById('lb-body');
                const tfoot = document.getElementById('lb-foot');

                if (!agents.length) {
                    tbody.innerHTML = `<tr class="no-data-row"><td colspan="17">No hay datos.</td></tr>`;
                    tfoot.innerHTML = ''; return;
                }

                thead.innerHTML = `
                <tr>
                    <th rowspan="2">#</th><th rowspan="2">Agente</th>
                    <th colspan="5" style="border-left:2px solid #475569;border-bottom:1px solid #475569">Volumen PECVS$</th>
                    <th colspan="4" style="border-left:2px solid #475569;border-bottom:1px solid #475569">Ratios Jerarqu??a</th>
                    <th colspan="2" style="border-left:2px solid #475569;border-bottom:1px solid #475569">Ratios Efectividad</th>
                    <th colspan="1" style="border-left:2px solid #475569;border-bottom:1px solid #475569">Financiero</th>
                    ${showRedData ? `<th colspan="3" style="border-left:2px solid var(--red);border-bottom:1px solid var(--red);background:rgba(239,68,68,0.1)">CONCILIACI??N REAL (???? + ????)</th>` : ''}
                </tr>
                <tr>
                    <th style="border-left:2px solid #475569">P</th><th>E</th><th>C</th><th>V</th><th>S</th>
                    <th style="border-left:2px solid #475569">P/E</th><th>E/C</th><th>C/V</th><th>S/V</th>
                    <th style="border-left:2px solid #475569">P/V</th><th>P/S</th>
                    <th style="border-left:2px solid #475569">Prima Neta</th>
                    ${showRedData ? `<th style="border-left:2px solid var(--red);color:var(--red)">S (R)</th><th style="color:var(--red)">$ (R)</th><th style="border-left:1px solid var(--red);color:var(--gold)">$ TOTAL</th>` : ''}
                </tr>`;

                agents.sort((a, b) => agMap[b].prima - agMap[a].prima);
                tbody.innerHTML = agents.map((ag, i) => {
                    const d = agMap[ag];
                    const pF = d.prima.toLocaleString('es-MX', { minimumFractionDigits: 0 });
                    return `<tr>
                    <td class="rank-num">${i + 1}</td><td class="agent-name-cell">${ag}</td>
                    <td style="border-left:2px solid #475569">${d.P}</td><td>${d.E}</td><td>${d.C}</td><td>${d.V}</td><td>${d.S}</td>
                    <td class="ratio-cell" style="border-left:2px solid #475569">${ratio(d.E, d.P)}</td><td>${ratio(d.C, d.E)}</td><td>${ratio(d.V, d.C)}</td><td>${ratio(d.S, d.V)}</td>
                    <td class="ratio-cell" style="border-left:2px solid #475569">${ratio(d.V, d.P)}</td><td>${ratio(d.S, d.P)}</td>
                    <td style="font-weight:700;color:var(--green);border-left:2px solid #475569">$${pF}</td>
                    ${showRedData ? `<td style="border-left:2px solid var(--red);color:var(--red)">${d.redS}</td><td>$${d.redPrima.toLocaleString()}</td><td style="font-weight:700;color:var(--gold)">$${(d.prima + d.redPrima).toLocaleString()}</td>` : ''}
                </tr>`;
                }).join('');

                const tot = { P: 0, E: 0, C: 0, V: 0, S: 0, prima: 0, redS: 0, redPrima: 0 };
                agents.forEach(ag => { COLS.forEach(c => tot[c] += agMap[ag][c]); tot.prima += agMap[ag].prima; tot.redS += agMap[ag].redS; tot.redPrima += agMap[ag].redPrima; });
                tfoot.innerHTML = `<tr>
                <td></td><td style="text-align:left;font-weight:800;">TOTAL EQUIPO</td>
                <td style="border-left:2px solid #475569">${tot.P}</td><td>${tot.E}</td><td>${tot.C}</td><td>${tot.V}</td><td>${tot.S}</td>
                <td style="border-left:2px solid #475569">${ratio(tot.E, tot.P)}</td><td>${ratio(tot.C, tot.E)}</td><td>${ratio(tot.V, tot.C)}</td><td>${ratio(tot.S, tot.V)}</td>
                <td style="border-left:2px solid #475569">${ratio(tot.V, tot.P)}</td><td>${ratio(tot.S, tot.P)}</td>
                <td style="font-weight:800;color:var(--gold);border-left:2px solid #475569">$${tot.prima.toLocaleString()}</td>
                ${showRedData ? `<td style="border-left:2px solid var(--red);color:var(--red)">${tot.redS}</td><td>$${tot.redPrima.toLocaleString()}</td><td style="color:var(--gold);font-weight:800">$${(tot.prima + tot.redPrima).toLocaleString()}</td>` : ''}
                </tr>`;
            }

            // ????????? CHARTS ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            let charts = {};
            function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
            const CHART_COLORS = { P: '#3b82f6', E: '#06b6d4', C: '#a855f7', V: '#10b981', S: '#f59e0b' };

            function chartOpts(yLabel) {
                return {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                        y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#94a3b8', font: { size: 9 } }, title: { display: true, text: yLabel, color: '#94a3b8', font: { size: 10 } } }
                    }
                };
            }

            function renderCharts() {
                const agSel = document.getElementById('chart-agent-sel').value;
                const mesSel = document.getElementById('chart-mes-sel').value;
                const promSel = document.getElementById('chart-prom-sel').value;
                const teamSel = document.getElementById('chart-team-sel').value;
                let entries = state.entries.filter(e => (agSel === '__all__' || e.agent === agSel) && (!mesSel || e.mes === mesSel) && (!promSel || state.teamToPromotorMap[e.teamCode] === promSel) && (!teamSel || e.teamCode === teamSel));
                const labelSet = [...new Set(entries.map(e => `${e.mes}??S${e.semana}`))].sort();

                function aggByLabel(col) {
                    return labelSet.map(lk => {
                        const [m, sn] = lk.split('??'); const s = sn.replace('S', '');
                        let suma = 0;
                        entries.filter(e => e.mes === m && e.semana == s).forEach(e => {
                            e.dias.forEach(d => { if (validateDay(d).ok) suma += (col === 'prima' ? d.prima : d[col]); });
                        });
                        return suma;
                    });
                }

                destroyChart('volume');
                charts['volume'] = new Chart(document.getElementById('chartVolume').getContext('2d'), {
                    type: 'line',
                    data: { labels: labelSet, datasets: COLS.map(c => ({ label: c, data: aggByLabel(c), borderColor: CHART_COLORS[c], tension: .4, fill: false })) },
                    options: chartOpts('Cantidad')
                });

                destroyChart('prima');
                charts['prima'] = new Chart(document.getElementById('chartPrima').getContext('2d'), {
                    type: 'bar',
                    data: { labels: labelSet, datasets: [{ label: 'Prima $', data: aggByLabel('prima'), backgroundColor: 'rgba(212,175,55,.5)', borderColor: '#d4af37', borderWidth: 1 }] },
                    options: chartOpts('Monto $')
                });

                function ratioSeries(numCol, denCol, color, lbl) {
                    return {
                        label: lbl,
                        data: labelSet.map(lk => {
                            const [m, sn] = lk.split('??'); const s = sn.replace('S', '');
                            const seg = entries.filter(e => e.mes === m && e.semana == s);
                            let nm = 0, dn = 0;
                            seg.forEach(e => e.dias.forEach(d => { if (validateDay(d).ok) { nm += (numCol === 'prima' ? d.prima : d[numCol]); dn += (denCol === 'prima' ? d.prima : d[denCol]); } }));
                            return dn > 0 ? (nm / dn).toFixed(2) : 0;
                        }),
                        borderColor: color, tension: .4, fill: false
                    };
                }

                destroyChart('ratios');
                charts['ratios'] = new Chart(document.getElementById('chartRatios').getContext('2d'), {
                    type: 'line',
                    data: { labels: labelSet, datasets: [ratioSeries('E', 'P', '#06b6d4', 'P???E'), ratioSeries('C', 'E', '#a855f7', 'E???C'), ratioSeries('V', 'C', '#10b981', 'C???V')] },
                    options: chartOpts('Ratio')
                });

                destroyChart('efectividad');
                charts['efectividad'] = new Chart(document.getElementById('chartEfectividad').getContext('2d'), {
                    type: 'line',
                    data: { labels: labelSet, datasets: [ratioSeries('V', 'P', '#f59e0b', 'P???V'), ratioSeries('S', 'P', '#ef4444', 'P???S')] },
                    options: chartOpts('Tasa')
                });

                destroyChart('primaRatios');
                charts['primaRatios'] = new Chart(document.getElementById('chartPrimaRatios').getContext('2d'), {
                    type: 'line',
                    data: { labels: labelSet, datasets: [ratioSeries('prima', 'V', '#d4af37', '$/V'), ratioSeries('prima', 'S', '#10b981', '$/S')] },
                    options: chartOpts('$ Avg')
                });
            }

            function renderKPIs() {
                const mesSel = document.getElementById('kpi-mes-sel').value;
                const promSel = document.getElementById('kpi-prom-sel').value;
                const teamSel = document.getElementById('kpi-team-sel').value;
                let entries = state.entries.filter(e => (!mesSel || e.mes === mesSel) && (!promSel || state.teamToPromotorMap[e.teamCode] === promSel) && (!teamSel || e.teamCode === teamSel));
                const agMap = {};
                entries.forEach(e => {
                    if (!agMap[e.agent]) agMap[e.agent] = { P: 0, E: 0, C: 0, V: 0, S: 0, prima: 0 };
                    e.dias.forEach(d => { if (validateDay(d).ok) { COLS.forEach(c => agMap[e.agent][c] += d[c]); agMap[e.agent].prima += d.prima; } });
                });
                const agents = Object.keys(agMap).sort((a, b) => agMap[b].prima - agMap[a].prima);

                destroyChart('kpiPrima');
                charts['kpiPrima'] = new Chart(document.getElementById('kpiPrima').getContext('2d'), {
                    type: 'bar', data: { labels: agents, datasets: [{ label: 'Prima Neta ($)', data: agents.map(a => agMap[a].prima), backgroundColor: '#d4af37' }] },
                    options: chartOpts('$')
                });

                destroyChart('kpiVolumen');
                charts['kpiVolumen'] = new Chart(document.getElementById('kpiVolumen').getContext('2d'), {
                    type: 'bar', data: { labels: agents, datasets: [{ label: 'V', data: agents.map(a => agMap[a].V), backgroundColor: CHART_COLORS.V }, { label: 'P', data: agents.map(a => agMap[a].P), backgroundColor: CHART_COLORS.P }] },
                    options: chartOpts('Units')
                });

                destroyChart('kpiEfectividad');
                charts['kpiEfectividad'] = new Chart(document.getElementById('kpiEfectividad').getContext('2d'), {
                    type: 'bar', data: { labels: agents, datasets: [{ label: 'P ??? V', data: agents.map(a => agMap[a].P > 0 ? (agMap[a].V / agMap[a].P).toFixed(2) : 0), backgroundColor: CHART_COLORS.C }] },
                    options: chartOpts('Ratio')
                });

                destroyChart('kpiPrimaV');
                charts['kpiPrimaV'] = new Chart(document.getElementById('kpiPrimaV').getContext('2d'), {
                    type: 'bar', data: { labels: agents, datasets: [{ label: '$/V', data: agents.map(a => agMap[a].V > 0 ? (agMap[a].prima / agMap[a].V).toFixed(0) : 0), backgroundColor: '#d4af37' }] },
                    options: chartOpts('$')
                });

                destroyChart('kpiPrimaS');
                charts['kpiPrimaS'] = new Chart(document.getElementById('kpiPrimaS').getContext('2d'), {
                    type: 'bar', data: { labels: agents, datasets: [{ label: '$/S', data: agents.map(a => agMap[a].S > 0 ? (agMap[a].prima / agMap[a].S).toFixed(0) : 0), backgroundColor: CHART_COLORS.S }] },
                    options: chartOpts('$')
                });
            }

            function loadReporte(mesStr, coachName) {
                const r = (state.reportes || []).find(r => r.mes === mesStr && r.coachName === coachName);
                if (!r) return;
                document.getElementById('promotor-reporte-view').innerHTML = `
                <div style="background:rgba(255,255,255,0.03); padding:24px; border-radius:12px; border:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                        <div><h3 style="margin:0; color:var(--gold);">${r.mes}</h3><p style="margin:5px 0 0; font-size:12px; color:var(--slate);">Coach: <strong>${r.coachName}</strong></p></div>
                        <div style="text-align:right"><p style="margin:0; font-size:11px; color:var(--slate);">Fecha:</p><p style="margin:2px 0 0; font-size:12px;">${new Date(r.fecha).toLocaleDateString()}</p></div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div><label class="field-label">An??lisis</label><p style="font-size:14px; line-height:1.6; white-space:pre-wrap;">${r.analisis || '???'}</p></div>
                        <div><label class="field-label">Fraude/Sospecha</label><p style="font-size:14px; line-height:1.6; white-space:pre-wrap;">${r.agentes || '???'}</p></div>
                        <div><label class="field-label">Compromisos</label><p style="font-size:14px; line-height:1.6; white-space:pre-wrap;">${r.compromisos || '???'}</p></div>
                        <div><label class="field-label">Notas</label><p style="font-size:14px; line-height:1.6; white-space:pre-wrap;">${r.notas || '???'}</p></div>
                    </div>
                </div>`;
                document.getElementById('modal-reporte-log').classList.remove('open');
            }

            function renderReporteHistory() {
                const el = document.getElementById('rpt-history'); if (!el) return;
                const promF = document.getElementById('rpt-prom-sel').value;
                const teamF = document.getElementById('rpt-team-sel').value;
                const coachF = state.coachMap[teamF];

                let list = state.reportes || [];
                if (promF) list = list.filter(r => r.promotorCode === promF);
                if (coachF) list = list.filter(r => r.coachName === coachF);

                if (!list.length) { el.innerHTML = '<div class="empty-state">No hay reportes.</div>'; return; }
                el.innerHTML = list.map(r => `
                <div class="history-chip" onclick="loadReporte('${r.mes}', '${r.coachName}')" style="flex-direction:column; align-items:flex-start; padding:12px;">
                    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:5px;"><span style="font-weight:700;color:var(--gold)">${r.mes}</span><span style="color:var(--slate);font-size:10px;">${new Date(r.fecha).toLocaleDateString()}</span></div>
                    <span style="color:var(--white);font-size:11px;">Coach: ${r.coachName}</span>
                </div>`).join('');
            }

            // Exposures
            window.openConfig = openConfig;
            window.closeConfig = closeConfig;
            window.saveConfigDirector = saveConfigDirector;
            window.switchTab = switchTab;
            window.toggleRed = toggleRed;
            window.renderCharts = renderCharts;
            window.renderKPIs = renderKPIs;
            window.renderLeaderboard = renderLeaderboard;
            window.renderReporteHistory = renderReporteHistory;
            window.loadReporte = loadReporte;
            window.refreshTeamSelects = refreshTeamSelects;

        
