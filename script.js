// =========================================================
//                  I. KHAI BÁO BIẾN TOÀN CỤC
// =========================================================
const ALL_QUESTION_BANKS = {
    'LS_DL': { bank: typeof questionBank_LS_DL !== 'undefined' ? questionBank_LS_DL : [], config: { C1: 7, N: 3 }, title: 'Lịch sử và Địa lí' },
    'KH': { bank: typeof questionBank_KH !== 'undefined' ? questionBank_KH : [], config: { C1: 7, N: 3 }, title: 'Khoa học' },
    'CN': { bank: typeof questionBank_CN !== 'undefined' ? questionBank_CN : [], config: { C1: 7, N: 3 }, title: 'Công nghệ' }
};

const TOTAL_QUESTIONS = 10;
const PASS_SCORE = 8;
const NUM_EXAMS = 5;
const REPORT_STORAGE_KEY = 'BT_ON_TAP_HISTORY';

let currentSubject = '';
let currentExam = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let isExamSubmitted = false;
let currentExamId = 1;
let shuffledQuestionBank = {};
let studentInfo = { name: '', className: '' };

// DOM Elements
const infoScreen = document.getElementById('info-screen');
const menuScreen = document.getElementById('menu-screen');
const examScreen = document.getElementById('exam-screen');
const reportModal = document.getElementById('report-modal');
const studentNameInput = document.getElementById('student-name');
const studentClassInput = document.getElementById('student-class');
const startMenuBtn = document.getElementById('start-menu-btn');
const infoWarningEl = document.getElementById('info-warning');
const displayInfoEl = document.getElementById('display-info');
const logoutBtn = document.getElementById('logout-btn');
const menuButtons = document.querySelectorAll('.menu-btn[data-subject]');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const questionTextEl = document.getElementById('question-text');
const answerOptionsEl = document.getElementById('answer-options');
const questionHeaderEl = document.getElementById('question-header');
const progressContainerEl = document.getElementById('progress-container');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const submitBtn = document.getElementById('submit-exam-btn');
const resultBoxEl = document.getElementById('result-box');
const currentQuestionInfoEl = document.getElementById('current-question-info');
const examTabsContainer = document.getElementById('exam-selection-tabs');
const correctAnswerDisplayEl = document.getElementById('correct-answer-display');
const correctAnswerTextEl = document.getElementById('correct-answer-text');
const examSubjectTitleEl = document.getElementById('exam-subject-title');
const resultNameClassEl = document.getElementById('result-name-class');
const showReportBtn = document.getElementById('show-report-btn');
const closeReportBtn = document.getElementById('close-report-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const reportTableContainer = document.getElementById('report-table-container');

// =========================================================
//                  II. HÀM TIỆN ÍCH (KHÔI PHỤC)
// =========================================================
function switchScreen(activeScreen) {
    [infoScreen, menuScreen, examScreen, reportModal].forEach(s => s.classList.add('hidden'));
    activeScreen.classList.remove('hidden');
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Logic rút đề chuẩn xác của bạn
function generateExam(examId) {
    const bankData = ALL_QUESTION_BANKS[currentSubject];
    if (!shuffledQuestionBank[currentSubject]) {
        shuffledQuestionBank[currentSubject] = shuffleArray(bankData.bank);
    }
    const bank = shuffledQuestionBank[currentSubject];
    const { config } = bankData;
    let exam = [];
    const C1_Bank = bank.filter(q => q.type === 'C1');
    const N_Bank = bank.filter(q => q.type === 'N');
    
    let N_start = (examId - 1) * config.N;
    for (let i = 0; i < config.N; i++) {
        let idx = (N_start + i) % N_Bank.length;
        if (N_Bank[idx]) exam.push(N_Bank[idx]);
    }
    
    let C1_start = (examId - 1) * config.C1;
    for (let i = 0; i < config.C1; i++) {
        let idx = (C1_start + i) % C1_Bank.length;
        if (C1_Bank[idx]) exam.push(C1_Bank[idx]);
    }
    return shuffleArray(exam);
}

// =========================================================
//                  III. LOGIC HIỂN THỊ (KHÔI PHỤC CHUẨN)
// =========================================================
function setupProgressBar() {
    progressContainerEl.innerHTML = '';
    for (let i = 0; i < currentExam.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'q-number';
        btn.textContent = i + 1;
        btn.onclick = () => { if(!isExamSubmitted) saveUserAnswer(currentQuestionIndex); renderQuestion(i); };
        progressContainerEl.appendChild(btn);
    }
}

function updateProgressBar(index) {
    const btns = document.querySelectorAll('.q-number');
    btns.forEach((btn, i) => {
        btn.classList.remove('active', 'correct', 'incorrect', 'answered');
        if (!isExamSubmitted) {
            if (userAnswers[i] !== null) btn.classList.add('answered');
        } else {
            btn.classList.add(checkAnswer(currentExam[i], userAnswers[i]) ? 'correct' : 'incorrect');
        }
    });
    if(btns[index]) btns[index].classList.add('active');
    currentQuestionInfoEl.textContent = `Câu hỏi | Đề ${currentExamId}: ${index + 1}/${currentExam.length}`;
}

function renderQuestion(index) {
    const question = currentExam[index];
    currentQuestionIndex = index;
    const disabled = isExamSubmitted ? 'disabled' : '';

    questionHeaderEl.textContent = `Câu hỏi ${index + 1}:`;
    questionTextEl.textContent = question.text;
    answerOptionsEl.innerHTML = '';
    correctAnswerDisplayEl.classList.add('hidden');

    if (question.type === 'C1') {
        // KHÔNG XÁO TRỘN ĐÁP ÁN Ở ĐÂY ĐỂ TRÁNH LỖI ĐÁP ÁN SAI
        question.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'option-item';
            label.innerHTML = `<input type="radio" name="q${question.id}" value="${opt}" ${disabled}> ${opt}`;
            answerOptionsEl.appendChild(label);
        });
    } else if (question.type === 'N') {
        const container = document.createElement('div');
        container.className = 'matching-container';
        // Xáo trộn các lựa chọn bên phải chuẩn xác
        const rightOptions = shuffleArray(question.pairs.map(p => p.right));
        question.pairs.forEach(pair => {
            const row = document.createElement('div');
            row.className = 'match-row';
            row.innerHTML = `<span class="left-item">${pair.left}</span>
                <select class="match-select" data-left-item="${pair.left}" ${disabled}>
                    <option value="">-- Chọn --</option>
                    ${rightOptions.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>`;
            container.appendChild(row);
        });
        answerOptionsEl.appendChild(container);
    }
    
    loadUserAnswer(question);
    updateNavigationButtons();
    updateProgressBar(index);
    if (isExamSubmitted) showCorrectAnswer(question);
}

