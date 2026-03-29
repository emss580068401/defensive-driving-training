/**
 * 安全駕駛學習網 - 專業戰術題庫 (30 題修正版)
 * 整合：5D 威脅、TIMA 分區、北市府 15m/25m 規範
 */

const questionBank = [
    // --- 戰術基礎與 5D 威脅 ---
    {
        id: 1,
        category: '戰術基礎',
        question: "所謂「5D」戰場威脅中，'Dull' 是指什麼樣的駕駛者？",
        options: ["藥駕者", "反應遲鈍者", "分心者"],
        answer: 1,
        explanation: "5D 包含了 Drunk, Drugged, Drowsy, Distracted, 與 Dull (反應遲鈍)。"
    },
    {
        id: 2,
        category: '戰術基礎',
        question: "在車禍救援現場，防禦駕駛的核心心態是什麼？",
        options: ["相信後方車輛都會停下", "視所有來車為失控的實體", "只要有擺三角錐就安全"],
        answer: 1,
        explanation: "絕不能將生命交託於他人的煞車踏板，必須預設來車可能失控。"
    },
    {
        id: 3,
        category: '戰術基礎',
        question: "什麼是「斷腿區 (Crush Zone)」？",
        options: ["事故車的駕駛座", "停車於救護區前方區域", "救護車前方與事故車之間的擠壓區"],
        answer: 2,
        explanation: "若救援車輛被後方追撞產生「向前推擠效應」，車前方即為致命的死亡陷阱。"
    },

    // --- TIMA 空間分區 ---
    {
        id: 4,
        category: '空間分區',
        question: "TIMA 五大分區中，哪一個區域必須保持「絕對淨空，不安排人車」？",
        options: ["漸變區", "緩衝區", "作業區"],
        answer: 1,
        explanation: "緩衝區是為了應對追撞而留出的安全過濾帶，必須絕對淨空。"
    },
    {
        id: 5,
        category: '空間分區',
        question: "在 TIMA 空間管理中，「漸變區」的主要功能是什麼？",
        options: ["進行傷患急救", "利用交通錐引導並限縮車道", "車輛撤離"],
        answer: 1,
        explanation: "漸變區透過設備強制改變車流軌跡，縮小車道。"
    },

    // --- 北市府 15m/25m 專項規範 ---
    {
        id: 6,
        category: '專項規範',
        question: "根據北市府規範，在「快速道路 (≧80km/h)」執行勤務，車輛間距應至少保持？",
        options: ["5 公尺", "15 公尺 (約 3 倍車身)", "50 公尺"],
        answer: 1,
        explanation: "北市府消防局標準：快速道路部署距離至少 15 公尺。"
    },
    {
        id: 7,
        category: '專項規範',
        question: "根據北市府規範，在「高速公路」執行勤務，部署距離應延長至？",
        options: ["15 公尺", "25 公尺 (約 5 倍車身)", "100 公尺"],
        answer: 1,
        explanation: "北市府消防局標準：高速公路部署距離一律延長至 25 公尺。"
    },
    {
        id: 8,
        category: '專項規範',
        question: "在國道執行任務時，三角錐佈置距離應與車輛間距一致，為？",
        options: ["15 公尺", "25 公尺", "依照心情"],
        answer: 1,
        explanation: "高速公路標準為 25 公尺（約 35 步幅長）。"
    },

    // --- 15-45 度 Fend-off 戰術 ---
    {
        id: 9,
        category: '斜停戰術',
        question: "「Fend-off position」要求大型車輛以 15 至 45 度角斜停，其物理學價值在於？",
        options: ["節省空間", "能量偏折 (將衝擊力道轉向作業區外)", "展示反光條"],
        answer: 1,
        explanation: "斜停能利用角度將碰撞能量向外偏折，避免車體直接衝入救援核心。"
    },
    {
        id: 10,
        category: '斜停戰術',
        question: "執行 Fend-off 停放時，前輪應如何處理？",
        options: ["保持直向", "轉向路緣或無人區", "隨便擺放"],
        answer: 1,
        explanation: "即使停車，也應將前輪轉向安全區域，作為物理鎖定的最後一道工序。"
    },

    // --- 通用習慣與技巧 ---
    {
        id: 11,
        category: '通用習慣',
        question: "「左轉不切」的核心觀念是？",
        options: ["先右轉再左轉", "禁止 S 型轉彎，確保視線與路線平正", "路口中心點前直接轉入"],
        answer: 1,
        explanation: "避免內側切彎，縮小視覺死角並防止後車誤判。"
    },
    {
        id: 12,
        category: '通用習慣',
        question: "「右轉關門」是為了防止什麼？",
        options: ["行人走路慢", "機車鑽入內輪差危險區", "路邊違停"],
        answer: 1,
        explanation: "靠右行駛關閉間隙，主動消除機車進入盲區的可能。"
    },
    {
        id: 13,
        category: '通用習慣',
        question: "雨天行車的安全間距應？",
        options: ["維持 2 秒", "增加一倍 (4 秒以上)", "縮短距離以看清車牌"],
        answer: 1,
        explanation: "雨天路面濕滑使煞停距離成倍增加，應加倍車距。"
    },
    {
        id: 14,
        category: '通用習慣',
        question: "所謂「15 秒視線投射」是指？",
        options: ["盯著儀錶板 15 秒", "視線應投射至前方 15 秒後會到達的位置", "看著正前方車輛 15 秒"],
        answer: 1,
        explanation: "看的愈遠，預留危險反應的時間就愈充裕。"
    },
    {
        id: 15,
        category: '通用習慣',
        question: "日間啟動頭燈的主要防禦功能是？",
        options: ["照亮道路", "被看見 (讓其他用路人提早發現)", "增加車輛帥氣度"],
        answer: 1,
        explanation: "增加被視性是預防事故的低成本、高效手段。"
    },

    // --- 進階救援戰術 ---
    {
        id: 16,
        category: '進階救援',
        question: "在現場部署中，消防車(救災車)應停放於事故車的？",
        options: ["上游 (承受潛在風險)", "下游 (方便撤離)", "平行車道"],
        answer: 0,
        explanation: "大型消防車是第一道防線（終極盾牌），必須位於上游。"
    },
    {
        id: 17,
        category: '進階救援',
        question: "救護車在多車協同防禦中，應停放於？",
        options: ["消防車上游", "事故前方 (下游)，確保後送動線順暢", "併排停放"],
        answer: 1,
        explanation: "救護車應在下游受消防車保護，並維持通暢的撤離通路。"
    },
    {
        id: 18,
        category: '進階救援',
        question: "「Block Left」向左阻擋陣型適用於？",
        options: ["事故在右側，引導車流至內側/對向車道", "事故在左側", "沒差別"],
        answer: 0,
        explanation: "根據事故位置與車流方向精準計算阻擋角度。"
    },
    {
        id: 19,
        category: '進階救援',
        question: "夜間出勤時，人員裝備的首要規範是？",
        options: ["帶手電筒就好", "穿著具有高反光材質的背心或外套", "穿全黑以便隱身"],
        answer: 1,
        explanation: "高反光標誌能提供極佳的夜間預警動效。"
    },
    {
        id: 20,
        category: '進階救援',
        question: "所謂「預期危險」的具體行動是？",
        options: ["假設對向車會闖紅燈，起步稍候觀察", "看到火光才加速", "相信警察會處理好"],
        answer: 0,
        explanation: "先假設對方可能犯錯，並預做應對措施。"
    },

    // --- 重點考點補充 ---
    {
        id: 21,
        category: '考點補充',
        question: "若救護車先到現場（警察未到前），應停於？",
        options: ["下游處", "事故車上游至少 15 公尺 (北市府標準)", "事故車旁邊"],
        answer: 1,
        explanation: "先到之車輛需暫充當防禦牆，需停在上游處。"
    },
    {
        id: 22,
        category: '考點補充',
        question: "交通錐的佈置原則是？",
        options: ["由近而遠", "面向來車方向，逆向由遠處開始佈置", "隨便擺放"],
        answer: 1,
        explanation: "面向來車可隨時觀察即將到來的威脅，確保人員安全。"
    },
    {
        id: 23,
        category: '考點補充',
        question: "「狀態傳達」對於救災車的意義在於？",
        options: ["明確告知後車本車為「靜止停放」非移動中", "顯示車輛號碼", "為了好看"],
        answer: 0,
        explanation: "清晰的燈光組合可讓後車駕駛人提早意識到現場障礙。"
    },
    {
        id: 24,
        category: '考點補充',
        question: "緩衝車輛位移區域（禁區）內是否可以站人？",
        options: ["可以", "絕對禁止站人", "僅限傷患"],
        answer: 1,
        explanation: "追撞可能導致車輛位移，禁區內站人將面臨二次傷害風險。"
    },
    {
        id: 25,
        category: '考點補充',
        question: "倒車時視線受阻，防禦駕駛的SOP是？",
        options: ["全憑直覺", "下車察看或請同仁協助引導 (20+10規範)", "大聲按喇叭"],
        answer: 1,
        explanation: "倒車死角極多，務必尋求引導或確實查核。"
    },
    {
        id: 26,
        category: '考點補充',
        question: "「防禦視野」是指救援人員上下車時應？",
        options: ["快速跳開", "能直視後方來車動態", "只看作業區"],
        answer: 1,
        explanation: "斜停創造出的空間能讓人員在踏出車外前掌握後方動態。"
    },
    {
        id: 27,
        category: '考點補充',
        question: "高速公路時速對應的警告距離，若為北市府規範應為？",
        options: ["50m", "25m", "100m"],
        answer: 1,
        explanation: "北市府《注意事項》明確標註高速公路為 25 公尺。"
    },
    {
        id: 28,
        category: '考點補充',
        question: "大型救援車輛轉彎的盲點稱為？",
        options: ["內輪差", "死角", "以上皆是"],
        answer: 2,
        explanation: "內輪差與死角是大型車最致命的風險區。"
    },
    {
        id: 29,
        category: '考點補充',
        question: "「安全三部曲」的第一部是？",
        options: ["劃設緩衝", "建立實體防護", "認知潛在威脅"],
        answer: 2,
        explanation: "先認知威脅（5D、風險過慮），才能進行有效部署。"
    },
    {
        id: 30,
        category: '考點補充',
        question: "防禦駕駛學習網建立的終極目的是？",
        options: ["應付考試", "提升執勤生存率與病患安全", "增加網站瀏覽量"],
        answer: 1,
        explanation: "專業、數據、戰術，都是為了守護每個人的生命安全。"
    }
];
