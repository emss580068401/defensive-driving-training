/**
 * 煞停距離與規備實驗室 V10.4.1 PRO (Modular DT Edition)
 * 核心引擎：Delta Time (dt) 物理補足 + V10.4 戰術框架
 */

(function () {
    const G = 9.81;
    const ENV_DATA = {
        sunny: { mu: 0.85, weather: 'sunny', night: false, grass: '#166534' },
        rainy: { mu: 0.71, weather: 'rainy', night: false, grass: '#14532d' },
        night: { mu: 0.75, weather: 'sunny', night: true, grass: '#020617' }
    };
    const RISK_DATA = {
        1: { rushProb: 0, label: '穩定巡航' },
        2: { rushProb: 0.4, label: '隨機衝突' },
        3: { rushProb: 0.666, label: '極限預判' }
    };

    let currentEnv = 'sunny', currentRisk = 3;
    let mu = 0.85, speed = 0, state = 'IDLE', dist = 50, reactMs = 0, timeS = 0, targetX = 0;
    let targetD = 50, rushProb = 0.666, roadPos = 0, sceneryProps = [], currentStreak = 0, tempRecordScore = 0;

    // Delta Time 補償變數
    let lastTime = 0;
    let skidSpawnTimer = 0;

    const hSpeed = document.getElementById('v10-val-speed'), hMs = document.getElementById('v10-val-ms');
    const hStreak = document.getElementById('v10-val-streak');
    const mBtn = document.getElementById('v10-btn-main'), truck = document.getElementById('truck-v10');
    const nightShade = document.getElementById('night-shade'), roadWet = document.getElementById('road-wet');
    const pZone = document.getElementById('p-zone-v10'), resultV10 = document.getElementById('result-v10');
    const sceneL = document.getElementById('scene-l'), sceneR = document.getElementById('scene-r');
    const marks = document.getElementById('v10-marks'), fx = document.getElementById('fx-layer');
    const roadBox = document.getElementById('road-box'), cvs = document.getElementById('v10-particles');
    const ctx_p = cvs.getContext('2d');

    let ctx = null, eng = null, rainDrops = [];

    function resizeCvs() {
        cvs.width = cvs.clientWidth || cvs.offsetWidth || 1200;
        cvs.height = cvs.clientHeight || cvs.offsetHeight || 900;
    }
    window.addEventListener('load', () => { setTimeout(resizeCvs, 300); });
    window.addEventListener('resize', resizeCvs);
    resizeCvs();

    function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
    document.addEventListener('mousedown', () => { const c = getCtx(); if (c.state === 'suspended') c.resume(); });

    function beep(f, t, vol) { try { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + t); } catch (e) { } }
    function playCrash() { 
        beep(60, 1.2, 1.5); 
        playGlassBreak(); // 🟢 增加玻璃碎裂音效
        roadBox.classList.add('crash-flash'); 
        triggerCollisionVFX();
        setTimeout(() => roadBox.classList.remove('crash-flash'), 500); 
    }

    // 🟢 新增：戰術違規專用回饋 (僅警告聲與閃爍，無玻璃碎裂)
    function playViolation() {
        beep(150, 0.5, 1.2); // 更尖銳、短促的警告音
        roadBox.classList.add('crash-flash'); 
        setTimeout(() => roadBox.classList.remove('crash-flash'), 500); 
    }

    // 🟢 新增：戰術違規專用回饋 (僅警告聲與閃爍，無玻璃碎裂)
    function playViolation() {
        beep(150, 0.5, 1.2); // 更尖銳、短促的警告音
        roadBox.classList.add('crash-flash'); 
        setTimeout(() => roadBox.classList.remove('crash-flash'), 500); 
    }

    // 🟢 新增：合成玻璃碎裂音效 (利用高頻震盪與白噪音)
    function playGlassBreak() {
        try {
            const c = getCtx();
            const now = c.currentTime;
            
            // 隨機高頻碎裂聲
            for (let i = 0; i < 5; i++) {
                const o = c.createOscillator();
                const g = c.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(1500 + Math.random() * 3000, now + i * 0.02);
                g.gain.setValueAtTime(0.3, now + i * 0.02);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.15 + i * 0.05);
                o.connect(g); g.connect(c.destination);
                o.start(now + i * 0.02); o.stop(now + 0.3);
            }

            // 白噪音殘響
            const bufSize = c.sampleRate * 0.5;
            const buffer = c.createBuffer(1, bufSize, c.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
            const src = c.createBufferSource();
            src.buffer = buffer;
            const gNoise = c.createGain();
            gNoise.gain.setValueAtTime(0.5, now);
            gNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            src.connect(gNoise); gNoise.connect(c.destination);
            src.start(now);
        } catch (e) { console.error("Audio error:", e); }
    }
    function playScreech() { try { const c = getCtx(), o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 1.5; o.frequency.setValueAtTime(800, c.currentTime); o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.5); g.gain.setValueAtTime(1.5, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5); o.connect(f); f.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5); } catch (e) { } }

    function updEng(s) {
        try {
            const c = getCtx();
            if (!eng) {
                eng = c.createOscillator(); const g = c.createGain(); eng.type = 'sawtooth'; g.gain.value = 0.05; eng.connect(g); g.connect(c.destination); eng.start();
                eng.vGain = g;
            }
            eng.frequency.setTargetAtTime(30 + s * 1.5, c.currentTime, 0.1);
        } catch (e) { }
    }
    function stopEng() { if (eng) { eng.vGain.gain.setTargetAtTime(0, getCtx().currentTime, 0.2); setTimeout(() => { if (eng) { eng.stop(); eng = null; } }, 300); } }

    function loadFame() {
        const list = JSON.parse(localStorage.getItem('v10-hero-board') || '[]');
        const html = list.length ? list.map((h, i) => `
            <div class="fame-item">
                <span>#${i + 1} ${h.name}</span>
                <span class="fame-streak">${h.score} WIN</span>
            </div>
        `).join('') : '<div style="text-align:center; opacity:0.3; padding:20px;">戰場空虛中...</div>';
        document.getElementById('v10-fame-list').innerHTML = html;
    }

    window.saveFame = () => {
        const name = document.getElementById('fame-name-input').value.trim() || "戰術官";
        let list = JSON.parse(localStorage.getItem('v10-hero-board') || '[]');
        list.push({ name, score: tempRecordScore, date: new Date().toISOString() });
        list.sort((a, b) => b.score - a.score);
        localStorage.setItem('v10-hero-board', JSON.stringify(list.slice(0, 10)));
        document.getElementById('fame-input-group').style.display = 'none';
        tempRecordScore = 0;
        loadFame();
    };

    function initScenery() {
        sceneL.innerHTML = ''; sceneR.innerHTML = ''; marks.innerHTML = ''; sceneryProps = [];
        const types = ['🌳', '🌲', '🌲', '🌳'];
        for (let i = 0; i < 15; i++) {
            const iconL = types[Math.floor(Math.random() * types.length)];
            const iconR = types[Math.floor(Math.random() * types.length)];
            const pL = document.createElement('div'), pR = document.createElement('div');
            pL.className = 'prop'; pL.innerText = iconL; pL.style.fontSize = '80px';
            const offsetL = 250 + Math.random() * 120;
            pL.style.right = offsetL + 'px';
            pR.className = 'prop'; pR.innerText = iconR; pR.style.fontSize = '80px';
            const offsetR = 250 + Math.random() * 120;
            pR.style.left = offsetR + 'px';
            sceneL.appendChild(pL); sceneR.appendChild(pR);
            sceneryProps.push({ elL: pL, elR: pR, y: i * 220 });
        }
        for (let i = 0; i < 15; i++) {
            const l = document.createElement('div'); l.className = 'lane-mark'; l.style.top = (i * 200) + 'px'; marks.appendChild(l);
        }
    }

    function updateRain(dt) {
        if (currentEnv !== 'rainy') { ctx_p.clearRect(0, 0, cvs.width, cvs.height); return; }
        if (rainDrops.length < 100) {
            rainDrops.push({ x: Math.random() * cvs.width, y: -20, l: 15 + Math.random() * 20, s: 20 + Math.random() * 20 });
        }
        ctx_p.clearRect(0, 0, cvs.width, cvs.height);
        ctx_p.strokeStyle = 'rgba(173, 216, 230, 0.4)';
        ctx_p.lineWidth = 1;
        rainDrops.forEach((d, i) => {
            ctx_p.beginPath(); ctx_p.moveTo(d.x, d.y); ctx_p.lineTo(d.x - 2, d.y + d.l); ctx_p.stroke();
            d.y += d.s * (dt * 60); d.x -= 2 * (dt * 60);
            if (d.y > cvs.height) { d.y = -20; d.x = Math.random() * cvs.width; }
        });
    }

    function updateScenery(s, dt) {
        sceneryProps.forEach(p => {
            p.y = (p.y + s * 2.5 * (dt * 60)) % 2400;
            let visibleY = p.y - 400;
            p.elL.style.transform = `translateY(${visibleY}px)`; p.elR.style.transform = `translateY(${visibleY}px)`;
        });
        roadPos = (roadPos + s * 2.5 * (dt * 60)) % 400;
        marks.style.transform = `translateX(-50%) translateY(${roadPos}px)`;

        Array.from(fx.children).forEach(p => {
            let top = parseFloat(p.style.top) || 0;
            top += s * 2.5 * (dt * 60); p.style.top = top + 'px';
            if (top > 1200) p.remove();
        });

        if (state === 'ACCEL') { truck.classList.add('sway'); spawnEx(); } else truck.classList.remove('sway');
        if (state === 'BRAKING' && speed > 5) {
            truck.classList.add('nose-dive');
            skidSpawnTimer += dt;
            if (skidSpawnTimer > 0.05) { spawnSkid(); skidSpawnTimer = 0; }
            spawnEx();
        } else if (state !== 'ACCEL') truck.classList.remove('nose-dive');
    }

    function spawnEx() {
        if (fx.childElementCount > 20) return;
        const h = roadBox.offsetHeight || 900;
        const spawnY = h - 160;
        const p = document.createElement('div'); p.className = 'exhaust-p';
        p.style.width = p.style.height = '15px'; p.style.left = '232px'; p.style.top = spawnY + 'px';
        fx.appendChild(p); setTimeout(() => p.remove(), 800);
    }

    function spawnSkid() {
        if (fx.childElementCount > 40) return;
        const h = roadBox.offsetHeight || 900;
        const spawnY = h - 105; 
        const s = document.createElement('div'); 
        s.className = 'skidV10'; 
        s.style.height = '120px'; 
        s.style.width = '16px';
        s.style.left = '200px'; 
        s.style.top = (spawnY - 120) + 'px'; 
        fx.appendChild(s);
        const r = s.cloneNode(); 
        r.style.left = '258px'; 
        fx.appendChild(r);
    }

    function calculatePerformance(finalDist, reactionTime) {
        const current_v_ms = speed / 3.6; 
        const theoreticalBrakingDist = (current_v_ms * current_v_ms) / (2 * mu * G);
        const reactionDist = current_v_ms * (reactionTime / 1000);
        const initialDist = window.startDist || 45; 
        return {
            isCrash: finalDist <= 0.5,
            margin: Math.max(0, finalDist),
            efficiency: ((theoreticalBrakingDist / Math.max(1, initialDist - reactionDist)) * 100).toFixed(1)
        };
    }

    initScenery(); loadFame();

    window.setEnv = (type, noReset) => {
        if (!noReset && (state !== 'IDLE' && state !== 'DONE')) return;
        currentEnv = type; const d = ENV_DATA[type]; mu = d.mu;
        nightShade.style.display = d.night ? 'block' : 'none';
        roadWet.style.opacity = d.weather === 'rainy' ? 0.6 : 0;
        document.getElementById('scene-l').style.background = d.grass;
        document.getElementById('scene-r').style.background = d.grass;
        if (!noReset) resetV10();
    };

    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        if (state === 'ACCEL') {
            let targetMaxSpeed = Math.min(60 + (currentStreak * 5), 100);
            if (speed < targetMaxSpeed) {
                speed += 60 * dt; 
            } else {
                speed = targetMaxSpeed; 
                state = 'WAIT';
            }
        } else if (state === 'WAIT') {
            if (Math.random() > 0.985) { triggerSig(); }
        } else if (state === 'REACTING') {
            dist -= (speed / 3.6) * dt;
            if (dist < 1.5 && Math.abs(targetX) < 80) collisionCheck();
            if (dist < -20) { state = 'DONE'; stopEng(); setTimeout(showR, 1000); }
        } else if (state === 'BRAKING') {
            let v_ms = speed / 3.6;
            const decel = mu * G;
            let next_v_ms = Math.max(0, v_ms - (decel * dt));
            speed = next_v_ms * 3.6;
            dist -= v_ms * dt;
            if (speed > 5) playScreech();
            if (dist < 10 && Math.abs(targetX) < 80) collisionCheck();
            if (speed <= 0) { state = 'DONE'; stopEng(); setTimeout(showR, 1500); }
        }

        hSpeed.innerText = Math.floor(speed);
        updateScenery(speed, dt); updEng(speed); updateRain(dt);

        if (state === 'REACTING' || state === 'BRAKING') {
            const h = roadBox.clientHeight || 800;
            let initialD = window.startDist || 45; 
            let pTop = (h - 230) * (1 - (dist / initialD)); 
            pZone.style.top = pTop + 'px';
            let pScale = 0.5 + (1 - dist / initialD) * 0.3;
            pScale = Math.max(0.5, Math.min(0.85, pScale));
            document.getElementById('p-scaler').style.transform = `scale(${pScale})`;
        }
        requestAnimationFrame(loop);
    }

    function triggerSig() {
        state = 'REACTING'; timeS = performance.now();
        pZone.style.display = 'flex'; 
        pZone.style.top = '10px'; 
        
        let v_ms = speed / 3.6;
        let minBrakeDist = (v_ms * v_ms) / (2 * mu * G);
        
        // 🟢 優化後：達到 10 連勝後，反應時間開始殘酷倒數 [疲勞極限]
        let reactionBuffer = 0.85;
        if (currentStreak >= 10) {
            // 第 10 關: 0.85s -> 第 11 關: 0.8s -> 第 17 關降至 0.45s 封頂
            reactionBuffer = Math.max(0.45, 0.85 - ((currentStreak - 9) * 0.05));
            console.log(`[系統警告] 駕駛疲勞攀升，當前強制反應視窗縮減至: ${reactionBuffer.toFixed(2)}s`);
        }
        
        dist = Math.max(45, minBrakeDist + (v_ms * reactionBuffer) + (v_ms * 0.2)); 
        window.startDist = dist;

        const targets = ['🚶', '🏃', '🦌', '👨‍🦽', '🐕'];
        const tEl = document.getElementById('p-target');
        tEl.innerText = targets[Math.floor(Math.random() * targets.length)];
        
        const isRush = Math.random() < rushProb;
        if (isRush) {
            const fromLeft = Math.random() > 0.5;
            let falseAlarmRate = currentStreak < 2 ? 0 : Math.min(0.6, 0.15 + (currentStreak * 0.05));
            const stopHalf = Math.random() < falseAlarmRate;
            targetX = stopHalf ? (fromLeft ? -120 : 120) : 0;
            tEl.style.setProperty('--start-x', (fromLeft ? -400 : 400) + 'px');
            tEl.style.setProperty('--target-x', targetX + 'px');
            tEl.className = fromLeft ? 'rush-left' : 'rush-right';
        } else {
            targetX = 0; tEl.className = ''; tEl.style.transform = 'none';
        }
    }

    function collisionCheck() {
        // 🟢 僅當標的物確實在車道內 (targetX === 0) 且發生「碰撞」才觸發碎裂
        if (targetX === 0) {
            state = 'DONE'; playCrash(); stopEng(); setTimeout(showR, 1500);
        } else {
            // 若為虛假標的 (假動作)，通過時不產生特效，直接結算成功
            state = 'DONE'; stopEng(); setTimeout(showR, 100);
        }
    }

    window.resetV10 = () => {
        state = 'IDLE'; speed = 0; dist = 40; reactMs = 0; lastTime = 0;
        hMs.innerText = '0.00'; pZone.style.display = 'none'; resultV10.style.display = 'none';
        truck.style.transform = 'none'; fx.innerHTML = '';
        document.querySelectorAll('.t-tail-l, .t-tail-r, .led-bar').forEach(l => l.classList.add('active'));
        document.getElementById('fame-input-group').style.display = 'none';
        hStreak.style.color = "var(--warning)";
        stopEng();
    };

    function showR(isViolation) {
        if (state !== 'DONE') return;
        const h = document.getElementById('v10-res-h'), p = document.getElementById('v10-res-p');
        let isPass = false;

        if (isViolation) {
            h.innerText = "❌ 觸發戰術違規"; h.style.color = '#ef4444';
            p.innerText = "戰術失誤：嚴禁在目標出現前進行預期性煞車。連勝中斷。";
        } else {
            const performance = calculatePerformance(dist, reactMs);
            if (performance.isCrash && Math.abs(targetX) < 80) {
                h.innerText = "發生嚴重碰撞"; h.style.color = '#ef4444';
                p.innerText = `煞停不及！致命撞擊！連勝中斷。`;
            } else if (Math.abs(targetX) >= 80) {
                if (reactMs > 0) {
                    h.innerText = "誤判虛假威脅"; h.style.color = '#ef4444';
                    p.innerText = "戰術失誤：針對不構成威脅的標的煞車。連勝中斷。";
                } else {
                    h.innerText = "精準識別威脅"; h.style.color = '#10b981';
                    p.innerText = "判斷精準！成功安全通過。"; isPass = true;
                }
            } else {
                h.innerText = "安全穩定煞停"; h.style.color = '#10b981';
                p.innerText = `反應時間: ${(reactMs / 1000).toFixed(2)}s | 剩餘冗餘距離: ${performance.margin.toFixed(1)}m`;
                isPass = true;
            }
        }

        if (isPass) {
            currentStreak++;
            hStreak.innerText = currentStreak;
            hStreak.style.color = "var(--warning)";
        } else {
            tempRecordScore = currentStreak;
            currentStreak = 0;
            hStreak.innerText = '0';
            hStreak.style.color = "var(--danger)";
            const list = JSON.parse(localStorage.getItem('v10-hero-board') || '[]');
            if (tempRecordScore > 0 && (list.length < 10 || tempRecordScore > list[list.length - 1].score)) {
                document.getElementById('fame-input-group').style.display = 'flex';
            }
        }
        resultV10.style.display = 'flex';
    }

    let lastClickTime = 0;
    function handleAction() {
        const now = performance.now();
        if (now - lastClickTime < 500) return; 
        lastClickTime = now;

        const c = getCtx(); if (c.state === 'suspended') c.resume();
        resizeCvs();
        if (state === 'IDLE') {
            const envs = ['sunny', 'rainy', 'night'];
            const randEnv = envs[Math.floor(Math.random() * envs.length)];
            setEnv(randEnv, true);
            state = 'ACCEL'; document.querySelectorAll('.led-bar').forEach(l => l.classList.add('active'));
            hStreak.style.color = "var(--warning)";
        }
        else if (state === 'ACCEL' || state === 'WAIT') {
            state = 'DONE'; stopEng();
            playViolation(); // 🟢 預期性煞車：回傳違規警告，不碎裂
            showR(true);
        }
        else if (state === 'REACTING') {
            // 🟢 特別追加：若對虛假標的 (小狗停在路邊) 煞車，視為戰術誤判
            if (targetX !== 0) {
                state = 'DONE'; stopEng();
                playViolation(); 
                showR(); // showR 會自動判定為「誤判虛假威脅」
            } else {
                state = 'BRAKING'; reactMs = performance.now() - timeS;
                hMs.innerText = (reactMs / 1000).toFixed(2);
                document.querySelectorAll('.t-tail-l, .t-tail-r').forEach(l => l.classList.add('active'));
            }
        }
    }

    if (mBtn) mBtn.onclick = handleAction;
    window.handleAction = handleAction;

    document.addEventListener('pointerdown', (e) => {
        if (resultV10 && resultV10.style.display === 'flex' && resultV10.contains(e.target)) return;
        if (state === 'IDLE' || state === 'WAIT' || state === 'ACCEL' || state === 'REACTING') {
            if (e.target.tagName !== 'BUTTON') {
                handleAction();
            }
        }
    });

    requestAnimationFrame((timestamp) => {
        lastTime = timestamp;
        loop(timestamp);
    });
})();
