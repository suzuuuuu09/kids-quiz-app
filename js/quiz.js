let quizData = [];
let shuffledQuiz = [];
let currentIdx = 0;
let score = 0;
let lives = 3;
let timeLeft = 10;
let timerId;
let isAnswerLocked = false;
const TOTAL_QUESTIONS = 10;

let currentPrize = 0;
let previousPrize = 0;
let isDroppedOut = false;
const PRIZE_PER_ANSWER = 10000;

let hasUsedHalf = false;
let hasUsedLength = false;
let hasUsedPass = false;
let skipAdvanceAfterPass = false;
let correctQuestionSet = new Set();

let prizeAnimationId = null;
let lastFocusedElement = null;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

// ==========================================
// 効果音生成システム (Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let drumIntervalId = null;

function playSound(type) {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === "click") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === "drum_start") {
        if (drumIntervalId) clearInterval(drumIntervalId);

        drumIntervalId = setInterval(() => {
            const dNow = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(75 + Math.random() * 10, dNow);
            gain.gain.setValueAtTime(0.35, dNow);
            gain.gain.linearRampToValueAtTime(0, dNow + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(dNow);
            osc.stop(dNow + 0.08);
        }, 60);
    } else if (type === "drum_stop") {
        if (drumIntervalId) {
            clearInterval(drumIntervalId);
            drumIntervalId = null;
        }
    } else if (type === "correct") {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, now);
        osc1.frequency.setValueAtTime(880.0, now + 0.15);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1318.5, now);
        osc2.frequency.setValueAtTime(1760.0, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.4);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
    } else if (type === "incorrect") {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(140, now);
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(143, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
    }
}

function $(id) {
    return document.getElementById(id);
}

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatMoney(value) {
    return Number(value).toLocaleString("ja-JP");
}

function isReviewMode() {
    return getQuizMode() === "review";
}

function getQuizMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("mode") || "math";
}

function getModeLabel() {
    return isReviewMode() ? "復習モード" : "大人向けチャレンジ";
}

function setDocumentTitleForStage(stage) {
    if (stage === "result") {
        document.title = isReviewMode()
            ? "小学生向けクイズの復習結果"
            : "小学生向けクイズの結果";
        return;
    }

    if (stage === "quiz") {
        document.title = "小学生向けクイズに挑戦中";
        return;
    }

    document.title = "大人は解ける？小学生向けクイズ";
}

function allRescuesUsed() {
    return hasUsedHalf && hasUsedLength && hasUsedPass;
}

function updateModeChips() {
    const label = getModeLabel();
    ["mode-chip-quiz", "mode-chip-explanation"].forEach((id) => {
        const el = $(id);
        if (el) {
            el.textContent = label;
        }
    });
}

function updateRescueSummary() {
    const chips = [
        ["summary-half", hasUsedHalf],
        ["summary-length", hasUsedLength],
        ["summary-pass", hasUsedPass],
    ];

    chips.forEach(([id, used]) => {
        const el = $(id);
        if (el) {
            el.classList.toggle("is-used", used);
        }
    });

    const trigger = $("btn-rescue-trigger");
    if (trigger) {
        trigger.disabled = isAnswerLocked || allRescuesUsed();
    }

    [["btn-half", hasUsedHalf], ["btn-length", hasUsedLength], ["btn-pass", hasUsedPass]].forEach(
        ([id, used]) => {
            const el = $(id);
            if (el) {
                el.disabled = used || isAnswerLocked;
            }
        }
    );
}

function setButtonDisabled(id, disabled) {
    const el = $(id);
    if (el) {
        el.disabled = disabled;
    }
}

function resetQuestionFeedback() {
    const circle = $("draw-circle");
    const cross = $("draw-cross");
    if (circle) {
        circle.classList.remove("active-circle", "fade-out");
    }
    if (cross) {
        cross.classList.remove("active-cross", "fade-out");
    }
    const gameContainer = $("game-container");
    if (gameContainer) {
        gameContainer.classList.remove("thinking-slow");
    }
}

function cancelPrizeAnimation() {
    if (prizeAnimationId) {
        cancelAnimationFrame(prizeAnimationId);
        prizeAnimationId = null;
    }
}

