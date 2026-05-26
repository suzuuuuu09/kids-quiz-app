let quizData = [];
let shuffledQuiz = [];
let currentIdx = 0;
let score = 0;
let lives = 3;
let timeLeft = 10;
let timerId;
const TOTAL_QUESTIONS = 10;

// 賞金システム用の変数
let currentPrize = 0;       
let isDroppedOut = false;   
const PRIZE_LIST = [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 700000, 1000000];

// 救済措置の使用フラグ
let hasUsedHalf = false;
let hasUsedLength = false;
let hasUsedPass = false;

// URLパラメータから選択されたモード（教科名）を取得
function getQuizMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') || 'math';
}

// モードに応じたJSONデータを自動で読み分ける
async function initQuiz() {
    try {
        const mode = getQuizMode();

        if (mode === 'random') {
            // 全5教科のJSONを同時にすべて読み込む（一問一問ごちゃまぜ用）
            const paths = [
                'data/japanese.json',
                'data/math.json',
                'data/science.json',
                'data/society.json',
                'data/english.json'
            ];

            const responses = await Promise.all(paths.map(path => fetch(path)));
            
            for (const res of responses) {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            }

            const jsonLists = await Promise.all(responses.map(res => res.json()));
            quizData = jsonLists.flat();

        } else {
            // 単品教科を選択した場合
            let targetJson = 'data/math.json';
            if (mode === 'kokugo' || mode === 'japanese') {
                targetJson = 'data/japanese.json';
            } else if (mode === 'sansu' || mode === 'math') {
                targetJson = 'data/math.json';
            } else if (mode === 'rika' || mode === 'science') {
                targetJson = 'data/science.json';
            } else if (mode === 'shakai' || mode === 'society') {
                targetJson = 'data/society.json';
            } else if (mode === 'eigo' || mode === 'english') {
                targetJson = 'data/english.json';
            } else {
                targetJson = `data/${mode}.json`;
            }

            const response = await fetch(targetJson);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            quizData = await response.json();
        }
        
        quizData.sort(() => Math.random() - 0.5);
        shuffledQuiz = quizData.slice(0, TOTAL_QUESTIONS);
        
        updateLivesUI();
        loadQuestion();
    } catch (error) {
        console.error("クイズデータの読み込みに失敗しました:", error);
        document.getElementById("question-text").innerText = "データの読み込みに失敗しました。";
    }
}

function loadQuestion() {
    if (currentIdx >= shuffledQuiz.length || lives <= 0) {
        showResult();
        return;
    }

    document.getElementById("explanation-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");
    
    closeRescueMenu();
    
    const circle = document.getElementById("draw-circle");
    const cross = document.getElementById("draw-cross");
    circle.classList.remove("active-circle", "fade-out");
    cross.classList.remove("active-cross", "fade-out");

    const data = shuffledQuiz[currentIdx];
    document.getElementById("question-num").innerText = `第 ${currentIdx + 1} 問 / 全${shuffledQuiz.length}問`;
    document.getElementById("question-text").innerHTML = `<span>${data.question}</span>`; 
    
    const optionsArea = document.getElementById("options");
    optionsArea.innerHTML = "";
    
    document.getElementById("btn-rescue-trigger").disabled = false;

    data.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.innerText = choice;
        btn.onclick = () => checkAnswer(i);
        optionsArea.appendChild(btn);
    });

    document.getElementById("btn-half").disabled = hasUsedHalf;
    document.getElementById("btn-length").disabled = hasUsedLength;
    document.getElementById("btn-pass").disabled = hasUsedPass;

    if (hasUsedHalf && hasUsedLength && hasUsedPass) {
        document.getElementById("btn-rescue-trigger").disabled = true;
    }

    startTimer();
}

function openRescueMenu() {
    document.getElementById("rescue-modal").classList.remove("hidden-modal");
}

function closeRescueMenu() {
    document.getElementById("rescue-modal").classList.add("hidden-modal");
}

// 1/2機能
function useHalfItem() {
    if (hasUsedHalf) return;
    hasUsedHalf = true;
    document.getElementById("btn-half").disabled = true;
    closeRescueMenu();

    const data = shuffledQuiz[currentIdx];
    const correctIdx = data.answer;
    
    let incorrectIndices = [];
    data.choices.forEach((_, i) => {
        if (i !== correctIdx) incorrectIndices.push(i);
    });

    incorrectIndices.sort(() => Math.random() - 0.5);
    const toRemove = incorrectIndices.slice(0, 2);

    const buttons = document.getElementById("options").getElementsByTagName("button");
    toRemove.forEach(idx => {
        buttons[idx].classList.add("incorrect-faded");
        buttons[idx].onclick = null;
    });
}

// 文字数ヒント機能
function useLengthItem() {
    if (hasUsedLength) return;
    hasUsedLength = true;
    document.getElementById("btn-length").disabled = true;
    closeRescueMenu();

    const data = shuffledQuiz[currentIdx];
    const correctText = data.choices[data.answer];
    
    const qTextElement = document.getElementById("question-text");
    const badge = document.createElement("div");
    badge.className = "hint-badge";
    badge.innerText = `ヒント: 正解は 【${correctText.length}文字】`;
    qTextElement.appendChild(badge);
}

