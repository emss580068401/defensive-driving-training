/**
 * 安全駕駛學習網 - 核心邏輯 (SPA) - 全面優化版
 * 修復：Sortable 重複初始化、影片進度追蹤 bug
 * 新增：影片 lazy loading、tab 動畫、返回頂部、+20 飛入動畫、
 *       鍵盤操作 swipe cards、userName XSS 防護、ARIA 管理
 */

document.addEventListener('DOMContentLoaded', function() {
    // --- HTML Escape (XSS 防護) ---
    function escapeHTML(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // --- 數據與狀態 ---
    var currentTab = 'skills';
    var quizQuestions = [];
    var currentQuestionIndex = 0;
    var score = 0;
    var userName = "";
    var categoryScores = {};
    var categoryMax = {};

    // --- 進度追蹤 ---
    var trackedProgress = JSON.parse(localStorage.getItem('safedriveProgress') || '{}');
    // 遷移舊格式：若 trackedProgress.videos 是數字，轉為 watchedVideos 陣列
    if (typeof trackedProgress.videos === 'number' && !trackedProgress.watchedVideos) {
        trackedProgress.watchedVideos = [];
    }
    if (!trackedProgress.watchedVideos) trackedProgress.watchedVideos = [];

    function saveProgress() {
        // 同步 videos 計數 (向後相容)
        trackedProgress.videos = trackedProgress.watchedVideos.length;
        localStorage.setItem('safedriveProgress', JSON.stringify(trackedProgress));
        updateProgressBar();
    }

    function updateProgressBar() {
        var vidScore = Math.min((trackedProgress.watchedVideos || []).length / 8 * 100, 100);
        var habScore = (trackedProgress.habits === 1) ? 100 : 0;
        var depScore = (trackedProgress.deploy === 1) ? 100 : 0;
        var quScore = (trackedProgress.quiz === 1) ? 100 : 0;
        // 額外檢查 V10 英雄榜有無紀錄
        var hasLabRecord = !!localStorage.getItem('v10-hero-board');
        var labScore = (trackedProgress.lab === 1 || hasLabRecord) ? 100 : 0;
        var totalScore = (vidScore + habScore + depScore + quScore + labScore) / 5;
        var bar = document.getElementById('top-progress-bar');
        if (bar) bar.style.width = totalScore + "%";
    }

    // --- 音訊系統與解鎖機制 (AudioContext Unlock for Mobile) ---
    var audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    // 手機端第一次點擊後即解鎖 AudioContext
    function unlockAudio() {
        var ctx = getAudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume().then(function() {
                console.log("AudioContext Unlocked");
                document.removeEventListener('touchstart', unlockAudio);
                document.removeEventListener('mousedown', unlockAudio);
            });
        } else {
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('mousedown', unlockAudio);
        }
    }
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('mousedown', unlockAudio, { passive: true });

    // 內嵌清脆點擊音效 (Base64)
    var clickAudio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT18=');
    function playClickSound() {
        clickAudio.currentTime = 0;
        clickAudio.play().catch(function() {});
    }

    // 懸停音效 (精緻電子音)
    function playHoverSound() {
        try {
            var ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch(e) {}
    }

    // 滑動音效 (劃過風聲)
    function playSwipeSound() {
        try {
            var ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var bufferSize = ctx.sampleRate * 0.15;
            var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;
            var filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2500, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start();
        } catch(e) {}
    }

    // 放置音效 (沉穩的重音)
    function playDropSound() {
        try {
            var ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(1.5, ctx.currentTime); // 最終確定音量為 1.5
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
    }

    // 成功音效 (明亮的快節奏三連音)
    function playSuccessSound() {
        try {
            var ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var now = ctx.currentTime;
            [523.25, 659.25, 783.99].forEach(function(freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.08);
                gain.gain.setValueAtTime(0, now + i * 0.08);
                gain.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.3);
            });
        } catch(e) {}
    }

    // 失敗音效 (沉重的低頻警告音)
    function playFailureSound() {
        try {
            var ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch(e) {}
    }

    // 全域懸停音效委派 (進入與離開邊框均觸發)
    function initHoverSounds() {
        var hoverSelector = 'button, .nav-btn, .mobile-nav-btn, .btn-toggle, .deploy-btn, ' +
                           '.btn-primary, .option-btn, .tactical-node, .swipe-card, ' +
                           '.video-card, .info-card, .dashboard-card, .tactical-item, ' +
                           '.vehicle-box, .btn-icon, .badge-item';
        
        document.body.addEventListener('mouseenter', function(e) {
            if (e.target.matches && e.target.matches(hoverSelector)) {
                playHoverSound();
            }
        }, true);
        
        document.body.addEventListener('mouseleave', function(e) {
            if (e.target.matches && e.target.matches(hoverSelector)) {
                playHoverSound();
            }
        }, true);
    }

    var HEADING_20 = [
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

    var HEADING_10 = [
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

    var VIDEOS = [
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

    // --- 初始化執行 ---
    // 等待 deferred scripts 就緒後再初始化需要它們的模組
    function waitForDeps(callback) {
        var called = false;
        var check = setInterval(function() {
            if (typeof AOS !== 'undefined' && typeof Hammer !== 'undefined' &&
                typeof Sortable !== 'undefined' && typeof Chart !== 'undefined') {
                clearInterval(check);
                if (!called) { called = true; callback(); }
            }
        }, 50);
        // 安全超時：3 秒後不管有沒有載完都繼續
        setTimeout(function() {
            clearInterval(check);
            if (!called) { called = true; callback(); }
        }, 3000);
    }

    // 立即可執行的初始化
    initNavigation();
    updateProgressBar();
    initAudio();
    initLightbox();
    initBackToTop();
    initKeyboardNav();
    initHoverSounds();
    initEmeiCard(); // 🟢 初始化峨眉分隊懸浮卡片

    // 等待 deferred 依賴
    waitForDeps(function() {
        if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });
        initVideos();
        renderHabits('basic');
        initDeploymentTrack();
        initChallengeTrack();
        initQuiz();

        // 隱藏 Splash Screen
        var splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(function() {
                splash.classList.add('hidden');
                setTimeout(function() {
                    if (splash.parentNode) splash.parentNode.removeChild(splash);
                }, 600);
            }, 400);
        }
    });

    // 🟢 峨眉分隊懸浮卡片放大功能
    function initEmeiCard() {
        const thumb = document.getElementById('emei-portal-thumb');
        const zoom = document.getElementById('emei-portal-zoom');
        if (thumb && zoom) {
            thumb.addEventListener('click', function() {
                zoom.classList.add('active');
            });
        }
    }

    // --- 導覽邏輯 ---
    function initNavigation() {
        var navBtns = document.querySelectorAll('.nav-btn, .mobile-nav-btn');
        navBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var tabId = btn.getAttribute('data-tab');
                playClickSound();
                switchTab(tabId);
            });
        });
    }

    // --- Dashboard ---
    var dashboardChartInstance = null;
    function renderDashboard() {
        var vidScore = Math.min((trackedProgress.watchedVideos || []).length / 8 * 100, 100);
        var habScore = (trackedProgress.habits === 1) ? 100 : 0;
        var depScore = (trackedProgress.deploy === 1) ? 100 : 0;
        var quScore = (trackedProgress.quiz === 1) ? 100 : 0;
        // 額外檢查 V10 英雄榜有無紀錄
        var hasLabRecord = !!localStorage.getItem('v10-hero-board');
        var labScore = (trackedProgress.lab === 1 || hasLabRecord) ? 100 : 0;
        var totalScore = (vidScore + habScore + depScore + quScore + labScore) / 5;

        // 使用 earned class 取代 inline filter
        if (vidScore === 100) document.getElementById('badge-video').classList.add('earned');
        if (habScore === 100) document.getElementById('badge-habit').classList.add('earned');
        if (depScore === 100) document.getElementById('badge-deploy').classList.add('earned');
        if (quScore === 100) document.getElementById('badge-quiz').classList.add('earned');
        if (labScore === 100) document.getElementById('badge-lab').classList.add('earned');

        var chartCanvas = document.getElementById('dashboardChart');
        if (!chartCanvas || typeof Chart === 'undefined') return;
        var ctx = chartCanvas.getContext('2d');
        if (dashboardChartInstance) dashboardChartInstance.destroy();

        dashboardChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['已完成', '未完成'],
                datasets: [{
                    data: [totalScore, 100 - totalScore],
                    backgroundColor: ['#ef4444', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '80%', plugins: { legend: { display: false } } },
            plugins: [{
                id: 'textCenter',
                beforeDraw: function(chart) {
                    var width = chart.width, height = chart.height, ctx2 = chart.ctx;
                    ctx2.restore();
                    var fontSize = (height / 100).toFixed(2);
                    ctx2.font = "bold " + fontSize + "em sans-serif";
                    ctx2.textBaseline = "middle";
                    ctx2.fillStyle = "#fff";
                    var text = Math.round(totalScore) + "%";
                    var textX = Math.round((width - ctx2.measureText(text).width) / 2);
                    var textY = height / 2;
                    ctx2.fillText(text, textX, textY);
                    ctx2.save();
                }
            }]
        });
    }

    function switchTab(tabId) {
        // 🟢 偵測是否離開煞停實驗室
        if (currentTab === 'lab' && tabId !== 'lab') {
            const labFrame = document.getElementById('lab-frame');
            if (labFrame && labFrame.contentWindow) {
                labFrame.contentWindow.postMessage({ type: 'STOP_LAB_AUDIO' }, '*');
            }
        }

        // Exit animation on current active tab
        var currentActive = document.querySelector('.tab-content.active');
        if (currentActive && currentActive.id !== 'tab-' + tabId) {
            currentActive.classList.add('exit');
            currentActive.classList.remove('active');
            setTimeout(function() {
                currentActive.classList.remove('exit');
            }, 250);
        }

        // Update nav ARIA
        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(function(el) {
            el.classList.remove('active');
            el.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('[data-tab="' + tabId + '"]').forEach(function(el) {
            el.classList.add('active');
            el.setAttribute('aria-selected', 'true');
        });

        // Activate new tab with slight delay for exit animation
        setTimeout(function() {
            var tabEl = document.getElementById('tab-' + tabId);
            if (tabEl) tabEl.classList.add('active');

            // 🟢 切換回實驗室時，發送恢復指令
            if (tabId === 'lab') {
                const labFrame = document.getElementById('lab-frame');
                if (labFrame && labFrame.contentWindow) {
                    labFrame.contentWindow.postMessage({ type: 'RESUME_LAB_AUDIO' }, '*');
                }
            }
        }, currentActive && currentActive.id !== 'tab-' + tabId ? 260 : 0);

        currentTab = tabId;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (tabId === 'lab' && !trackedProgress.lab) {
            trackedProgress.lab = 1;
            saveProgress();
        }

        if (tabId === 'dashboard') {
            setTimeout(renderDashboard, 300);
        }
    }

    var _videosInitialized = false;
    function initVideos() {
        if (_videosInitialized) return;
        _videosInitialized = true;
        var gallery = document.querySelector('.video-gallery');
        if (!gallery) { _videosInitialized = false; return; }

        // IntersectionObserver for lazy video loading
        var videoObserver = null;
        if ('IntersectionObserver' in window) {
            videoObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var skeleton = entry.target;
                        var card = skeleton.closest('.video-card');
                        if (!card) return;
                        var src = card.getAttribute('data-video-src');
                        if (!src) return;

                        // Replace skeleton with actual video
                        var videoThumb = document.createElement('div');
                        videoThumb.className = 'video-thumb';
                        videoThumb.innerHTML =
                            '<video controls preload="metadata">' +
                                '<source src="' + src + '" type="video/mp4">' +
                            '</video>';
                        skeleton.replaceWith(videoThumb);

                        // Track play progress (≥50% = counted)
                        var video = videoThumb.querySelector('video');
                        var videoIndex = parseInt(card.getAttribute('data-video-index'));
                        if (video && !isNaN(videoIndex)) {
                            trackVideoPlay(video, videoIndex, card);
                        }

                        videoObserver.unobserve(skeleton); // stop observing replaced element
                    }
                });
            }, { rootMargin: '200px' });
        }

        VIDEOS.forEach(function(v, i) {
            var card = document.createElement('div');
            card.className = 'video-card';
            card.setAttribute('data-aos', 'fade-up');
            card.setAttribute('data-video-src', v.file);
            card.setAttribute('data-video-index', String(i));

            // Mark as watched if already in progress
            if (trackedProgress.watchedVideos.indexOf(i) > -1) {
                card.classList.add('watched');
            }

            // Start with skeleton placeholder
            card.innerHTML =
                '<div class="video-skeleton"><i class="fas fa-play-circle"></i></div>' +
                '<div class="video-card-info">' +
                    '<h4>' + v.title + '</h4>' +
                    '<div class="operation-steps">' +
                        '<h5><i class="fas fa-list-ol"></i> 操作步驟要領：</h5>' +
                        '<ul>' + v.steps.map(function(step) { return '<li>' + step + '</li>'; }).join('') + '</ul>' +
                    '</div>' +
                '</div>';
            gallery.appendChild(card);

            // Observe the skeleton for lazy loading
            var skeleton = card.querySelector('.video-skeleton');
            if (videoObserver && skeleton) {
                videoObserver.observe(skeleton);
            } else if (skeleton) {
                // Fallback: load immediately if no observer
                var videoThumb = document.createElement('div');
                videoThumb.className = 'video-thumb';
                videoThumb.innerHTML =
                    '<video controls preload="metadata">' +
                        '<source src="' + v.file + '" type="video/mp4">' +
                    '</video>';
                skeleton.replaceWith(videoThumb);
                var vid = videoThumb.querySelector('video');
                if (vid) trackVideoPlay(vid, i, card);
            }
        });
    }

    function trackVideoPlay(video, index, card) {
        var counted = false;
        video.addEventListener('timeupdate', function() {
            if (counted) return;
            if (video.duration && video.currentTime / video.duration >= 0.5) {
                counted = true;
                if (trackedProgress.watchedVideos.indexOf(index) === -1) {
                    trackedProgress.watchedVideos.push(index);
                    saveProgress();
                    card.classList.add('watched');
                }
            }
        });
    }

    // --- 滑動式單字卡 (Hammer.js + 鍵盤) ---
    var habitDeck = [];
    function renderHabits(type) {
        var list = document.getElementById('habits-list');
        if (!list) return;
        list.innerHTML = '';
        list.className = 'swipe-deck-container';
        list.style.cssText = '';

        var items = type === 'basic' ? HEADING_20.slice() : HEADING_10.slice();
        items.sort(function() { return Math.random() - 0.5; });
        habitDeck = items.slice();

        function createCard(item, i) {
            var card = document.createElement('div');
            card.className = 'swipe-card fade-in';
            card.setAttribute('tabindex', '0'); // 鍵盤可聚焦
            card.setAttribute('role', 'group');
            card.setAttribute('aria-label', item.title + ' - 右滑熟記，左滑複習');
            card.style.zIndex = String(items.length - i);
            var scale = 1 - (i * 0.05);
            var translateY = i * 15;
            if (i > 3) card.style.opacity = '0';
            card.style.transform = 'translateY(' + translateY + 'px) scale(' + scale + ')';
            card.innerHTML =
                '<div class="swipe-card-content">' +
                    '<div class="habits-counter" style="color:#94a3b8; margin-bottom:10px;">(剩餘 ' + habitDeck.length + ' 張)</div>' +
                    '<img src="' + item.img + '" alt="' + escapeHTML(item.title) + '" style="width:90%; max-height: 80%; object-fit:contain; border-radius:15px; pointer-events:none; box-shadow: 0 4px 15px rgba(0,0,0,0.3);" loading="lazy">' +
                    '<h3>' + escapeHTML(item.title) + '</h3>' +
                    '<p style="color:#94a3b8; margin-top:auto;"><i class="fas fa-search-plus"></i> 點擊放大 | <i class="fas fa-arrows-alt-h"></i> 滑動=熟記/複習 | ← → 鍵</p>' +
                '</div>';

            // Hammer.js swipe
            if (typeof Hammer !== 'undefined') {
                var hammer = new Hammer(card);
                hammer.on('pan', function(e) {
                    card.classList.add('is-moving');
                    card.style.transform = 'translateX(' + e.deltaX + 'px) rotate(' + (e.deltaX / 20) + 'deg)';
                });
                hammer.on('panend', function(e) {
                    card.classList.remove('is-moving');
                    if (Math.abs(e.deltaX) > 100) {
                        dismissCard(card, item, e.deltaX > 0 ? 1 : -1, list);
                    } else {
                        snapBack(card, list);
                    }
                });

                // 新增：點擊卡片彈出燈箱 (嚴格限制位移，只有近乎置中且未滑動時觸發)
                hammer.on('tap', function(e) {
                    // e.distance 是總位移像素
                    if (e.distance < 10 && !card.classList.contains('is-animating')) {
                        openLightboxWithItem(item);
                    }
                });
            }
            return card;
        }

        function dismissCard(card, item, direction, list) {
            card.classList.add('is-animating');
            card.style.transform = 'translateX(' + (direction * 600) + 'px) rotate(' + (direction * 30) + 'deg)';
            card.style.opacity = '0';
            playSwipeSound();
            setTimeout(function() {
                if (card.parentNode) card.parentNode.removeChild(card);
                if (direction > 0) {
                    var idx = habitDeck.indexOf(item);
                    if (idx > -1) habitDeck.splice(idx, 1);
                } else {
                    var idx2 = habitDeck.indexOf(item);
                    if (idx2 > -1) {
                        habitDeck.splice(idx2, 1);
                        habitDeck.push(item);
                    }
                    var newCard = createCard(item, habitDeck.length - 1);
                    list.insertBefore(newCard, list.firstChild);
                }
                updateDeckStyles();
            }, 300);
        }

        function snapBack(card, list) {
            card.classList.add('is-animating');
            updateDeckStyles();
            setTimeout(function() {
                card.classList.remove('is-animating');
            }, 350);
        }

        function updateDeckStyles() {
            if (habitDeck.length === 0) {
                if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                list.innerHTML =
                    '<div class="fade-in" style="text-align:center; padding: 2rem; background:rgba(30,41,59,0.8); border:2px dashed var(--success); border-radius: 12px; height:100%; display:flex; flex-direction:column; justify-content:center;">' +
                        '<i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom:1rem;"></i>' +
                        '<h3 style="color:var(--success);">恭喜！全部熟記！</h3>' +
                        '<p style="color:white; margin-top:1rem;">您已清空這個題組的所有防禦單字卡。</p>' +
                    '</div>';
                if (!trackedProgress.habits) {
                    trackedProgress.habits = 1;
                    saveProgress();
                }
                return;
            }
            var cards = list.querySelectorAll('.swipe-card');
            cards.forEach(function(card, index) {
                card.classList.add('is-animating');
                var visualIndex = cards.length - 1 - index;
                var s = 1 - (visualIndex * 0.05);
                var ty = visualIndex * 15;
                card.style.zIndex = String(cards.length - visualIndex);
                card.style.transform = 'translateY(' + ty + 'px) scale(' + s + ')';
                if (visualIndex > 3) card.style.opacity = '0';
                else card.style.opacity = '1';

                // 新增：動畫結束後移除類別，解鎖點擊放大功能
                setTimeout(function() {
                    card.classList.remove('is-animating');
                }, 350);

                var counter = card.querySelector('.habits-counter');
                if (counter) counter.innerText = '(剩餘 ' + habitDeck.length + ' 張)';
            });
        }

        for (var i = items.length - 1; i >= 0; i--) {
            list.appendChild(createCard(items[i], i));
        }

        // Store references for keyboard navigation
        list._createCard = createCard;
        list._dismissCard = dismissCard;
        list._habitDeck = function() { return habitDeck; };
    }

    // --- 鍵盤導航 (← → for swipe cards) ---
    function initKeyboardNav() {
        document.addEventListener('keydown', function(e) {
            if (currentTab !== 'habits') return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

            var list = document.getElementById('habits-list');
            if (!list || !list._dismissCard) return;

            var topCard = list.querySelector('.swipe-card:last-child');
            if (!topCard) return;

            // Find the item corresponding to top card
            var deck = list._habitDeck();
            if (!deck || deck.length === 0) return;
            var item = deck[0];

            var direction = e.key === 'ArrowRight' ? 1 : -1;
            list._dismissCard(topCard, item, direction, list);
            e.preventDefault();
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
        var deployBtns = document.querySelectorAll('.deploy-btn:not(.status-btn):not(.challenge-btn)');
        var statusBtns = document.querySelectorAll('.status-btn');
        var distVals = document.querySelectorAll('.dist-val');
        var tacticalNodes = document.querySelectorAll('#deployment-track .tactical-node');
        var infoBox = document.getElementById('deployment-info-box');

        deployBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                playClickSound();
                deployBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');

                var newDist = btn.getAttribute('data-dist');
                distVals.forEach(function(val) {
                    val.innerText = newDist;
                    val.style.animation = 'pulse 0.5s';
                    setTimeout(function() { val.style.animation = ''; }, 500);
                });

                infoBox.innerHTML = "<i class='fas fa-info-circle'></i> 已切換至 <strong>" + (newDist === '15' ? '快速道路' : '高速公路') + "</strong> 標準，建議安全間距為 " + newDist + "m。";
            });
        });

        statusBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                playClickSound();
                statusBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');

                var status = btn.getAttribute('data-status');
                var nodeMiddle = document.getElementById('node-middle');
                var nodeDownstream = document.getElementById('node-downstream');
                var vehicleMiddle = document.getElementById('vehicle-middle');
                var labelMiddle = document.getElementById('label-middle');
                var downDist = nodeDownstream ? nodeDownstream.previousElementSibling : null;

                if (status === 'pending') {
                    vehicleMiddle.innerText = '救護車';
                    labelMiddle.innerText = '救護車';
                    vehicleMiddle.style.background = '#e74c3c';
                    nodeMiddle.setAttribute('data-info', '救護車 (暫代防禦)：警車尚未抵達時，應位於救災車與事故車之間，受救災車保護。');
                    nodeDownstream.classList.add('node-hidden');
                    if (downDist) downDist.classList.add('node-hidden');
                    infoBox.innerHTML = "<strong>戰術說明：警察尚未抵達。</strong> 您正處於「救災車優先抵達」模式，救護車應在中游待命受保護。";
                } else {
                    vehicleMiddle.innerText = '警車';
                    labelMiddle.innerText = '警車';
                    vehicleMiddle.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
                    nodeMiddle.setAttribute('data-info', '警車：協同防禦，停放於救災車與事故車之間。');
                    nodeDownstream.classList.remove('node-hidden');
                    if (downDist) downDist.classList.remove('node-hidden');
                    infoBox.innerHTML = "<strong>戰術說明：警察已抵達。</strong> 警車協助中游警戒，救護車退至下游確保後送流暢。";
                }
            });
        });

        tacticalNodes.forEach(function(node) {
            node.addEventListener('click', function() {
                playClickSound();
                var info = node.getAttribute('data-info');
                if (infoBox) {
                    infoBox.innerHTML = "<strong>戰術說明：</strong> " + info;
                    infoBox.style.borderColor = 'var(--accent)';
                }
                node.style.transform = 'scale(1.2)';
                setTimeout(function() { node.style.transform = ''; }, 300);
            });
        });
    }

    // --- 實戰互動挑戰 (修復 Sortable 重複初始化) ---
    function initChallengeTrack() {
        var pool = document.getElementById('vehicle-pool');
        var track = document.getElementById('challenge-track');
        if (!pool || !track) return;
        if (typeof Sortable === 'undefined') return;

        var challengeBtns = document.querySelectorAll('.challenge-btn');
        var cInfo = document.getElementById('challenge-info-box');

        var poolSortable = null;
        var trackSortable = null;
        var currentMode = 'arrived';

        function getVehicleHTML(type) {
            if (type === 'cone') return '<div class="tactical-node cone-node draggable" data-type="cone"><i class="fas fa-triangle-exclamation" style="font-size:2rem; color:#f97316;"></i><span style="display:block;margin-top:5px;">三角錐</span></div>';
            if (type === 'engine') return '<div class="tactical-node engine-node fent-off draggable" data-type="engine"><div class="vehicle-box" style="background:#c0392b">救災車</div><span>上游緩衝</span></div>';
            if (type === 'police') return '<div class="tactical-node draggable" data-type="police"><div class="vehicle-box" style="background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)">警車</div><span>警車</span></div>';
            if (type === 'incident') return '<div class="tactical-node incident-node draggable" data-type="incident"><div class="vehicle-box rotate-12" style="background:#475569">事故車</div><span>作業區</span></div>';
            if (type === 'ambulance') return '<div class="tactical-node draggable" data-type="ambulance"><div class="vehicle-box" style="background:#e74c3c">救護車</div><span>下游待命</span></div>';
            return '';
        }

        function renderLevel(mode) {
            pool.innerHTML = '';
            track.innerHTML = '';
            if (cInfo) {
                cInfo.innerHTML = "系統就緒。請從上方調度場將車輛全部拖曳到下方軌道上，若排列正確即自動過關。";
                cInfo.style.borderColor = 'var(--accent)';
            }

            var types = [];
            if (mode === 'arrived') {
                types = ['engine', 'ambulance', 'incident', 'police', 'cone'];
            } else {
                types = ['engine', 'incident', 'cone', 'ambulance'];
            }
            types.sort(function() { return Math.random() - 0.5; });

            types.forEach(function(type) {
                pool.insertAdjacentHTML('beforeend', getVehicleHTML(type));
            });

            // 銷毀舊的 Sortable 實例再建新的
            if (poolSortable) poolSortable.destroy();
            if (trackSortable) trackSortable.destroy();

            poolSortable = new Sortable(pool, {
                group: 'challenge',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onChange: function() { playHoverSound(); }, // 拖曳越過其他元素時觸發音效
                onEnd: function() { playDropSound(); checkWin(); }
            });
            trackSortable = new Sortable(track, {
                group: 'challenge',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onChange: function() { playHoverSound(); }, // 拖曳越過其他元素時觸發音效
                onEnd: function() { playDropSound(); checkWin(); }
            });
        }

        function checkWin() {
            if (pool.children.length > 0) return;

            var currentOrder = Array.from(track.querySelectorAll('.tactical-node span')).map(function(el) { return el.innerText; });
            var correctPattern = [];
            if (currentMode === 'arrived') {
                correctPattern = ["三角錐", "上游緩衝", "警車", "作業區", "下游待命"];
            } else {
                correctPattern = ["三角錐", "上游緩衝", "下游待命", "作業區"];
            }

            var isCorrect = (currentOrder.length === correctPattern.length) && currentOrder.every(function(val, index) { return val === correctPattern[index]; });

            if (isCorrect) {
                playSuccessSound();
                if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                cInfo.innerHTML = '<strong style="color:var(--success)">🎉 挑戰成功！恭喜您完成了正確陣型！</strong>';
                cInfo.style.borderColor = 'var(--success)';
                if (!trackedProgress.deploy) { trackedProgress.deploy = 1; saveProgress(); }
            } else {
                playFailureSound();
                cInfo.innerHTML = '<strong style="color:var(--warning)">⚠️ 順序有誤！請調整軌道上車輛的前後順序（例如：最前頭應擺放三角錐）！</strong>';
                cInfo.style.borderColor = 'var(--warning)';
            }
        }

        challengeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                playClickSound();
                challengeBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentMode = btn.getAttribute('data-challenge');
                renderLevel(currentMode);
            });
        });

        // 初始化 — 只執行一次 (修復原本的重複初始化 bug)
        renderLevel('arrived');
    }

    // --- 測驗引擎 ---
    function initQuiz() {
        var startBtn = document.getElementById('start-quiz-btn');
        if (!startBtn) return;
        startBtn.addEventListener('click', function() {
            userName = document.getElementById('user-name').value || "優秀學員";
            startQuiz();
        });
    }

    function startQuiz() {
        quizQuestions = questionBank.slice().sort(function() { return Math.random() - 0.5; }).slice(0, 5);
        currentQuestionIndex = 0;
        score = 0;
        categoryScores = {};
        categoryMax = {};

        document.getElementById('quiz-intro').style.display = 'none';
        document.getElementById('quiz-engine').style.display = 'block';
        document.getElementById('quiz-result').style.display = 'none';

        renderQuestion();
    }

    function renderQuestion() {
        var q = quizQuestions[currentQuestionIndex];
        var container = document.getElementById('question-container');

        document.getElementById('quiz-step-text').innerText = '第 ' + (currentQuestionIndex + 1) + ' / 5 題';
        var progressPct = (currentQuestionIndex) / 5 * 100;
        var progressInner = document.getElementById('quiz-progress-inner');
        progressInner.style.width = progressPct + "%";
        progressInner.setAttribute('aria-valuenow', String(Math.round(progressPct)));

        container.innerHTML =
            '<div class="question-card fade-in">' +
                '<span class="badge" style="margin-bottom:10px;">' + escapeHTML(q.category) + '</span>' +
                '<h3>' + escapeHTML(q.question) + '</h3>' +
                '<div class="options-list" role="radiogroup">' +
                    q.options.map(function(opt, i) {
                        return '<button class="option-btn" data-index="' + i + '" role="radio" aria-checked="false">' + escapeHTML(opt) + '</button>';
                    }).join('') +
                '</div>' +
            '</div>';

        var btns = container.querySelectorAll('.option-btn');
        btns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                handleAnswer(parseInt(btn.getAttribute('data-index')), q.answer, btns);
            });
        });
    }

    // +20 飛入動畫
    function showScoreFly() {
        var fly = document.createElement('div');
        fly.className = 'score-fly';
        fly.innerText = '+20';
        document.body.appendChild(fly);
        setTimeout(function() {
            if (fly.parentNode) fly.parentNode.removeChild(fly);
        }, 1100);
    }

    function handleAnswer(selected, correct, btns) {
        btns.forEach(function(b) { b.disabled = true; });

        var currentQ = quizQuestions[currentQuestionIndex];
        var cat = currentQ.category || "未分類";
        categoryMax[cat] = (categoryMax[cat] || 0) + 1;

        if (selected === correct) {
            playSuccessSound();
            btns[selected].classList.add('correct');
            btns[selected].setAttribute('aria-checked', 'true');
            score += 20;
            categoryScores[cat] = (categoryScores[cat] || 0) + 1;
            showScoreFly();
            if (typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } else {
            playFailureSound();
            btns[selected].classList.add('wrong');
            btns[correct].classList.add('correct');
        }

        var container = document.getElementById('question-container');
        var expBox = document.createElement('div');
        expBox.className = 'explanation-box fade-in';
        expBox.innerHTML =
            '<strong><i class="fas fa-lightbulb" style="color:#f59e0b;"></i> 解析：</strong><br>' +
            escapeHTML(currentQ.explanation || '此為防禦駕駛核心原則，請確實遵守。') +
            '<button id="btn-next-question" class="deploy-btn active" style="width:100%; margin-top:15px; justify-content:center; border-radius:8px;">前往下一題 <i class="fas fa-arrow-right"></i></button>';
        container.appendChild(expBox);

        document.getElementById('btn-next-question').addEventListener('click', function() {
            playClickSound();
            currentQuestionIndex++;
            if (currentQuestionIndex < 5) {
                renderQuestion();
            } else {
                showResult();
            }
        });
    }

    function showResult() {
        document.getElementById('quiz-engine').style.display = 'none';
        var resultSection = document.getElementById('quiz-result');
        resultSection.style.display = 'block';
        resultSection.className = 'fade-in';

        var rank = "防禦駕駛專家";
        var color = "var(--success)";
        if (score < 80) { rank = "安全官學員"; color = "var(--accent)"; }
        if (score < 40) { rank = "需再加強"; color = "var(--error)"; }

        var safeUserName = escapeHTML(userName);

        var radarHTML = '';
        if (score >= 80) {
            radarHTML =
                '<div class="cert-preview-wrapper" style="margin-bottom: 2rem;">' +
                    '<div style="margin: 0 auto 1.5rem auto; width: 100%; max-width: 400px; max-height: 400px;">' +
                        '<canvas id="radarChart"></canvas>' +
                    '</div>' +
                    '<p class="text-accent"><i class="fas fa-certificate"></i> 恭喜！您已獲得領取證書的資格</p>' +
                    '<div id="final-cert-container"></div>' +
                    '<button id="download-cert" class="btn-primary" style="margin-top:1rem;">' +
                        '<i class="fas fa-download"></i> 下載榮譽證書' +
                    '</button>' +
                '</div>';
        } else {
            radarHTML = '<p class="text-secondary" style="margin-bottom: 2rem;">差一點就能拿到證書了！再練習一次吧。</p>';
        }

        resultSection.innerHTML =
            '<div class="result-card text-center" style="padding: 2rem; background: var(--card-bg); border-radius: 20px;">' +
                '<h2 style="font-size: 2.5rem; margin-bottom:1rem;">測驗結束！</h2>' +
                '<div style="font-size: 5rem; font-weight: 700; color: ' + color + '; margin: 1rem 0;">' + score + ' <small style="font-size: 1.5rem; color: #fff;">分</small></div>' +
                '<p style="font-size: 1.2rem; margin-bottom: 2rem;">榮譽稱號：<strong>' + rank + '</strong></p>' +
                radarHTML +
                '<button id="restart-quiz" class="btn-primary" style="background: var(--navy-blue);">重新挑戰</button>' +
            '</div>';

        if (score >= 80) {
            renderCertificate(rank);
            var radarCanvas = document.getElementById('radarChart');
            if (radarCanvas && typeof Chart !== 'undefined') {
                var labels = Object.keys(categoryMax);
                var data = labels.map(function(l) { return Math.round(((categoryScores[l] || 0) / categoryMax[l]) * 100); });
                new Chart(radarCanvas.getContext('2d'), {
                    type: 'radar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '正確率 (%)',
                            data: data,
                            backgroundColor: 'rgba(249, 115, 22, 0.3)',
                            borderColor: '#f97316',
                            borderWidth: 2,
                            pointBackgroundColor: '#f97316'
                        }]
                    },
                    options: {
                        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#f8fafc', font: { size: 12 } } } },
                        plugins: { legend: { labels: { color: '#f8fafc' } } }
                    }
                });
            }
            if (typeof confetti !== 'undefined') {
                var duration = 3 * 1000;
                var end = Date.now() + duration;
                (function frame() {
                    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
                    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            }
            if (!trackedProgress.quiz) { trackedProgress.quiz = 1; saveProgress(); }
        }

        document.getElementById('restart-quiz').addEventListener('click', startQuiz);
    }

    function renderCertificate(rank) {
        var certTemplate = document.getElementById('certificate-template');
        if (!certTemplate) return;
        var container = document.getElementById('final-cert-container');
        if (!container) return;
        container.innerHTML = certTemplate.innerHTML;

        var certName = container.querySelector('#cert-name');
        if (certName) certName.innerText = userName; // innerText is XSS-safe
        var certLevel = container.querySelector('#cert-level');
        if (certLevel) certLevel.innerText = rank;
        var certDate = container.querySelector('#cert-date');
        if (certDate) certDate.innerText = new Date().toISOString().split('T')[0];

        setTimeout(function() {
            var certNodes = container.querySelectorAll('.certificate-canvas');
            if (certNodes.length > 0) {
                var latestCert = certNodes[certNodes.length - 1];
                latestCert.style.display = 'block';
                latestCert.style.margin = '0 auto';
                latestCert.classList.add('fade-in');
                if (typeof confetti !== 'undefined') {
                    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                }
            }
        }, 500);
    }

    // --- 音效邏輯 ---
    function initAudio() {
        var audio = document.getElementById('bg-audio');
        if (audio) audio.volume = 0.4; // 降低背景音樂音量

        var icon = document.getElementById('music-icon');
        var btn = document.getElementById('toggle-music');
        if (!btn) return;

        btn.addEventListener('click', function() {
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

    // --- 燈箱預覽邏輯 (含 Focus 管理) ---
    function initLightbox() {
        var lightbox = document.getElementById('lightbox');
        var lightboxImg = document.getElementById('lightbox-img');
        var closeBtn = document.querySelector('.lightbox-close');
        if (!lightbox || !lightboxImg || !closeBtn) return;

        var triggerElement = null;

        // 全域點擊委派
        document.addEventListener('click', function(e) {
            var tacticalItem = e.target.closest('.tactical-item');
            var habitBack = e.target.closest('.flip-card-back');
            var swipeCard = e.target.closest('.swipe-card'); // 20+10 卡片

            // 只有當卡片未處於動畫中且未大量位移時才允許點擊觸發
            if (tacticalItem || habitBack || (swipeCard && !swipeCard.classList.contains('is-animating'))) {
                var src = '';
                if (tacticalItem) {
                    var img = tacticalItem.querySelector('img');
                    if (img) src = img.src;
                } else if (habitBack) {
                    var bg = window.getComputedStyle(habitBack).backgroundImage;
                    src = bg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
                } else if (swipeCard) {
                    // 如果卡片已經位移超過 10px，則不視為純粹點擊
                    var transform = window.getComputedStyle(swipeCard).transform;
                    var matrix = transform.match(/^matrix\((.+)\)$/);
                    var translateX = 0;
                    if (matrix) {
                        translateX = parseFloat(matrix[1].split(', ')[4]);
                    }
                    if (Math.abs(translateX) > 10) return;

                    var imgNode = swipeCard.querySelector('img');
                    if (imgNode) src = imgNode.src;
                }

                if (src) {
                    showLightbox(src, e.target);
                }
            }
        });

        // 供內部函式調用
        window.openLightboxWithItem = function(item) {
            if (item && item.img) {
                showLightbox(item.img, null);
            }
        };

        function showLightbox(src, trigger) {
            triggerElement = trigger;
            playClickSound();
            lightboxImg.src = src;
            lightbox.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            closeBtn.focus();
        }

        var closeLightbox = function() {
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
            // 恢復焦點至觸發元素
            if (triggerElement && triggerElement.focus) {
                triggerElement.focus();
                triggerElement = null;
            }
        };

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeLightbox();
        });
    }

    // --- 返回頂部按鈕 ---
    function initBackToTop() {
        var btn = document.getElementById('back-to-top');
        if (!btn) return;

        window.addEventListener('scroll', function() {
            if (window.scrollY > 400) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });

        btn.addEventListener('click', function() {
            playClickSound();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