function animatePrizeValue(fromValue, toValue) {
    cancelPrizeAnimation();

    const target = $("prize-current-value");
    if (!target) return;

    if (reducedMotionQuery.matches || fromValue === toValue) {
        target.textContent = formatMoney(toValue);
        return;
    }

    const duration = 600;
    const start = performance.now();

    const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(fromValue + (toValue - fromValue) * eased);
        target.textContent = formatMoney(value);

        if (progress < 1) {
            prizeAnimationId = requestAnimationFrame(tick);
        } else {
            prizeAnimationId = null;
        }
    };

    prizeAnimationId = requestAnimationFrame(tick);
}

function renderPrizePanel(statusType) {
    const prizeArea = $("prize-display-area");
    const prizeKicker = $("prize-kicker");
    const prizeDelta = $("prize-delta");
    const prizeLoss = $("prize-loss");
    const prizeAmountRow = document.querySelector(".prize-amount-row");
    const prizeRange = $("prize-range");
    const currentValue = $("prize-current-value");

    if (!prizeArea || !prizeKicker || !prizeDelta || !prizeLoss || !prizeAmountRow || !prizeRange || !currentValue) {
        return;
    }

    if (isReviewMode()) {
        prizeArea.classList.add("hidden");
        return;
    }

    prizeArea.classList.remove("hidden");
    prizeArea.classList.remove("is-gain", "is-loss");
    prizeKicker.textContent = "積立賞金";
    prizeDelta.classList.add("hidden");
    prizeLoss.classList.add("hidden");
    prizeAmountRow.classList.remove("hidden");

    if (statusType === true) {
        prizeArea.classList.add("is-gain");
        prizeDelta.textContent = `+${formatMoney(PRIZE_PER_ANSWER)}円`;
        prizeDelta.classList.remove("hidden");
        prizeRange.textContent = `積立賞金: ${formatMoney(previousPrize)}円 → ${formatMoney(currentPrize)}円`;
        currentValue.textContent = formatMoney(previousPrize);
        animatePrizeValue(previousPrize, currentPrize);
    } else if (statusType === "pass" || statusType === false) {
        if (lives <= 0 && statusType !== "pass") {
            prizeArea.classList.add("is-loss");
            prizeLoss.innerHTML = `ここまでの積立賞金 <strong>${formatMoney(currentPrize)}円</strong> は没収されます`;
            prizeLoss.classList.remove("hidden");
            prizeAmountRow.classList.add("hidden");
            prizeRange.textContent = "結果画面で 0円 になります";
        } else {
            currentValue.textContent = formatMoney(currentPrize);
            prizeRange.textContent = "";
        }
    }
}

function renderMetric(element, label, value, unit, caption) {
    if (!element) return;

    element.innerHTML = `
        <span class="result-metric-label">${label}</span>
        <span class="result-metric-value-row">
            <span class="result-metric-value">${formatMoney(value)}</span>
            <span class="result-metric-unit">${unit}</span>
        </span>
        ${caption ? `<span class="result-metric-caption">${caption}</span>` : ""}
    `;
}

function getAttemptedQuestionCount() {
    return Math.min(currentIdx + 1, shuffledQuiz.length);
}

function getRemainingQuestionsForCurrentRun() {
    return shuffledQuiz.filter((question) => !correctQuestionSet.has(question.question));
}

function getRemainingQuestionsForReview() {
    return quizData.filter((question) => !correctQuestionSet.has(question.question));
}

function syncModalFocus() {
    if (!lastFocusedElement || typeof lastFocusedElement.focus !== "function") return;
    if (document.body.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
    }
}