// パス機能
function usePassItem() {
    if (hasUsedPass) return;
    hasUsedPass = true;
    document.getElementById("btn-pass").disabled = true;
    closeRescueMenu();
    
    clearInterval(timerId);

    const optionsArea = document.getElementById("options");
    const buttons = optionsArea.getElementsByTagName("button");
    for (let btn of buttons) {
        btn.disabled = true;
    }
    document.getElementById("btn-rescue-trigger").disabled = true;

    const nextAvailableQuestion = quizData.find(q => !shuffledQuiz.includes(q));
    if (nextAvailableQuestion) {
        shuffledQuiz.push(nextAvailableQuestion);
    } else {
        shuffledQuiz.push(shuffledQuiz[currentIdx]);
    }
    
    showExplanation('pass');
}

function startTimer() {
    timeLeft = 10;
    clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft -= 0.1;
        document.getElementById("timer-bar").style.width = (timeLeft * 10) + "%";
        document.getElementById("timer-text").innerText = Math.ceil(timeLeft) + "s";
        if (timeLeft <= 0) {
            clearInterval(timerId);
            finishAnswer(false);
        }
    }, 100);
}

function checkAnswer(idx) {
    clearInterval(timerId);
    
    const optionsArea = document.getElementById("options");
    const buttons = optionsArea.getElementsByTagName("button");
    for (let btn of buttons) {
        btn.disabled = true;
    }
    document.getElementById("btn-rescue-trigger").disabled = true;

    const isCorrect = (idx === shuffledQuiz[currentIdx].answer);
    
    if (isCorrect) {
        score++;
        currentPrize = PRIZE_LIST[currentIdx];
    }
    
    finishAnswer(isCorrect);
}

function finishAnswer(isCorrect) {
    closeRescueMenu();

    const optionsArea = document.getElementById("options");
    const buttons = optionsArea.getElementsByTagName("button");
    for (let btn of buttons) {
        btn.disabled = true;
    }
    document.getElementById("btn-rescue-trigger").disabled = true;

    if (!isCorrect) {
        lives--;
        updateLivesUI();
        document.getElementById("draw-cross").classList.add("active-cross");
    } else {
        document.getElementById("draw-circle").classList.add("active-circle");
    }
    
    setTimeout(() => {
        showExplanation(isCorrect);
    }, 900);
}

function showExplanation(statusType) {
    document.getElementById("draw-circle").classList.add("fade-out");
    document.getElementById("draw-cross").classList.add("fade-out");

    document.getElementById("quiz-screen").classList.add("hidden");
    const expScreen = document.getElementById("explanation-screen");
    expScreen.classList.remove("hidden");

    const data = shuffledQuiz[currentIdx];
    const status = document.getElementById("exp-status");
    
    if (statusType === 'pass') {
        status.innerText = "パスしました";
        status.style.color = "#ffd700"; 
    } else {
        status.innerText = statusType ? "正解！" : "残念...";
        status.style.color = statusType ? "#ff5252" : "#ffffff";
    }
    
    document.getElementById("exp-text").innerText = data.hint;
    document.getElementById("current-prize").innerText = currentPrize.toLocaleString();

    const dropBtn = document.getElementById("btn-drop-out");
    if (dropBtn) {
        if (lives <= 0) {
            dropBtn.disabled = true;
            dropBtn.innerText = "ゲームオーバー";
            dropBtn.style.backgroundColor = "#7f8c8d";
        } else {
            dropBtn.disabled = false;
            dropBtn.innerText = "ここでやめる";
            dropBtn.style.backgroundColor = "#e74c3c";
        }
    }
}

function dropOut() {
    isDroppedOut = true;
    showResult();
}

function updateLivesUI() {
    document.getElementById("lives").innerText = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
}

function nextQuestion() {
    currentIdx++;
    loadQuestion();
}

function backToTitle() {
    window.location.href = "index.html";
}

function showResult() {
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("explanation-screen").classList.add("hidden");
    const res = document.getElementById("result-screen");
    res.classList.remove("hidden");
    
    document.getElementById("result-score").innerText = `正解数: ${score} / ${TOTAL_QUESTIONS}`;
    
    const title = document.getElementById("result-title");
    const prizeRes = document.getElementById("result-prize");
    
    if (isDroppedOut) {
        title.innerText = "賢い選択！ゲームを終了しました";
        prizeRes.innerHTML = `お見事！獲得賞金 <span style="font-size: 32px; color: #ffd700;">${currentPrize.toLocaleString()}</span> 円をゲット！`;
    } else if (lives > 0 && score === TOTAL_QUESTIONS) {
        title.innerText = "満点！ミリオンセラー達成！";
        prizeRes.innerHTML = `完全制覇！最高賞金 <span style="font-size: 32px; color: #ffd700;">${currentPrize.toLocaleString()}</span> 円を獲得！！`;
    } else if (lives > 0) {
        title.innerText = "合格！よく頑張りました";
        prizeRes.innerHTML = `最終獲得賞金 <span style="font-size: 32px; color: #ffd700;">${currentPrize.toLocaleString()}</span> 円を獲得！`;
    } else {
        title.innerText = "残念！やり直しです...";
        currentPrize = 0; 
        prizeRes.innerHTML = `賞金は <span style="font-size: 32px; color: #ff4757;">0</span> 円です...`;
    }
}

initQuiz();