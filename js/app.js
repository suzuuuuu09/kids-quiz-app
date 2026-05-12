// シンプルなクイズ読み込みと表示（デモ用）
async function loadQuestions() {
  try {
    const res = await fetch('data/japanese.json');
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
  questionEl.textContent = q.question;
  choicesEl.innerHTML = '';
  q.choices.forEach((c, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
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
  const qs = await loadQuestions();
  if (qs.length) showQuestion(qs[0]);
  document.getElementById('next').addEventListener('click', () => alert('次へ（未実装）'));
})();
