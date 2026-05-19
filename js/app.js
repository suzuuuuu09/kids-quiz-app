// ==========================================
// 1. 【タイトル画面（index.html）用】の処理
// ==========================================

// 画面の表示・非表示を切り替える関数
function toggleView(showSubjectMenu) {
    const mainMenu = document.getElementById("main-menu-view");
    const subjectMenu = document.getElementById("subject-select-view");
    
    if (showSubjectMenu) {
        // 教科えらぶ画面を出す
        mainMenu.classList.add("hidden");
        subjectMenu.classList.remove("hidden");
    } else {
        // 初めの画面に戻す
        mainMenu.classList.remove("hidden");
        subjectMenu.classList.add("hidden");
    }
}

function selectMode(mode) {
    // 選択されたモードをURLパラメータに付与してquiz.htmlに画面遷移
    window.location.href = `quiz.html?mode=${mode}`;
}


// ==========================================
// 2. 【クイズ画面（quiz.html）用】の処理
// ==========================================

function getQuizMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') || 'math';
}

async function loadQuestions() {
  const mode = getQuizMode();
  let targetJson = 'data/math.json';

  if (mode === 'random') {
    targetJson = 'data/math.json';
  } else if (mode === 'kokugo') {
    targetJson = 'data/japanese.json';
  } else {
    targetJson = `data/${mode}.json`;
  }

  try {
    const res = await fetch(targetJson);
    const list = await res.json();
    return list;
  } catch (e) {
    console.error('読み込み失敗', e);
    return [];
  }
}

function showQuestion(q) {
  const questionEl = document.getElementById('question');
  const choicesEl = document.getElementById('choices');
  const statusEl = document.getElementById('status');
  
  if (!questionEl || !choicesEl) return;

  questionEl.textContent = q.question;
  choicesEl.innerHTML = '';
  
  q.choices.forEach((c, i) => {
    const li = document.createElement('li');
    const btn = document.createElement("button");
    btn.textContent = c;
    btn.addEventListener('click', () => {
      if (i === q.answer) {
        statusEl.textContent = '正解！';
      } else {
        statusEl.textContent = '不正解…';
      }
    });
    li.appendChild(btn);
    choicesEl.appendChild(li);
  });
}

(async () => {
  if (window.location.pathname.includes('quiz.html')) {
    const qs = await loadQuestions();
    if (qs.length) showQuestion(qs[0]);
    
    const nextBtn = document.getElementById('next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => alert('次へ（未実装）'));
    }
  }
})();