async function initQuiz() {
    try {
        const mode = getQuizMode();
        setDocumentTitleForStage("quiz");

        currentIdx = 0;
        score = 0;
        lives = 3;
        timeLeft = 10;
        isAnswerLocked = false;
        currentPrize = 0;
        previousPrize = 0;
        isDroppedOut = false;
        hasUsedHalf = false;
        hasUsedLength = false;
        hasUsedPass = false;
        skipAdvanceAfterPass = false;
        correctQuestionSet = new Set();

        if (mode === "review") {
            const stored = localStorage.getItem("review_questions");
            if (stored) {
                quizData = JSON.parse(stored);
            }
            if (!Array.isArray(quizData) || quizData.length === 0) {
                alert("復習する問題がありません！");
                window.location.href = "index.html";
                return;
            }
            shuffledQuiz = [...quizData].sort(() => Math.random() - 0.5);
        } else if (mode === "random") {
            const paths = [
                "data/japanese.json",
                "data/math.json",
                "data/science.json",
                "data/society.json",
                "data/english.json",
            ];

            const responses = await Promise.all(paths.map((path) => fetch(path)));
            for (const res of responses) {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            }

            const jsonLists = await Promise.all(responses.map((res) => res.json()));
            quizData = jsonLists.flat();
            quizData.sort(() => Math.random() - 0.5);
            shuffledQuiz = quizData.slice(0, TOTAL_QUESTIONS);
        } else {
            let targetJson = "data/math.json";
            if (mode === "kokugo" || mode === "japanese") {
                targetJson = "data/japanese.json";
            } else if (mode === "sansu" || mode === "math") {
                targetJson = "data/math.json";
            } else if (mode === "rika" || mode === "science") {
                targetJson = "data/science.json";
            } else if (mode === "shakai" || mode === "society") {
                targetJson = "data/society.json";
            } else if (mode === "eigo" || mode === "english") {
                targetJson = "data/english.json";
            } else {
                targetJson = `data/${mode}.json`;
            }

            const response = await fetch(targetJson);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            quizData = await response.json();
            quizData.sort(() => Math.random() - 0.5);
            shuffledQuiz = quizData.slice(0, TOTAL_QUESTIONS);
        }

        updateLivesUI();
        updateModeChips();
        updateRescueSummary();
        loadQuestion();
    } catch (error) {
        console.error("クイズデータの読み込みに失敗しました:", error);
        const questionText = $("question-text");
        if (questionText) {
            questionText.textContent = "データの読み込みに失敗しました。";
        }
    }
}

function loadQuestion() {
    isAnswerLocked = false;

    if (currentIdx >= shuffledQuiz.length || lives <= 0) {
        showResult();
        return;
    }

    $("explanation-screen").classList.add("hidden");
    $("result-screen").classList.add("hidden");
    $("quiz-screen").classList.remove("hidden");

    closeRescueMenu(false);
    resetQuestionFeedback();
    updateModeChips();

    const data = shuffledQuiz[currentIdx];
    $("question-num").textContent = `第 ${currentIdx + 1} 問 / 全${shuffledQuiz.length}問`;
    $("question-text").innerHTML = `<span>${escapeHtml(data.question)}</span>`;

    const optionsArea = $("options");
    optionsArea.innerHTML = "";

    data.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = choice;
        btn.addEventListener("click", () => checkAnswer(i, btn));
        optionsArea.appendChild(btn);
    });

    updateRescueSummary();
    startTimer();
    setDocumentTitleForStage("quiz");
}

function openRescueMenu() {
    if (isAnswerLocked || allRescuesUsed()) return;

    playSound("click");
    lastFocusedElement = document.activeElement;
    const modal = $("rescue-modal");
    modal.classList.remove("hidden-modal");

    window.requestAnimationFrame(() => {
        const firstAvailable =
            document.querySelector(".rescue-choice-btn:not(:disabled)") || $("btn-rescue-close");
        if (firstAvailable && typeof firstAvailable.focus === "function") {
            firstAvailable.focus();
        }
    });
}

function closeRescueMenu(restoreFocus = true) {
    const modal = $("rescue-modal");
    if (modal) {
        modal.classList.add("hidden-modal");
    }

    if (restoreFocus) {
        syncModalFocus();
    }
}

function useHalfItem() {
    if (hasUsedHalf || isAnswerLocked) return;

    hasUsedHalf = true;
    playSound("click");
    closeRescueMenu();

    const data = shuffledQuiz[currentIdx];
    const correctIdx = data.answer;
    const incorrectIndices = [];

    data.choices.forEach((_, i) => {
        if (i !== correctIdx) incorrectIndices.push(i);
    });

    incorrectIndices.sort(() => Math.random() - 0.5);
    const toRemove = incorrectIndices.slice(0, 2);
    const buttons = $("options").getElementsByTagName("button");

    toRemove.forEach((idx) => {
        buttons[idx].classList.add("incorrect-faded");
        buttons[idx].disabled = true;
    });

    updateRescueSummary();
}

function useLengthItem() {
    if (hasUsedLength || isAnswerLocked) return;

    hasUsedLength = true;
    playSound("click");
    closeRescueMenu();

    const data = shuffledQuiz[currentIdx];
    const correctText = data.choices[data.answer];

    const qTextElement = $("question-text");
    const badge = document.createElement("div");
    badge.className = "hint-badge";
    badge.textContent = `ヒント: 正解は【${correctText.length}文字】`;
    qTextElement.appendChild(badge);

    updateRescueSummary();
}