function loadUserAnswer(question) {
    const saved = userAnswers[currentQuestionIndex];
    if (saved === null) return;
    if (question.type === 'C1') {
        const radio = document.querySelector(`input[value="${saved}"]`);
        if (radio) radio.checked = true;
    } else {
        for (const key in saved) {
            const sel = document.querySelector(`select[data-left-item="${key}"]`);
            if (sel) sel.value = saved[key];
        }
    }
}

function saveUserAnswer(index) {
    if (isExamSubmitted) return;
    const question = currentExam[index];
    let answer = null;
    if (question.type === 'C1') {
        const sel = document.querySelector(`input[name="q${question.id}"]:checked`);
        if (sel) answer = sel.value;
    } else {
        const pairs = {};
        const selects = document.querySelectorAll('.match-select');
        selects.forEach(s => { if(s.value) pairs[s.dataset.leftItem] = s.value; });
        if (Object.keys(pairs).length > 0) answer = pairs;
    }
    userAnswers[index] = answer;
    updateProgressBar(index);
}

function checkAnswer(question, userAnswer) {
    if (!userAnswer) return false;
    if (question.type === 'C1') return userAnswer === question.correctAnswer;
    if (Object.keys(userAnswer).length !== question.pairs.length) return false;
    for (const key in userAnswer) {
        const p = question.pairs.find(x => x.left === key);
        if (!p || p.right !== userAnswer[key]) return false;
    }
    return true;
}

function checkExam() {
    isExamSubmitted = true;
    let correct = 0;
    currentExam.forEach((q, i) => { if(checkAnswer(q, userAnswers[i])) correct++; });
    
    // Lưu báo cáo
    const history = JSON.parse(localStorage.getItem(REPORT_STORAGE_KEY)) || [];
    history.push({ name: studentInfo.name, class: studentInfo.className, subject: ALL_QUESTION_BANKS[currentSubject].title, score: correct, date: new Date().toLocaleString('vi-VN') });
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(history));

    resultNameClassEl.textContent = `Thí sinh: ${studentInfo.name} - Lớp ${studentInfo.className}`;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('incorrect-count').textContent = TOTAL_QUESTIONS - correct;
    resultBoxEl.classList.remove('hidden');
    const status = document.getElementById('exam-status');
    status.textContent = correct >= PASS_SCORE ? "CHÚC MỪNG, ĐẠT YÊU CẦU!" : "CHƯA ĐẠT";
    status.style.color = correct >= PASS_SCORE ? 'green' : 'red';
    renderQuestion(currentQuestionIndex);
}

