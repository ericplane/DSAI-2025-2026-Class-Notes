// Lightweight quiz engine loaded on demand
// Exposes window.Quiz.open(quizPath, opts)

(function () {
  const state = {
    quiz: null,
    current: 0,
    answers: {},
    startTime: null,
    settings: null,
    basePath: null,
  };

  const el = {
    backdrop: null,
    modal: null,
    header: null,
    body: null,
    footer: null,
    progressBar: null,
  };

  const toArray = (nodelist) => Array.prototype.slice.call(nodelist);

  function ensureStylesheet() {
    if (!document.querySelector('link[rel="stylesheet"][href$="quiz.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = (window.__QUIZ_BASE_PATH__ || './') + 'quiz.css';
      document.head.appendChild(link);
    }
  }

  function createOverlay(title) {
    const backdrop = document.createElement('div');
    backdrop.className = 'quiz-backdrop';
    backdrop.tabIndex = -1;

    const modal = document.createElement('div');
    modal.className = 'quiz-modal';

    const header = document.createElement('div');
    header.className = 'quiz-header';
    const h = document.createElement('h3');
    h.className = 'quiz-title';
    h.textContent = title || 'Quiz';
    const close = document.createElement('button');
    close.className = 'quiz-close';
    close.setAttribute('aria-label', 'Close quiz');
    close.innerHTML = '✕';
    close.addEventListener('click', closeQuiz);
    header.appendChild(h);
    header.appendChild(close);

    const progress = document.createElement('div');
    progress.className = 'quiz-progress';
    const bar = document.createElement('div');
    progress.appendChild(bar);

    const body = document.createElement('div');
    body.className = 'quiz-body';

    const footer = document.createElement('div');
    footer.className = 'quiz-footer';

    const left = document.createElement('div');
    left.className = 'quiz-buttons';
    const right = document.createElement('div');
    right.className = 'quiz-buttons';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'quiz-btn';
    btnPrev.textContent = 'Back';
    btnPrev.addEventListener('click', () => goto(state.current - 1));

    const btnNext = document.createElement('button');
    btnNext.className = 'quiz-btn';
    btnNext.textContent = 'Next';
    btnNext.addEventListener('click', () => goto(state.current + 1));

    const btnSubmit = document.createElement('button');
    btnSubmit.className = 'quiz-btn primary';
    btnSubmit.textContent = 'Submit';
    btnSubmit.addEventListener('click', submit);

    left.appendChild(btnPrev);
    left.appendChild(btnNext);
    right.appendChild(btnSubmit);
    footer.appendChild(left);
    footer.appendChild(right);

    modal.appendChild(header);
    modal.appendChild(progress);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);

    el.backdrop = backdrop;
    el.modal = modal;
    el.header = header;
    el.body = body;
    el.footer = footer;
    el.progressBar = bar;

    document.body.appendChild(backdrop);

    // Close on ESC
    const esc = (e) => { if (e.key === 'Escape') closeQuiz(); };
    backdrop.addEventListener('keydown', esc);
    setTimeout(() => backdrop.focus(), 0);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function normalizeQuiz(quiz) {
    if (!quiz || !Array.isArray(quiz.questions)) throw new Error('Invalid quiz file');
    const settings = Object.assign({
      shuffleQuestions: true,
      shuffleOptions: true,
      showImmediateFeedback: true,
    }, quiz.settings || {});

    // Shallow copy to avoid mutating JSON
    let questions = quiz.questions.map(q => ({ ...q }));
    if (settings.shuffleQuestions) questions = shuffle(questions);
    if (settings.shuffleOptions) {
      questions.forEach(q => {
        if (q.options) q.options = shuffle(q.options);
      });
    }
    return { ...quiz, questions, settings };
  }

  function renderQuestion(i) {
    const q = state.quiz.questions[i];
    el.body.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'quiz-question';

    const prompt = document.createElement('div');
    prompt.className = 'quiz-prompt';
    prompt.innerHTML = (window.showdown ? new showdown.Converter().makeHtml(q.prompt || '') : q.prompt || '');
    container.appendChild(prompt);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'quiz-options';
    container.appendChild(optionsWrap);

    const type = q.type || 'single';
    const selected = state.answers[q.id] || (type === 'multi' ? [] : null);

    if (type === 'single' || type === 'multi' || q.options) {
      const isMulti = type === 'multi';
      optionsWrap.setAttribute('role', isMulti ? 'group' : 'radiogroup');
      (q.options || []).forEach(opt => {
        const optEl = document.createElement('div');
        optEl.className = 'quiz-option';
        optEl.setAttribute('tabindex', '0');
        optEl.setAttribute('role', isMulti ? 'checkbox' : 'radio');
        const checked = isMulti ? (selected || []).includes(opt.id) : selected === opt.id;
        optEl.setAttribute('aria-checked', checked ? 'true' : 'false');

        const input = document.createElement('input');
        input.type = isMulti ? 'checkbox' : 'radio';
        input.name = q.id;
        input.value = opt.id;
        input.checked = checked;
        input.style.marginTop = '0.25rem';

        const label = document.createElement('div');
        label.innerHTML = (window.showdown ? new showdown.Converter().makeHtml(opt.text || '') : (opt.text || ''));

        optEl.addEventListener('click', () => selectOption(q, opt.id, isMulti, optEl));
        input.addEventListener('click', (e) => { e.stopPropagation(); selectOption(q, opt.id, isMulti, optEl); });
        optEl.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); selectOption(q, opt.id, isMulti, optEl); }
        });

        optEl.appendChild(input);
        optEl.appendChild(label);
        optionsWrap.appendChild(optEl);
      });
    } else if (type === 'boolean') {
      q.options = [
        { id: 'true', text: 'True', isCorrect: q.answer === true },
        { id: 'false', text: 'False', isCorrect: q.answer === false },
      ];
      return renderQuestion(i);
    } else if (type === 'short_text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = selected || '';
      input.className = 'quiz-input';
      input.placeholder = 'Type your answer…';
      input.addEventListener('input', () => { state.answers[q.id] = input.value; persistProgress(); });
      optionsWrap.appendChild(input);
    }

    el.body.appendChild(container);

    // Explanation (if immediate mode and answered)
    if (state.settings.showImmediateFeedback && state.answers[q.id] != null) {
      const correct = isCorrect(q, state.answers[q.id]);
      const exp = document.createElement('div');
      exp.className = 'quiz-explanation';
      exp.innerHTML = `<strong>${correct ? 'Correct' : 'Incorrect'}.</strong> ` +
        (window.showdown ? new showdown.Converter().makeHtml(q.explanation || '') : (q.explanation || ''));
      el.body.appendChild(exp);
    }

    // MathJax render
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([el.body]).catch(() => {});
    }

    updateProgress();
  }

  function selectOption(q, optId, isMulti, optEl) {
    if (isMulti) {
      const current = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
      const idx = current.indexOf(optId);
      if (idx === -1) current.push(optId); else current.splice(idx, 1);
      state.answers[q.id] = current;
      // update UI
      toArray(el.body.querySelectorAll('.quiz-option')).forEach(node => node.setAttribute('aria-checked', 'false'));
      toArray(el.body.querySelectorAll('input[type="checkbox"]')).forEach(input => {
        input.checked = current.includes(input.value);
        input.parentElement.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      });
    } else {
      state.answers[q.id] = optId;
      // update UI
      toArray(el.body.querySelectorAll('.quiz-option')).forEach(node => node.setAttribute('aria-checked', 'false'));
      toArray(el.body.querySelectorAll('input[type="radio"]')).forEach(input => {
        input.checked = (input.value === optId);
        input.parentElement.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      });
    }
    persistProgress();
    if (state.settings.showImmediateFeedback) {
      // re-render to show explanation
      renderQuestion(state.current);
    }
  }

  function isCorrect(q, answer) {
    if (q.type === 'multi') {
      const correctIds = (q.options || []).filter(o => o.isCorrect).map(o => o.id).sort();
      const chosen = (answer || []).slice().sort();
      return JSON.stringify(correctIds) === JSON.stringify(chosen);
    }
    if (q.type === 'short_text') {
      const acc = (q.answer && q.answer.acceptable) || [];
      const norm = (s) => String(s || '').trim().toLowerCase();
      return acc.map(norm).includes(norm(answer));
    }
    if (q.type === 'boolean') {
      const val = answer === 'true' || answer === true;
      return Boolean(q.answer) === Boolean(val);
    }
    // single
    const correct = (q.options || []).find(o => o.isCorrect);
    return correct && correct.id === answer;
  }

  function goto(i) {
    const max = state.quiz.questions.length - 1;
    state.current = Math.max(0, Math.min(max, i));
    renderQuestion(state.current);
    persistProgress();
  }

  function updateProgress() {
    const total = state.quiz.questions.length;
    const pct = ((state.current + 1) / total) * 100;
    el.progressBar.style.width = pct + '%';
  }

  function submit() {
    const total = state.quiz.questions.length;
    let score = 0;
    state.quiz.questions.forEach(q => {
      if (isCorrect(q, state.answers[q.id])) score += (q.points || 1);
    });
    const pointsTotal = state.quiz.questions.reduce((s, q) => s + (q.points || 1), 0);
    const duration = Math.floor((Date.now() - (state.startTime || Date.now())) / 1000);

    // Persist attempt
    if (state.quiz.lecturePath) {
      const key = `quiz:${state.quiz.lecturePath}:attempts`;
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.push({ timestamp: Date.now(), score, pointsTotal, percent: Math.round((score/pointsTotal)*100), durationSeconds: duration });
      localStorage.setItem(key, JSON.stringify(prev));
    }

    // Results view
    const res = document.createElement('div');
    res.className = 'quiz-question';
    res.innerHTML = `<h3>Results</h3>
      <p><strong>Score:</strong> ${score} / ${pointsTotal}</p>
      <p><strong>Time:</strong> ${duration}s</p>`;
    el.body.innerHTML = '';
    el.body.appendChild(res);

    // Detailed review
    state.quiz.questions.forEach((q, idx) => {
      const block = document.createElement('div');
      block.className = 'quiz-question';
      const correct = isCorrect(q, state.answers[q.id]);
      block.innerHTML = `<div class="quiz-prompt">Q${idx+1}. ${(q.prompt || '')}</div>
        <div><strong>${correct ? 'Correct' : 'Incorrect'}</strong></div>`;
      if (q.explanation) {
        const exp = document.createElement('div');
        exp.className = 'quiz-explanation';
        exp.innerHTML = (window.showdown ? new showdown.Converter().makeHtml(q.explanation) : q.explanation);
        block.appendChild(exp);
      }
      el.body.appendChild(block);
    });

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([el.body]).catch(() => {});
    }
  }

  function persistProgress() {
    if (!state.quiz || !state.quiz.lecturePath) return;
    const key = `quiz:${state.quiz.lecturePath}:inProgress`;
    const data = { current: state.current, answers: state.answers };
    localStorage.setItem(key, JSON.stringify(data));
  }

  function restoreProgress(lecturePath) {
    const key = `quiz:${lecturePath}:inProgress`;
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      if (data) {
        state.current = data.current || 0;
        state.answers = data.answers || {};
      }
    } catch {}
  }

  function closeQuiz() {
    if (el.backdrop) {
      el.backdrop.remove();
    }
    // Clear local in-progress state on close? Keep to allow resume.
  }

  async function loadQuiz(basePath, quizPath) {
    const res = await fetch(basePath + quizPath);
    if (!res.ok) throw new Error('Quiz file not found');
    return res.json();
  }

  async function open(quizPath, opts) {
    ensureStylesheet();
    const basePath = (typeof opts?.basePath === 'string') ? opts.basePath : (window.__QUIZ_BASE_PATH__ || './');
    state.basePath = basePath;
    const data = await loadQuiz(basePath, quizPath);
    const normalized = normalizeQuiz(data);
    state.quiz = normalized;
    state.settings = normalized.settings;
    state.current = 0;
    state.answers = {};
    state.startTime = Date.now();

    if (normalized.lecturePath) restoreProgress(normalized.lecturePath);

    createOverlay(normalized.title || 'Quiz');
    renderQuestion(state.current);
  }

  window.Quiz = { open };
})();