function disableQuestionControls() {
    const optionsArea = $("options");
    const buttons = optionsArea.getElementsByTagName("button");
    for (const btn of buttons) {
        btn.disabled = true;
    }
    setButtonDisabled("btn-rescue-trigger", true);
}

function usePassItem() {
    if (hasUsedPass || isAnswerLocked) return;

    hasUsedPass = true;
    playSound("click");
    closeRescueMenu();

    clearInterval(timerId);
    isAnswerLocked = true;
    disableQuestionControls();

    const passedQuestion = shuffledQuiz.splice(currentIdx, 1)[0];
    shuffledQuiz.push(passedQuestion);
    skipAdvanceAfterPass = true;

    updateRescueSummary();
    showExplanation("pass");
}

function startTimer() {
    timeLeft = 10;
    clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft -= 0.1;
        $("timer-bar").style.width = `${timeLeft * 10}%`;
        $("timer-text").textContent = `${Math.ceil(timeLeft)}s`;

        if (timeLeft <= 0) {
            clearInterval(timerId);
            playSound("incorrect");
            isAnswerLocked = true;
            disableQuestionControls();
            finishAnswer(false);
        }
    }, 100);
}

function checkAnswer(idx, clickedBtn) {
    if (isAnswerLocked || clickedBtn.disabled) return;

    isAnswerLocked = true;
    clearInterval(timerId);
    disableQuestionControls();

    clickedBtn.classList.add("selected-checking");
    $("game-container").classList.add("thinking-slow");

    playSound("drum_start");

    const randomDelay = Math.floor(Math.random() * (5000 - 1500 + 1)) + 1500;
    const data = shuffledQuiz[currentIdx];
    const isCorrect = idx === data.answer;

    if (isCorrect) {
        score++;
        correctQuestionSet.add(data.question);
        if (!isReviewMode()) {
            previousPrize = currentPrize;
            currentPrize += PRIZE_PER_ANSWER;
        }
    }

    setTimeout(() => {
        playSound("drum_stop");
        clickedBtn.classList.remove("selected-checking");

        if (isCorrect) {
            playSound("correct");
        } else {
            playSound("incorrect");
        }

        finishAnswer(isCorrect);
    }, randomDelay);
}

function finishAnswer(isCorrect) {
    closeRescueMenu(false);

    if (!isCorrect) {
        lives--;
        updateLivesUI();
        $("draw-cross").classList.add("active-cross");
    } else {
        $("draw-circle").classList.add("active-circle");
    }

    setTimeout(() => {
        showExplanation(isCorrect);
    }, 900);
}

function showExplanation(statusType) {
    $("draw-circle").classList.add("fade-out");
    $("draw-cross").classList.add("fade-out");

    $("quiz-screen").classList.add("hidden");
    $("result-screen").classList.add("hidden");
    const expScreen = $("explanation-screen");
    expScreen.classList.remove("hidden");

    updateModeChips();

    const data = shuffledQuiz[currentIdx];
    const status = $("exp-status");

    if (statusType === "pass") {
        status.textContent = "パスしました";
        status.style.color = "#ffd700";
    } else {
        status.textContent = statusType ? "正解！" : "残念...";
        status.style.color = statusType ? "#ff6464" : "#ffffff";
    }

    $("exp-text").textContent = data.hint;
    renderPrizePanel(statusType);

    const dropBtn = $("btn-drop-out");
    if (isReviewMode()) {
        dropBtn.textContent = "復習を終了";
        dropBtn.classList.remove("danger-btn");
    } else {
        dropBtn.textContent = "賞金を確定して終了";
        dropBtn.classList.add("danger-btn");
    }

    if (lives <= 0 && !isReviewMode()) {
        dropBtn.disabled = true;
        dropBtn.textContent = "ゲームオーバー";
    } else if (lives <= 0 && isReviewMode()) {
        dropBtn.disabled = true;
        dropBtn.textContent = "結果へ";
    } else {
        dropBtn.disabled = false;
    }

    const nextBtn = expScreen.querySelector("button[onclick='nextQuestion()']");
    if (nextBtn) {
        if (currentIdx + 1 >= shuffledQuiz.length || lives <= 0) {
            nextBtn.textContent = "結果発表へ";
        } else {
            nextBtn.textContent = "次の問題へ";
        }
    }
}

