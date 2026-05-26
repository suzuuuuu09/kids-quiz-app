function toggleView(showSubjectMenu) {
    const mainMenu = document.getElementById("main-menu-view");
    const subjectMenu = document.getElementById("subject-select-view");
    
    if (showSubjectMenu) {
        mainMenu.classList.add("hidden");
        subjectMenu.classList.remove("hidden");
    } else {
        mainMenu.classList.remove("hidden");
        subjectMenu.classList.add("hidden");
    }
}

function selectMode(mode) {
    window.location.href = `quiz.html?mode=${mode}`;
}

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
  } else if (mode === 'shakai') {
    targetJson = 'data/society.json';
  } else if (mode === 'rika') {
    targetJson = 'data/science.json';
  } else if (mode === 'eigo') {
    targetJson = 'data/english.json';
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
      const allButtons = choicesEl.querySelectorAll('button');
      allButtons.forEach(b => b.disabled = true);

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