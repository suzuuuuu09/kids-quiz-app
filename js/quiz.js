let quizData = [];
let shuffledQuiz = [];
let currentIdx = 0;
let score = 0;
let lives = 3;
let timeLeft = 10;
let timerId;
const TOTAL_QUESTIONS = 10;

// 救済措置の使用フラグ
let hasUsedHalf = false;
let hasUsedLength = false;
let hasUsedPass = false;

async function initQuiz() {
    try {
        const response = await fetch('data/math.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        quizData = await response.json();
        
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
    
    // お助けモーダル選択画面を閉じておく
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
    
    // お助けボタンを一旦活性化（すべて使用済みの場合は下の判定で弾かれる）
    document.getElementById("btn-rescue-trigger").disabled = false;

    data.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.innerText = choice;
        btn.onclick = () => checkAnswer(i);
        optionsArea.appendChild(btn);
    });

    // モーダル内の各救済ボタンの状態更新
    document.getElementById("btn-half").disabled = hasUsedHalf;
    document.getElementById("btn-length").disabled = hasUsedLength;
    document.getElementById("btn-pass").disabled = hasUsedPass;

    if (hasUsedHalf && hasUsedLength && hasUsedPass) {
        document.getElementById("btn-rescue-trigger").disabled = true;
    }

    startTimer();
}

// お助け選択画面を開く
function openRescueMenu() {
    document.getElementById("rescue-modal").classList.remove("hidden-modal");
}

// お助け選択画面を閉じる
function closeRescueMenu() {
    document.getElementById("rescue-modal").classList.add("hidden-modal");
}

// 救済措置：1/2にする（不正解を暗くして非活性化）
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
        // 1/2で消されたボタンはクリックしても反応しないようにする
        buttons[idx].onclick = null;
    });
}

// 救済措置：文字数ヒント
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

// 救済措置：パス機能（末尾に新規問題を補充し、10問回答を維持）
function usePassItem() {
    if (hasUsedPass) return;
    hasUsedPass = true;
    document.getElementById("btn-pass").disabled = true;
    closeRescueMenu();
    
    clearInterval(timerId);

    // ★パスした時も連打できないようにボタンをロックする
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
    
    // ★【激ヤバ連打対策】どれか1つのボタンが押された瞬間、選択肢の全ボタンを完全ロック！
    const optionsArea = document.getElementById("options");
    const buttons = optionsArea.getElementsByTagName("button");
    for (let btn of buttons) {
        btn.disabled = true;
    }
    // 回答中はお助け機能ボタンも押せないようにロック
    document.getElementById("btn-rescue-trigger").disabled = true;

    const isCorrect = (idx === shuffledQuiz[currentIdx].answer);
    if (isCorrect) score++;
    finishAnswer(isCorrect);
}

function finishAnswer(isCorrect) {
    closeRescueMenu();

    // もし時間切れ（timeLeft <= 0）でここに来た場合も想定し、念のためボタンをロック
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
}

function updateLivesUI() {
    document.getElementById("lives").innerText = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
}

function nextQuestion() {
    currentIdx++;
    loadQuestion();
}

function showResult() {
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("explanation-screen").classList.add("hidden");
    const res = document.getElementById("result-screen");
    res.classList.remove("hidden");
    
    document.getElementById("result-score").innerText = `正解数: ${score} / ${TOTAL_QUESTIONS}`;
    
    const title = document.getElementById("result-title");
    if (lives > 0 && score === TOTAL_QUESTIONS) title.innerText = "満点！天才小学生！";
    else if (lives > 0) title.innerText = "合格！よく頑張りました";
    else title.innerText = "残念！やり直しです...";
}

initQuiz();