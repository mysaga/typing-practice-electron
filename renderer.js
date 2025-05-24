const { ipcRenderer } = require('electron');

const textDisplay = document.getElementById('textDisplay');
const typingInput = document.getElementById('typingInput');
const charCountDisplay = document.getElementById('charCount');
const accuracy = document.getElementById('accuracy');
const typingSpeed = document.getElementById('typingSpeed');
const elapsedTime = document.getElementById('elapsedTime');
const historyList = document.getElementById('historyList');
const categoryButtons = document.querySelectorAll('.category-btn');
const modeButtons = document.querySelectorAll('.mode-btn');
const timerDisplay = document.getElementById('timer');
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const passwordSubmit = document.getElementById('passwordSubmit');
const passwordError = document.getElementById('passwordError');

let config;
let timer;
let timerMinutes;
let words = {};
let sentences = {};
let currentMode = 'word';
let currentCategory = 'country';
let startTime;
let charCount = 0;
let correctCount = 0;
let practiceHistory = [];

// 설정 로드
ipcRenderer.send('get-config');

ipcRenderer.on('config-loaded', (event, configData) => {
    config = configData;
    initializeApp();
});

function initializeApp() {
    // 앱 타이틀 설정
    document.querySelector('h1').textContent = config.General.app_title;
    
    // 타이머 설정
    timerMinutes = parseInt(config.General.timer_minutes);
    updateTimerDisplay();
    
    // 단어 목록 설정
    words = {
        country: config.Words.country.split(','),
        city: config.Words.city.split(','),
        plant: config.Words.plant.split(','),
        animal: config.Words.animal.split(',')
    };
    
    // 문장 목록 설정
    sentences = {
        country: Object.entries(config.Sentences)
            .filter(([key]) => key.startsWith('country'))
            .map(([_, value]) => value),
        city: Object.entries(config.Sentences)
            .filter(([key]) => key.startsWith('city'))
            .map(([_, value]) => value),
        plant: Object.entries(config.Sentences)
            .filter(([key]) => key.startsWith('plant'))
            .map(([_, value]) => value),
        animal: Object.entries(config.Sentences)
            .filter(([key]) => key.startsWith('animal'))
            .map(([_, value]) => value)
    };

    console.log('문장 목록:', sentences); // 디버깅용 로그
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 텍스트 표시
    updateTextDisplay();
}

function setupEventListeners() {
    // 모드 버튼 이벤트
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateTextDisplay();
        });
    });

    // 카테고리 버튼 이벤트
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            updateTextDisplay();
        });
    });

    // 입력 이벤트
    typingInput.addEventListener('input', handleInput);
    typingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleEnter();
        }
    });

    // 암호 입력 이벤트
    passwordSubmit.addEventListener('click', () => {
        if (passwordInput.value === config.General.password) {
            passwordModal.style.display = 'none';
            passwordInput.value = '';
            passwordError.style.display = 'none';
            resetPractice();
        } else {
            passwordError.style.display = 'block';
            passwordError.textContent = '암호가 일치하지 않습니다. 다시 입력해주세요.';
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordSubmit.click();
        }
    });
}

function updateTextDisplay() {
    if (currentMode === 'word') {
        const wordList = words[currentCategory];
        textDisplay.textContent = wordList[Math.floor(Math.random() * wordList.length)];
    } else {
        const sentenceList = sentences[currentCategory];
        console.log('현재 카테고리:', currentCategory); // 디버깅용 로그
        console.log('문장 목록:', sentenceList); // 디버깅용 로그
        if (sentenceList && sentenceList.length > 0) {
            textDisplay.textContent = sentenceList[Math.floor(Math.random() * sentenceList.length)];
        } else {
            textDisplay.textContent = '문장이 없습니다.';
        }
    }
}