function dropOut() {
    playSound("click");
    isDroppedOut = true;
    showResult();
}

function updateLivesUI() {
    $("lives").textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
}

function nextQuestion() {
    playSound("click");

    if (skipAdvanceAfterPass) {
        skipAdvanceAfterPass = false;
    } else {
        currentIdx += 1;
    }

    loadQuestion();
}

function backToTitle() {
    playSound("click");
    window.location.href = "index.html";
}

function showResult() {
    clearInterval(timerId);
    cancelPrizeAnimation();
    closeRescueMenu(false);

    const reviewMode = isReviewMode();
    const resultScreen = $("result-screen");
    const quizScreen = $("quiz-screen");
    const expScreen = $("explanation-screen");

    quizScreen.classList.add("hidden");
    expScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    setDocumentTitleForStage("result");

    const resultTitle = $("result-title");
    const resultNote = $("result-note");
    const resultScore = $("result-score");
    const resultPrize = $("result-prize");
    const attemptedQuestions = getAttemptedQuestionCount();

    if (reviewMode) {
        const remainingReviewQuestions = getRemainingQuestionsForReview();
        const clearedAll = remainingReviewQuestions.length === 0 && lives > 0 && score === shuffledQuiz.length;

        if (clearedAll) {
            resultTitle.textContent = "弱点克服";
            resultNote.textContent = "すべての弱点を片付けました。";
        } else {
            resultTitle.textContent = "復習継続";
            resultNote.textContent = "次回に持ち越す問題があります。";
        }

        renderMetric(resultScore, "正解数", score, "問", `${shuffledQuiz.length}問中`);
        renderMetric(
            resultPrize,
            "残りの復習問題数",
            remainingReviewQuestions.length,
            "問",
            "次回に持ち越し"
        );

        try {
            if (remainingReviewQuestions.length > 0) {
                localStorage.setItem("review_questions", JSON.stringify(remainingReviewQuestions));
            } else {
                localStorage.removeItem("review_questions");
            }
        } catch (e) {
            console.error("復習データの書き込みに失敗しました:", e);
        }
        return;
    }

    const remainingReviewQuestions = getRemainingQuestionsForCurrentRun();

    try {
        localStorage.setItem("review_questions", JSON.stringify(remainingReviewQuestions));
    } catch (e) {
        console.error("復習データの書き込みに失敗しました:", e);
    }

    if (isDroppedOut) {
        resultTitle.textContent = "賞金確定";
        resultNote.textContent = `ここで終了し、${formatMoney(currentPrize)}円を確定しました。`;
        renderMetric(resultScore, "正解数", score, "問", `${attemptedQuestions}問中`);
        renderMetric(resultPrize, "確定賞金", currentPrize, "円", "途中終了で確定");
        return;
    }

    if (lives <= 0) {
        const prizeBeforeLoss = currentPrize;
        currentPrize = 0;
        resultTitle.textContent = "チャレンジ終了";
        resultNote.textContent = `ここまでの積立賞金 ${formatMoney(prizeBeforeLoss)}円 → 0円 になりました。`;
        renderMetric(resultScore, "正解数", score, "問", `${attemptedQuestions}問中`);
        renderMetric(resultPrize, "最終賞金", 0, "円", "没収");
        return;
    }

    if (score === shuffledQuiz.length) {
        resultTitle.textContent = "完全達成";
        resultNote.textContent = "全問正解と最高賞金を同時に達成しました。";
        renderMetric(resultScore, "正解数", score, "問", `${shuffledQuiz.length}問中`);
        renderMetric(resultPrize, "最高賞金", currentPrize, "円", "全問正解");
        return;
    }

    resultTitle.textContent = "チャレンジ達成";
    resultNote.textContent = "最後まで解き切り、積み上がった賞金を持ち帰りました。";
    renderMetric(resultScore, "正解数", score, "問", `${shuffledQuiz.length}問中`);
    renderMetric(resultPrize, "獲得賞金", currentPrize, "円", "積み上がった賞金");
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("rescue-modal").classList.contains("hidden-modal")) {
        closeRescueMenu();
    }
});

$("rescue-modal").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
        closeRescueMenu();
    }
});

initQuiz();
