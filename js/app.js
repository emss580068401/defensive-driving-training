/**
 * 安全駕駛學習網 - 核心邏輯 (SPA)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 數據與狀態 ---
    let currentTab = 'skills';
    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let userName = "";

    // 內嵌清脆點擊音效 (Base64)
    const clickAudio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT18=');
    function playClickSound() {
        clickAudio.currentTime = 0;
        clickAudio.play().catch(e => console.log("Audio play blocked"));
    }

    const HEADING_20 = [
        { title: "牢記轉彎及路權口訣", img: "images/Habit/1.png" },
        { title: "行前檢查確認", img: "images/Habit/2.png" },
        { title: "儀錶板或擋風玻璃下方保持淨空", img: "images/Habit/3.png" },
        { title: "常時開燈", img: "images/Habit/4.png" },
        { title: "避免單手開車", img: "images/Habit/5.png" }, 
        { title: "預作煞車準備", img: "images/Habit/6.png" },
        { title: "穿透視野行車法", img: "images/Habit/7.png" },
        { title: "隨時警覺前方人車動態", img: "images/Habit/8.png" }, 
        { title: "擺頭加身體前傾的轉彎哲學", img: "images/Habit/9.png" },
        { title: "注意超車陷阱", img: "images/Habit/10.png" },
        { title: "山路行駛要領", img: "images/Habit/11.png" },
        { title: "上坡熄火及下坡煞車失靈應變", img: "images/Habit/12.png" }, 
        { title: "迴轉或轉彎時避免繞彎", img: "images/Habit/13.png" },
        { title: "爆胎及水漂效應之應變", img: "images/Habit/14.png" },
        { title: "預防炫光及暗適應", img: "images/Habit/15.png" },
        { title: "同車責任制", img: "images/Habit/16.png" },
        { title: "兩段式開門及安全上下車", img: "images/Habit/17.png" },
        { title: "斜坡停車放輪檔", img: "images/Habit/18.png" },
        { title: "高速行駛遇塞車急煞因應", img: "images/Habit/19.png" },
        { title: "暴衝因應", img: "images/Habit/20.png" }
    ];

    const HEADING_10 = [
        { title: "紅燈直行逐段停煞", img: "images/tactics/21.png" },
        { title: "紅燈左轉逐段停煞", img: "images/tactics/22.png" },
        { title: "通過無號誌路口仍要逐段停煞", img: "images/tactics/23.png" },
        { title: "慢車道行駛策略", img: "images/tactics/24.png" }, 
        { title: "避免路口逆向跨越雙黃線", img: "images/tactics/25.png" },
        { title: "有交警指示通行仍做到逐段停煞", img: "images/tactics/26.png" },
        { title: "車組跟車時仍要逐段停煞", img: "images/tactics/27.png" },
        { title: "號誌剛轉換留意未減速車輛", img: "images/tactics/28.png" }, 
        { title: "車禍現場車輛部署", img: "images/tactics/29.png" },
        { title: "依據避讓口訣行駛", img: "images/tactics/30.png" }
    ];

    const VIDEOS = [
        { 
            title: "ABS 煞車與閃避技巧", 
            file: "videos/小車ABS煞車防鎖死作動 車道偏移閃避.MOV",
            steps: ["全力踩死煞車觸發 ABS", "握穩轉向盤執行避讓", "觀察週邊逃生空間"]
        },
        { 
            title: "目標物精準剎車", 
            file: "videos/目標物剎車.mp4",
            steps: ["預判目標停止線位置", "漸進式加壓煞車力道", "精準停妥並保持距離"]
        },
        { 
            title: "曲向倒車要領 (S型)", 
            file: "videos/曲向倒車.mp4",
            steps: ["內外側後視鏡盲區掃描", "低速控制 (半離合/點煞)", "修正車尾軌跡符合 S 路徑"]
        },
        { 
            title: "車道偏移閃避 (右轉)", 
            file: "videos/車道偏移閃避-右.MOV",
            steps: ["判斷障礙物偏轉量", "迅速執行右轉避讓", "閃避後立即回正重心"]
        },
        { 
            title: "車道偏移閃避 (左轉)", 
            file: "videos/車道偏移閃避-左.MOV",
            steps: ["確認左後方無來車", "果斷切換避讓路徑", "避免蛇行維持車身平穩"]
        },
        { 
            title: "定距離精準剎車", 
            file: "videos/定距離剎車.mp4",
            steps: ["固定距離標示點預判", "控制煞車減速曲線", "確保預定點前精準歸零"]
        },
        { 
            title: "輪檔放置標準要領", 
            file: "videos/輪檔放置要領.MOV",
            steps: ["確實熄火並拉上手煞車", "緊靠下坡側輪胎放置", "確認物理防護穩固到位"]
        },
        { 
            title: "下坡重新啟動要領", 
            file: "videos/下坡熄火重新啟動恢復剎車制動.MOV",
            steps: ["保持踩踏制動啟動引擎", "確認輔助倍力器恢復作用", "循序解除制動恢復動力"]
        }
    ];

    // --- 初始化 UI ---
    initNavigation();
    initVideos();
    renderHabits('basic');
    initDeploymentTrack();
    initQuiz();
    initAudio();
    initLightbox();

    // --- 導覽邏輯 ---
    function initNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn, .mobile-nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                playClickSound();
                switchTab(tabId);
            });
        });

        // 監聽滾動以更新進度條
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('top-progress-bar').style.width = scrolled + "%";
        });
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(el => el.classList.remove('active'));

        document.getElementById(`tab-${tabId}`).classList.add('active');
        document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));
        currentTab = tabId;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- 影片載入 ---
    function initVideos() {
        const gallery = document.querySelector('.video-gallery');
        VIDEOS.forEach(v => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <div class="video-thumb">
                    <video controls preload="metadata">
                        <source src="${v.file}" type="video/mp4">
                    </video>
                </div>
                <div class="video-card-info">
                    <h4>${v.title}</h4>
                    <div class="operation-steps">
                        <h5><i class="fas fa-list-ol"></i> 操作步驟要領：</h5>
                        <ul>
                            ${v.steps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            gallery.appendChild(card);
        });
    }

    // --- 20+10 習慣翻轉卡片 ---
    function renderHabits(type) {
        const list = document.getElementById('habits-list');
        list.className = 'flip-grid fade-in';
        list.innerHTML = '';
        const items = type === 'basic' ? HEADING_20 : HEADING_10;

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'flip-card';
            card.innerHTML = `
                <div class="flip-card-inner">
                    <div class="flip-card-front">
                        <h3>${index + 1}. ${item.title}</h3>
                        <p class="text-secondary" style="font-size:0.8rem; margin-top:10px;"><i class="fas fa-hand-pointer"></i> 點擊查看圖解</p>
                    </div>
                    <div class="flip-card-back" style="background-image: url('${item.img}'); background-size: cover; background-position: center;">
                        <div class="card-overlay">
                            <i class="fas fa-search-plus"></i>
                            <span>點擊放大細節</span>
                        </div>
                        <button class="btn-flip-back" title="回到標題">
                            <i class="fas fa-undo-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            card.addEventListener('click', (e) => {
                const isFlipBack = e.target.closest('.btn-flip-back');
                
                if (isFlipBack) {
                    e.stopPropagation();
                    playClickSound();
                    card.classList.remove('flipped');
                } else if (!card.classList.contains('flipped')) {
                    playClickSound();
                    card.classList.add('flipped');
                } else {
                    // 已翻轉狀態下點擊背面，由 initLightbox 全域監聽處理放大
                }
            });
            list.appendChild(card);
        });
    }

    document.getElementById('show-basic').addEventListener('click', function() {
        playClickSound();
        this.classList.add('active');
        document.getElementById('show-tactical').classList.remove('active');
        renderHabits('basic');
    });

    document.getElementById('show-tactical').addEventListener('click', function() {
        playClickSound();
        this.classList.add('active');
        document.getElementById('show-basic').classList.remove('active');
        renderHabits('tactical');
    });

    // --- 國道直線部屬互動與距離切換 ---
    function initDeploymentTrack() {
        const deployBtns = document.querySelectorAll('.deploy-btn:not(.status-btn)');
        const statusBtns = document.querySelectorAll('.status-btn');
        const distVals = document.querySelectorAll('.dist-val');
        const tacticalNodes = document.querySelectorAll('.tactical-node');
        const infoBox = document.getElementById('deployment-info-box');
        const policeNode = document.querySelector('.police-node');
        const nextDist = policeNode ? policeNode.nextElementSibling : null;

        // 處理距離切換 (15m / 25m)
        deployBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                playClickSound();
                deployBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const newDist = btn.getAttribute('data-dist');
                distVals.forEach(val => {
                    val.innerText = newDist;
                    val.style.animation = 'pulse 0.5s';
                    setTimeout(() => val.style.animation = '', 500);
                });
                
                infoBox.innerHTML = `<i class='fas fa-info-circle'></i> 已切換至 <strong>${newDist === '15' ? '快速道路' : '高速公路'}</strong> 標準，建議安全間距為 ${newDist}m。`;
            });
        });

        // 處理警察狀態切換
        statusBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                playClickSound();
                statusBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const status = btn.getAttribute('data-status');
                const nodeMiddle = document.getElementById('node-middle');
                const nodeDownstream = document.getElementById('node-downstream');
                const vehicleMiddle = document.getElementById('vehicle-middle');
                const labelMiddle = document.getElementById('label-middle');
                const nextDist = nodeMiddle.nextElementSibling;
                const downDist = nodeDownstream.previousElementSibling;

                if (status === 'pending') {
                    // 警察尚未抵達：救護車換到中間
                    vehicleMiddle.innerText = '救護車';
                    labelMiddle.innerText = '救護車';
                    vehicleMiddle.style.background = '#e74c3c'; // 救護車亮紅
                    nodeMiddle.setAttribute('data-info', '救護車 (暫代防禦)：警車尚未抵達時，應位於救災車與事故車之間，受救災車保護。');
                    
                    nodeDownstream.classList.add('node-hidden');
                    if (downDist) downDist.classList.add('node-hidden');
                    
                    infoBox.innerHTML = `<strong>戰術說明：警察尚未抵達。</strong> 您正處於「救災車優先抵達」模式，救護車應在中游待命受保護。`;
                } else {
                    // 警察已抵達：警車在中間，救護車到下游
                    vehicleMiddle.innerText = '警車';
                    labelMiddle.innerText = '警車';
                    vehicleMiddle.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'; 
                    nodeMiddle.setAttribute('data-info', '警車：協同防禦，停放於救災車與事故車之間。');

                    nodeDownstream.classList.remove('node-hidden');
                    if (downDist) downDist.classList.remove('node-hidden');
                    
                    infoBox.innerHTML = `<strong>戰術說明：警察已抵達。</strong> 警車協助中游警戒，救護車退至下游確保後送流暢。`;
                }
            });
        });

        // 處理戰術節點點擊
        tacticalNodes.forEach(node => {
            node.addEventListener('click', () => {
                playClickSound();
                const info = node.getAttribute('data-info');
                infoBox.innerHTML = `<strong>戰術說明：</strong> ${info}`;
                infoBox.style.borderColor = 'var(--accent)';
                node.style.transform = 'scale(1.2)';
                setTimeout(() => node.style.transform = '', 300);
            });
        });
    }

    // --- 測驗引擎 ---
    function initQuiz() {
        const startBtn = document.getElementById('start-quiz-btn');
        startBtn.addEventListener('click', () => {
            userName = document.getElementById('user-name').value || "優秀學員";
            startQuiz();
        });
    }

    function startQuiz() {
        // 隨機抽選 5 題
        quizQuestions = [...questionBank].sort(() => Math.random() - 0.5).slice(0, 5);
        currentQuestionIndex = 0;
        score = 0;
        
        document.getElementById('quiz-intro').style.display = 'none';
        document.getElementById('quiz-engine').style.display = 'block';
        document.getElementById('quiz-result').style.display = 'none';
        
        renderQuestion();
    }

    function renderQuestion() {
        const q = quizQuestions[currentQuestionIndex];
        const container = document.getElementById('question-container');
        
        // 進度更新
        document.getElementById('quiz-step-text').innerText = `第 ${currentQuestionIndex + 1} / 5 題`;
        document.getElementById('quiz-progress-inner').style.width = ((currentQuestionIndex) / 5 * 100) + "%";

        container.innerHTML = `
            <div class="question-card fade-in">
                <span class="badge" style="margin-bottom:10px;">${q.category}</span>
                <h3>${q.question}</h3>
                <div class="options-list">
                    ${q.options.map((opt, i) => `
                        <button class="option-btn" data-index="${i}">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `;

        const btns = container.querySelectorAll('.option-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => handleAnswer(parseInt(btn.getAttribute('data-index')), q.answer, btns));
        });
    }

    function handleAnswer(selected, correct, btns) {
        // 禁用所有按鈕
        btns.forEach(b => b.disabled = true);

        if (selected === correct) {
            btns[selected].classList.add('correct');
            score += 20;
            // 短暫煙火
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } else {
            btns[selected].classList.add('wrong');
            btns[correct].classList.add('correct');
        }

        // 延遲進入下一題
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < 5) {
                renderQuestion();
            } else {
                showResult();
            }
        }, 1500);
    }

    function showResult() {
        document.getElementById('quiz-engine').style.display = 'none';
        const resultSection = document.getElementById('quiz-result');
        resultSection.style.display = 'block';
        resultSection.className = 'fade-in';

        let rank = "防禦駕駛專家";
        let color = "var(--success)";
        if (score < 80) { rank = "安全官學員"; color = "var(--accent)"; }
        if (score < 40) { rank = "需再加強"; color = "var(--error)"; }

        resultSection.innerHTML = `
            <div class="result-card text-center" style="padding: 2rem; background: var(--card-bg); border-radius: 20px;">
                <h2 style="font-size: 2.5rem; margin-bottom:1rem;">測驗結束！</h2>
                <div style="font-size: 5rem; font-weight: 700; color: ${color}; margin: 1rem 0;">${score} <small style="font-size: 1.5rem; color: #fff;">分</small></div>
                <p style="font-size: 1.2rem; margin-bottom: 2rem;">榮譽稱號：<strong>${rank}</strong></p>
                
                ${score >= 80 ? `
                    <div class="cert-preview-wrapper" style="margin-bottom: 2rem;">
                        <p class="text-accent"><i class="fas fa-certificate"></i> 恭喜！您已獲得領取證書的資格</p>
                        <div id="final-cert-container"></div>
                        <button id="download-cert" class="btn-primary" style="margin-top:1rem;">
                            <i class="fas fa-download"></i> 下載榮譽證書
                        </button>
                    </div>
                ` : `
                    <p class="text-secondary" style="margin-bottom: 2rem;">差一點就能拿到證書了！再練習一次吧。</p>
                `}
                
                <button id="restart-quiz" class="btn-primary" style="background: var(--navy-blue);">重新挑戰</button>
            </div>
        `;

        if (score >= 80) {
            renderCertificate(rank);
            // 大量煙火
            const duration = 3 * 1000;
            const end = Date.now() + duration;
            (function frame() {
                confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
                confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }

        document.getElementById('restart-quiz').addEventListener('click', startQuiz);
    }

    function renderCertificate(rank) {
        const certTemplate = document.getElementById('certificate-template').innerHTML;
        const container = document.getElementById('final-cert-container');
        container.innerHTML = certTemplate;
        
        container.querySelector('#cert-name').innerText = userName;
        container.querySelector('#cert-level').innerText = rank;
        container.querySelector('#cert-date').innerText = new Date().toISOString().split('T')[0];
    }

    // --- 音效邏輯 ---
    function initAudio() {
        const audio = document.getElementById('bg-audio');
        const icon = document.getElementById('music-icon');
        const btn = document.getElementById('toggle-music');

        btn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                icon.className = 'fas fa-volume-up';
                btn.classList.add('playing');
            } else {
                audio.pause();
                icon.className = 'fas fa-volume-mute';
                btn.classList.remove('playing');
            }
        });
    }

    // --- 燈箱預覽邏輯 ---
    function initLightbox() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const closeBtn = document.querySelector('.lightbox-close');

        // 使用事件委派監聽點擊
        document.addEventListener('click', (e) => {
            const tacticalItem = e.target.closest('.tactical-item');
            const habitBack = e.target.closest('.flip-card-back');

            if (tacticalItem || habitBack) {
                let src = '';
                if (tacticalItem) {
                    const img = tacticalItem.querySelector('img');
                    if (img) src = img.src;
                } else if (habitBack) {
                    // 從背景圖片樣式獲取路徑
                    const bg = window.getComputedStyle(habitBack).backgroundImage;
                    src = bg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
                }

                if (src) {
                    playClickSound();
                    lightboxImg.src = src;
                    lightbox.style.display = 'flex';
                    document.body.style.overflow = 'hidden'; // 防止背景捲動
                }
            }
        });

        // 關閉邏輯
        const closeLightbox = () => {
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
        };

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    }
});