function handleInput(e) {
    if (!startTime) {
        startTime = new Date();
        startTimer();
    }

    const inputText = e.target.value;
    const targetText = textDisplay.textContent;
    
    charCount = inputText.length;
    correctCount = 0;
    
    for (let i = 0; i < inputText.length; i++) {
        if (inputText[i] === targetText[i]) {
            correctCount++;
        }
    }

    updateStats();
}

function handleEnter() {
    const inputText = typingInput.value;
    const targetText = textDisplay.textContent;
    
    if (inputText === targetText) {
        // 연습 기록 추가
        const elapsedSeconds = (new Date() - startTime) / 1000;
        const accuracyValue = Math.round((correctCount / charCount) * 100);
        const typingSpeedValue = Math.round((charCount / elapsedSeconds) * 60);
        
        practiceHistory.unshift({
            date: new Date().toLocaleString(),
            mode: currentMode,
            category: currentCategory,
            text: targetText,
            accuracy: accuracyValue,
            speed: typingSpeedValue
        });
        
        // 기록 표시 업데이트
        updateHistoryDisplay();
        
        // 다음 텍스트로 이동
        typingInput.value = '';
        updateTextDisplay();
    }
}

function updateStats() {
    const elapsedSeconds = (new Date() - startTime) / 1000;
    const accuracyValue = charCount > 0 ? Math.round((correctCount / charCount) * 100) : 0;
    const typingSpeedValue = Math.round((charCount / elapsedSeconds) * 60);
    
    charCountDisplay.textContent = charCount;
    accuracy.textContent = accuracyValue;
    typingSpeed.textContent = typingSpeedValue;
    elapsedTime.textContent = Math.round(elapsedSeconds);
}

function startTimer() {
    let timeLeft = timerMinutes * 60;
    
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            showPasswordModal();
        }
    }, 1000);
}

function updateTimerDisplay(timeLeft = timerMinutes * 60) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showPasswordModal() {
    passwordModal.style.display = 'flex';
    passwordInput.value = ''; // 입력창 초기화
    passwordInput.focus();
    passwordError.style.display = 'none'; // 에러 메시지 초기화
}

function resetPractice() {
    clearInterval(timer);
    startTime = null;
    charCount = 0;
    correctCount = 0;
    typingInput.value = '';
    
    // 통계 초기화
    charCountDisplay.textContent = '0';
    accuracy.textContent = '0';
    typingSpeed.textContent = '0';
    elapsedTime.textContent = '0';
    
    // 연습 기록 초기화
    practiceHistory = [];
    updateHistoryDisplay();
    
    startTimer();
    updateTextDisplay();
}

// 기록 표시 업데이트
function updateHistoryDisplay() {
    historyList.innerHTML = practiceHistory.map(result => `
        <div class="result-item">
            <div><strong>${result.date}</strong></div>
            <div>${result.mode === 'word' ? '단어' : '문장'} 연습 - ${result.category}</div>
            <div>텍스트: ${result.text}</div>
            <div>정확도: ${result.accuracy}%, 속도: ${result.speed} 타/분</div>
        </div>
    `).join('');
}

function getRandomText() {
    return textSets[currentMode][currentCategory][Math.floor(Math.random() * textSets[currentMode][currentCategory].length)];
}

function updateText() {
    currentText = getRandomText();
    textDisplay.textContent = currentText;
    typingInput.value = '';
    startTime = null;
    charCount = 0;
    correctCount = 0;
    elapsedSeconds = 0;
    typingSpeed.textContent = '0';
    elapsedTime.textContent = '0';
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    updateStats();
}

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        showPasswordModal();
    }
    timeLeft--;

    // 경과 시간과 타자 속도 업데이트
    elapsedSeconds++;
    elapsedTime.textContent = elapsedSeconds;
    
    // 타자 속도 계산 (분당 타자수)
    if (elapsedSeconds > 0) {
        const speed = Math.round((correctChars / elapsedSeconds) * 60);
        typingSpeed.textContent = speed;
    }
} 