function showCorrectAnswer(question) {
    let text = question.type === 'C1' ? question.correctAnswer : question.pairs.map(p => `${p.left} -> ${p.right}`).join('; ');
    correctAnswerTextEl.textContent = text;
    correctAnswerDisplayEl.classList.remove('hidden');
}

// =========================================================
//                  IV. SỰ KIỆN & KHỞI TẠO
// =========================================================
function initExam(examId = 1) {
    currentExamId = examId;
    isExamSubmitted = false;
    currentExam = generateExam(examId);
    userAnswers = Array(TOTAL_QUESTIONS).fill(null);
    resultBoxEl.classList.add('hidden');
    document.querySelectorAll('.exam-tab').forEach(t => t.classList.toggle('active', parseInt(t.dataset.examId) === examId));
    setupProgressBar();
    renderQuestion(0);
}

function renderReportTable() {
    const history = JSON.parse(localStorage.getItem(REPORT_STORAGE_KEY)) || [];
    if(history.length === 0) { reportTableContainer.innerHTML = "<p>Chưa có dữ liệu.</p>"; return; }
    let html = `<table><thead><tr><th>Họ Tên</th><th>Lớp</th><th>Môn</th><th>Điểm</th><th>Ngày</th></tr></thead><tbody>`;
    history.sort((a,b) => b.score - a.score).forEach(r => {
        html += `<tr><td>${r.name}</td><td>${r.class}</td><td>${r.subject}</td><td>${r.score}/10</td><td>${r.date}</td></tr>`;
    });
    reportTableContainer.innerHTML = html + "</tbody></table>";
}

studentNameInput.oninput = studentClassInput.oninput = () => { startMenuBtn.disabled = !(studentNameInput.value.trim() && studentClassInput.value.trim()); };
startMenuBtn.onclick = () => { studentInfo = { name: studentNameInput.value.trim(), className: studentClassInput.value.trim() }; displayInfoEl.textContent = `Thí sinh: ${studentInfo.name} - Lớp ${studentInfo.className}`; switchScreen(menuScreen); };
logoutBtn.onclick = () => { studentNameInput.value = studentClassInput.value = ''; startMenuBtn.disabled = true; switchScreen(infoScreen); };
menuButtons.forEach(b => b.onclick = () => { shuffledQuestionBank = {}; currentSubject = b.dataset.subject; examSubjectTitleEl.textContent = `Bài thi: ${ALL_QUESTION_BANKS[currentSubject].title}`; switchScreen(examScreen); initExam(1); });
showReportBtn.onclick = () => { renderReportTable(); switchScreen(reportModal); };
closeReportBtn.onclick = () => switchScreen(menuScreen);
clearHistoryBtn.onclick = () => { if(confirm("Xóa hết lịch sử?")) { localStorage.removeItem(REPORT_STORAGE_KEY); renderReportTable(); } };
backToMenuBtn.onclick = () => { if(!isExamSubmitted) saveUserAnswer(currentQuestionIndex); switchScreen(menuScreen); };
nextBtn.onclick = () => { saveUserAnswer(currentQuestionIndex); if(currentQuestionIndex < currentExam.length - 1) renderQuestion(currentQuestionIndex + 1); };
prevBtn.onclick = () => { saveUserAnswer(currentQuestionIndex); if(currentQuestionIndex > 0) renderQuestion(currentQuestionIndex - 1); };
submitBtn.onclick = () => { if(confirm('Kết thúc bài thi?')) { saveUserAnswer(currentQuestionIndex); checkExam(); } };
document.getElementById('select-new-exam-btn').onclick = () => initExam(currentExamId);
examTabsContainer.onclick = (e) => { if(e.target.classList.contains('exam-tab')) { if(!isExamSubmitted) saveUserAnswer(currentQuestionIndex); initExam(parseInt(e.target.dataset.examId)); } };

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === currentExam.length - 1;
    submitBtn.style.display = isExamSubmitted ? 'none' : 'block';
}

switchScreen(infoScreen);