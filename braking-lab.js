/**
 * 煞停距離與規避實驗室 V10.4.1 PRO (Modular DT Edition)
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
    let mu = 0.85, speed = 0, state = 'IDLE', dist = 40, reactMs = 0, timeS = 0, targetX = 0;
    let targetD = 40, rushProb = 0.666, roadPos = 0, sceneryProps = [], currentStreak = 0, tempRecordScore = 0;
    let isAudioSilenced = false; // 🟢 追蹤全域靜音狀態

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
        checkMobile();
    }
    function checkMobile() {
        if (window.innerWidth < 1080) {
            document.documentElement.classList.add('is-mobile');
        } else {
            document.documentElement.classList.remove('is-mobile');
        }
    }
    window.addEventListener('DOMContentLoaded', resizeCvs);
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
        if (isAudioSilenced) return; // 🟢 靜音模式下不啟動引擎
        try {
            const c = getCtx();
            if (!eng) {
                eng = c.createOscillator(); const g = c.createGain(); eng.type = 'sawtooth'; g.gain.value = 0.05; eng.connect(g); g.connect(c.destination); eng.start();
                eng.vGain = g;
            }
            eng.frequency.setTargetAtTime(30 + s * 1.5, c.currentTime, 0.1);
        } catch (e) { }
    }
    function stopEng() { 
        if (eng) { 
            try {
                const now = getCtx().currentTime;
                eng.vGain.gain.setTargetAtTime(0, now, 0.1); 
                const oldEng = eng;
                eng = null; // 立即清除引用，防止下一幀重新啟動
                setTimeout(() => { if (oldEng) { oldEng.stop(); } }, 200); 
            } catch(e) {}
        } 
    }

    // 🟢 監聽來自父分頁的靜音指令
    window.addEventListener('message', (e) => {
        if (e.data.type === 'STOP_LAB_AUDIO') {
            isAudioSilenced = true;
            stopEng();
            const c = getCtx();
            if (c.state !== 'suspended') c.suspend(); 
        } else if (e.data.type === 'RESUME_LAB_AUDIO') {
            isAudioSilenced = false;
        }
    });

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
        
        // 🟢 修復：動態計算路面中心點
        const roadW = roadBox.offsetWidth;
        const carCenter = roadW / 2;
        
        p.style.width = p.style.height = '15px'; 
        p.style.left = (carCenter - 3) + 'px'; 
        p.style.top = spawnY + 'px';
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
        
        // 🟢 修復：動態計算左右輪打滑痕跡的中心偏移
        const roadW = roadBox.offsetWidth;
        const carCenter = roadW / 2;
        
        // 左輪
        s.style.left = (carCenter - 37) + 'px'; 
        s.style.top = (spawnY - 120) + 'px'; 
        fx.appendChild(s);
        
        // 右輪
        const r = s.cloneNode(); 
        r.style.left = (carCenter + 21) + 'px'; 
        fx.appendChild(r);
    }

    initScenery(); loadFame();

    window.setEnv = (type, noReset) => {
        if (!noReset && (state !== 'IDLE' && state !== 'DONE')) return;
        currentEnv = type; const d = ENV_DATA[type]; 
        
        // 🟢 核心修復：統一在此處動態結算熱衰減
        // 如果連勝大於 8，計算衰減值；若連勝歸零，衰減值自然歸零，完美恢復初始狀態
        let fadeAmount = currentStreak > 8 ? (currentStreak - 8) * 0.02 : 0;
        mu = Math.max(0.4, d.mu - fadeAmount);
        
        nightShade.style.display = d.night ? 'block' : 'none';
        roadWet.style.opacity = d.weather === 'rainy' ? 0.6 : 0;
        document.getElementById('scene-l').style.background = d.grass;
        document.getElementById('scene-r').style.background = d.grass;
        if (!noReset) resetV10();
    };
    // 🟢 補齊未定義的系統函式
    window.setRisk = (level) => {
        if (state !== 'IDLE' && state !== 'DONE') return;
        currentRisk = level;
        rushProb = RISK_DATA[level]?.rushProb || 0.666;
        console.log(`[系統設定] 威脅等級已切換至 Lv.${level}`);
    };


    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        if (state === 'ACCEL') {
            // 🟢 優化後：基於連勝數穩定爬升 (每贏一次加 5km/h，極限 100)
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
            
            // 🟢 修復：加入 else if，確保撞車與越線不會在同一幀重複觸發
            if (dist < 0 && Math.abs(targetX) < 80) {
                collisionCheck(); 
            } else if (dist < -20) { 
                state = 'DONE'; stopEng(); setTimeout(showR, 1000); 
            }
            
        } else if (state === 'BRAKING') {
            let v_ms = speed / 3.6;
            const decel = mu * G;
            let next_v_ms = Math.max(0, v_ms - (decel * dt));
            speed = next_v_ms * 3.6;
            dist -= v_ms * dt;
            if (speed > 5) playScreech();
            
            // 🟢 修復：加入 else if，防止車速剛好為 0 且撞車時引發兩次 showR
            if (dist < 0 && Math.abs(targetX) < 80) {
                collisionCheck(); 
            } else if (speed <= 0) { 
                state = 'DONE'; stopEng(); setTimeout(showR, 1500); 
            }
        }

        hSpeed.innerText = Math.floor(speed);
        
        if (state !== 'DONE') {
            updateScenery(speed, dt); 
            updEng(speed); 
        }
        updateRain(dt); // 🟢 修復：殭屍 Bug - 狀態為 DONE 時阻斷捲動與音訊，僅保留雨滴

        if (state === 'REACTING' || state === 'BRAKING') {
            const h = document.getElementById('road-box').clientHeight || 800;
            // 採用動態的初始距離作為分母
            let initialD = window.startDist || 45; 
            let pTop = (h - 230) * (1 - (dist / initialD)); 
            pZone.style.top = pTop + 'px';

            // 修正縮放：確保遠處視覺依然合理
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
        
        // 🟢 修復 1：補回車速與純煞車距離的物理計算變數
        let v_ms = speed / 3.6;
        let minBrakeDist = (v_ms * v_ms) / (2 * mu * G);

        // 🟢 優化後：達到 10 連勝後，反應時間開始殘酷倒數 [疲勞極限]
        let reactionBuffer = 0.85;
        if (currentStreak >= 10) {
            // 第 10 關: 0.85s -> 第 11 關: 0.8s -> 第 17 關降至 0.45s 封頂
            reactionBuffer = Math.max(0.45, 0.85 - ((currentStreak - 9) * 0.05));
            console.log(`[系統警告] 駕駛疲勞攀升，當前強制反應視窗縮減至: ${reactionBuffer.toFixed(2)}s`);
        }
        
        // 距離公式改為：純煞車距離 + 反應緩衝 + 隨車速遞增的安全餘裕 (v_ms * 0.2)
        dist = Math.max(45, minBrakeDist + (v_ms * reactionBuffer) + (v_ms * 0.2)); 

        // 將生成的初始距離存入全域，供視覺渲染使用
        window.startDist = dist;
        window.startSpeed = speed; // 🟢 修復：記錄突發狀況瞬間的真實車速，供結算評分使用

        const targets = ['🚶', '🏃', '🦌', '👨‍🦽', '🐕'];
        const tEl = document.getElementById('p-target');
        tEl.innerText = targets[Math.floor(Math.random() * targets.length)];
        
        const isRush = Math.random() < rushProb;
        if (isRush) {
            // 🟢 修復 2：補回決定目標從左邊還是右邊衝出的變數
            const fromLeft = Math.random() > 0.5;

            // 前兩關無假動作，後續慢慢增加，極限 60% [修正方案 B]
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
        state = 'DONE'; playCrash(); stopEng(); setTimeout(showR, 1500);
    }

    window.resetV10 = () => {
        state = 'IDLE'; speed = 0; dist = 40; reactMs = 0; lastTime = 0;
        window.roundTargetSpeed = 0; // 重置每局目標時速
        window.startSpeed = 0; // 🟢 重置快照車速

        // 🟢 修復：在此移除直接賦值 mu，權限交還給 setEnv 進行環境物理初始化
        // mu = ENV_DATA[currentEnv].mu; 

        hMs.innerText = '0.00'; pZone.style.display = 'none'; resultV10.style.display = 'none';
        truck.style.transform = 'none'; fx.innerHTML = '';
        document.querySelectorAll('.t-tail-l, .t-tail-r, .led-bar').forEach(l => l.classList.add('active')); // Reset LEDs
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

            if (performance.isCrash && Math.abs(targetX) < 80) { // 採用優化後的碰撞門檻
                h.innerText = "發生嚴重碰撞"; h.style.color = '#ef4444';
                p.innerText = `煞停不及！致命撞擊！剩餘撞擊距離: 0.0m`; 
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
                p.innerText = `反應時間: ${(reactMs / 1000).toFixed(2)}s | 剩餘撞擊距離: ${performance.margin.toFixed(1)}m`;
                isPass = true;
            }
        }

        if (isPass) {
            currentStreak++;
            
            // 🟢 修補：煞車熱衰減 (Brake Fade) 邏輯已搬遷至 setEnv
            // 此處僅作為 console 資訊提示 UI，不再直接更動 mu
            if (currentStreak > 8) {
                console.log(`[系統警告] 煞車系統過熱，下一局制動力將下降！`);
            }
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

        // 🟢 UX 優化：根據輸贏動態改變按鈕文字，消除玩家疑慮
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.innerText = isPass ? '繼續下一局' : '重新開始';
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
            state = 'ACCEL'; 
            document.querySelectorAll('.led-bar').forEach(l => l.classList.add('active'));
            
            // 🟢 修復：起步加速時，確保煞車燈熄滅
            document.querySelectorAll('.t-tail-l, .t-tail-r').forEach(l => l.classList.remove('active'));
            
            hStreak.style.color = "var(--warning)";
        }
        else if (state === 'REPEAT_BLOCK') return; 
        else if (state === 'ACCEL' || state === 'WAIT') {
            state = 'DONE'; stopEng();
            
            // 🟢 修復：提前踩煞車不會撞碎玻璃，改為播放單純的輪胎打滑聲
            playScreech(); 
            
            showR(true);
        }
        else if (state === 'REACTING') {
            state = 'BRAKING'; reactMs = performance.now() - timeS;
            hMs.innerText = (reactMs / 1000).toFixed(2);
            document.querySelectorAll('.t-tail-l, .t-tail-r').forEach(l => l.classList.add('active'));
        }
    }

    mBtn.onclick = handleAction;

    // 🟢 商業級優化：建立共用的高優先級角點觸控處理器
    const handleGlobalTap = (e) => {
        // 確保不是點擊在結算視窗或其子元素
        if (resultV10 && resultV10.style.display === 'flex' && resultV10.contains(e.target)) return;
        
        // 觸發全畫面主邏輯
        if (state === 'IDLE' || state === 'WAIT' || state === 'ACCEL' || state === 'REACTING') {
            // 排除其他實體按鈕點擊，由原生事件處理，避免重複
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault(); // 防止 touchstart 觸發後續的 pointerdown 導致雙重觸發
                handleAction();
            }
        }
    };

    // 移除原本的單一監聽器，替換為高效能混合監聽
    document.addEventListener('pointerdown', handleGlobalTap, { passive: false });

    // 啟動迴圈時傳入初始時間
    requestAnimationFrame((timestamp) => {
        lastTime = timestamp;
        loop(timestamp);
    });

    // 🟢 優化後：讀取目標出現瞬間的「快照車速」
    function calculatePerformance(finalDist, reactionTime) {
        // 使用快照車速，若無則降級使用當下 speed (防呆)
        const snapSpeed = window.startSpeed || speed; 
        const current_v_ms = snapSpeed / 3.6; 
        const theoreticalBrakingDist = (current_v_ms * current_v_ms) / (2 * mu * G);
        const reactionDist = current_v_ms * (reactionTime / 1000);
        
        // 讀取當局動態生成的 startDist，若無則預設 45
        const initialDist = window.startDist || 45; 
        
        return {
            isCrash: finalDist <= 0.5,
            margin: Math.max(0, finalDist),
            // 防止分母為負數的防呆機制
            efficiency: ((theoreticalBrakingDist / Math.max(1, initialDist - reactionDist)) * 100).toFixed(1)
        };
    }

    // 碰撞特效觸發器
    function triggerCollisionVFX() {
        const crack = document.getElementById('glass-crack');
        if (crack) {
            crack.classList.add('active');
            setTimeout(() => crack.classList.remove('active'), 2000);
        }
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // 行動端震動回饋
    }
})();
