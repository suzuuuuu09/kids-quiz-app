const quizData = [
    { q: "1dl（デシリットル）は何ml？", a: ["10ml", "100ml", "1000ml", "10000ml"], correct: 1, hint: "d（デシ）は10分の1を意味します。1L(1000ml)の1/10なので100mlです。" },
    { q: "10cmのテープを5等分に切る。切る回数は？", a: ["3回", "4回", "5回", "6回"], correct: 1, hint: "5つのパーツにするには、その間の4箇所を切れば完成します。" },
    { q: "「450円の20%引き」はいくら？", a: ["90円", "360円", "380円", "430円"], correct: 1, hint: "20%は90円です。450円から90円を引くと360円になります。" },
    { q: "最小の素数は？", a: ["1", "2", "3", "0"], correct: 1, hint: "素数は「1より大きい数」なので、2が最小の素数です。" },
    { q: "立方体の展開図は全部で何種類？", a: ["9種類", "10種類", "11種類", "12種類"], correct: 2, hint: "重なりや回転を除くと、全部で11種類の形があります。" },
    { q: "分速60mは、時速に直すと？", a: ["3.6km", "360m", "6km", "60km"], correct: 0, hint: "分速60m × 60分 = 時速3600m。kmに直すと3.6kmです。" },
    { q: "2進法の「101」は10進法でいくつ？", a: ["3", "5", "101", "6"], correct: 1, hint: "4(2の2乗) + 0 + 1 = 5 となります。" },
    { q: "√２のおおよその値は？", a: ["1.41", "1.73", "2.23", "3.14"], correct: 0, hint: "「一夜一夜に人見ごろ（1.414...）」の語呂合わせで覚えます。" },
    { q: "10cm丸太を2cmずつ切る(1回4分)。全部で何分？", a: ["20分", "16分", "24分", "12分"], correct: 1, hint: "5本に切るには、切る回数は4回です。4分 × 4回 = 16分かかります。" },
    { q: "正六角形の「対角線」は何本？", a: ["6本", "9本", "12本", "3本"], correct: 1, hint: "公式 {6 × (6-3)} ÷ 2 = 9本です。" },
    { q: "「1÷0」の算数的な答えは？", a: ["0", "1", "無限", "計算できない"], correct: 3, hint: "数学では0で割ることは禁止されており、「不能」とされます。" },
    { q: "ある数を3倍して5を足したら20になった。ある数は？", a: ["5", "15", "7", "45"], correct: 0, hint: "逆算すると (20 - 5) ÷ 3 = 5 となります。" },
    { q: "「5＋5 × 5 － 5」の答えは？", a: ["45", "25", "0", "20"], correct: 1, hint: "掛け算が先です！ 5 + (5×5) - 5 = 25 となります。" },
    { q: "立方体の「頂点」の数は？", a: ["6個", "8個", "12個", "4個"], correct: 1, hint: "上の面に4つ、下の面に4つ。合計で8個です。" },
    { q: "分速200mで3km進むのに何分かかる？", a: ["1.5分", "15分", "6分", "60分"], correct: 1, hint: "3kmは3000m。3000 ÷ 200 = 15分となります。" },
    { q: "√３のおおよその値は？", a: ["1.41", "1.73", "2.23", "3.1"], correct: 1, hint: "「人並みに奢れ（1.732...）」の語呂合わせで覚えます。" }
];

let currentIdx = 0;
let score = 0;
let lives = 3;
let timeLeft = 10;
let timerId;
const TOTAL_QUESTIONS = 10;

const shuffledQuiz = [...quizData].sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS);

function loadQuestion() {
    if (currentIdx >= shuffledQuiz.length || lives <= 0) {
        showResult();
        return;
    }

    document.getElementById("explanation-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");
    
    // リセット
    const circle = document.getElementById("draw-circle");
    const cross = document.getElementById("draw-cross");
    circle.classList.remove("active-circle", "fade-out");
    cross.classList.remove("active-cross", "fade-out");

    const data = shuffledQuiz[currentIdx];
    document.getElementById("question-num").innerText = `第 ${currentIdx + 1} 問 / 全${TOTAL_QUESTIONS}問`;
    document.getElementById("question-text").innerText = data.q;
    
    const optionsArea = document.getElementById("options");
    optionsArea.innerHTML = "";
    data.a.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.innerText = choice;
        btn.onclick = () => checkAnswer(i);
        optionsArea.appendChild(btn);
    });

    startTimer();
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
    const isCorrect = (idx === shuffledQuiz[currentIdx].correct);
    if (isCorrect) score++;
    finishAnswer(isCorrect);
}

function finishAnswer(isCorrect) {
    if (!isCorrect) {
        lives--;
        updateLivesUI();
        document.getElementById("draw-cross").classList.add("active-cross");
    } else {
        document.getElementById("draw-circle").classList.add("active-circle");
    }
    
    // アニメーション完了後に解説画面へ
    setTimeout(() => {
        showExplanation(isCorrect);
    }, 900);
}

function showExplanation(isCorrect) {
    // 解説画面に切り替わる瞬間にフェードアウトさせる
    document.getElementById("draw-circle").classList.add("fade-out");
    document.getElementById("draw-cross").classList.add("fade-out");

    document.getElementById("quiz-screen").classList.add("hidden");
    const expScreen = document.getElementById("explanation-screen");
    expScreen.classList.remove("hidden");

    const data = shuffledQuiz[currentIdx];
    const status = document.getElementById("exp-status");
    status.innerText = isCorrect ? "正解！" : "残念...";
    status.style.color = isCorrect ? "#ff5252" : "#ffffff";
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

updateLivesUI();
loadQuestion();