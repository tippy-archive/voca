let wordData = [];
let isKoHidden = false;

let currentWords = [];
let isPlayingAll = false;
let currentPlayIndex = 0;

// 모바일 브라우저 음성 목록 저장을 위한 변수 추가
let availableVoices = [];

const mainScreen = document.getElementById('mainScreen');
const studyScreen = document.getElementById('studyScreen');
const dayGrid = document.getElementById('dayGrid');
const wordListContainer = document.getElementById('wordList');
const studyTitle = document.getElementById('studyTitle');
const toggleBtn = document.getElementById('toggleBtn');
const backBtn = document.getElementById('backBtn');
const playAllBtn = document.getElementById('playAllBtn');
const delaySelect = document.getElementById('delaySelect');
const langSelect = document.getElementById('langSelect');
const goToTopBtn = document.getElementById('goToTopBtn');

// --- [추가됨] 음성 목록 미리 로드하기 ---
function populateVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}
// 브라우저가 음성 합성을 지원하면 목록 로드 시도
if (window.speechSynthesis) {
    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }
}
// ----------------------------------------

async function loadData() {
    try {
        const response = await fetch('voca.json');
        wordData = await response.json();
        initMainScreen();
    } catch (e) {
        dayGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; font-size:0.8rem; color:red;">JSON 데이터를 불러올 수 없습니다.</p>`;
    }
}

function initMainScreen() {
    const uniqueDays = [...new Set(wordData.map(i => i.day))].sort((a, b) => a - b);
    dayGrid.innerHTML = '';
    uniqueDays.forEach(day => {
        const btn = document.createElement('div');
        btn.className = 'day-btn';
        btn.textContent = `Day ${day}`;
        btn.onclick = () => openStudyScreen(day);
        dayGrid.appendChild(btn);
    });

renderTodaySection(uniqueDays);

    dayGrid.innerHTML = '';
    uniqueDays.forEach(day => {
        const btn = document.createElement('div');
        btn.className = 'day-btn';
        btn.textContent = `Day ${day}`;
        btn.onclick = () => openStudyScreen(day);
        dayGrid.appendChild(btn);
    });
}

function renderTodaySection(uniqueDays) {
    const todaySection = document.getElementById('todaySection');
    const todayDate = new Date().getDate(); // 현재 접속한 날의 일(Day) 가져오기 (1~31)

    let contentHTML = `<div class="today-title">📅 오늘의 단어</div>`;
    
    if (todayDate === 31) {
        // 31일인 경우
        contentHTML += `<button class="today-btn rest-day">오늘은 쉬는날 🎉</button>`;
        todaySection.innerHTML = contentHTML;
    } else {
        // 해당 Day의 데이터가 json에 실제로 존재하는지 안전장치 확인
        const isDataExist = uniqueDays.includes(todayDate);
        
        if (isDataExist) {
            contentHTML += `<button class="today-btn" onclick="openStudyScreen(${todayDate})">Day ${todayDate} 바로가기 ▶</button>`;
        } else {
            contentHTML += `<button class="today-btn rest-day">Day ${todayDate} 단어 준비 중</button>`;
        }
        todaySection.innerHTML = contentHTML;
    }
}

function openStudyScreen(day) {
    mainScreen.classList.remove('active');
    studyScreen.classList.add('active');
    studyTitle.textContent = `Day ${day}`;
    isKoHidden = false;
    currentPlayIndex = 0;
    
    currentWords = wordData.filter(i => i.day === day);
    renderWords(currentWords);
    resetPlayAll();
}

backBtn.onclick = () => {
    window.speechSynthesis.cancel();
    resetPlayAll();
    studyScreen.classList.remove('active');
    mainScreen.classList.add('active');
};

function renderWords(words) {
    wordListContainer.innerHTML = '';
    words.forEach(item => {
        const wordItem = document.createElement('div');
        wordItem.className = `word-item level-${item.level}`;
        wordItem.innerHTML = `<div class="en-box">${item.en}</div><div class="ko-box">${item.ko}</div>`;
        wordListContainer.appendChild(wordItem);
    });
}

toggleBtn.onclick = () => {
    isKoHidden = !isKoHidden;
    toggleBtn.textContent = isKoHidden ? '한국어 보이기' : '한국어 가리기';
    toggleBtn.classList.toggle('active', isKoHidden);
    document.querySelectorAll('.ko-box').forEach(el => el.classList.toggle('hidden', isKoHidden));
};

wordListContainer.onclick = (e) => {
    const wordItem = e.target.closest('.word-item');
    if (!wordItem) return;

    const wordElements = Array.from(document.querySelectorAll('.word-item'));
    const clickedIndex = wordElements.indexOf(wordItem);

    if (e.target.classList.contains('en-box')) {
        currentPlayIndex = clickedIndex; 
        highlightWord(clickedIndex);
        speak(e.target.innerText);
    }
    
    if (e.target.classList.contains('ko-box') && isKoHidden) {
        e.target.classList.toggle('hidden');
    }
};

function highlightWord(index) {
    const wordElements = document.querySelectorAll('.word-item');
    wordElements.forEach(el => el.classList.remove('playing-now'));
    
    const currentEl = wordElements[index];
    if (currentEl) {
        currentEl.classList.add('playing-now');
        currentEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

playAllBtn.onclick = () => {
    if (isPlayingAll) {
        window.speechSynthesis.cancel();
        resetPlayAll();
    } else {
        isPlayingAll = true;
        playAllBtn.textContent = '■ 재생 중지';
        playAllBtn.classList.add('playing');
        playNextWord();
    }
};

function playNextWord() {
    if (!isPlayingAll || currentPlayIndex >= currentWords.length) {
        resetPlayAll();
        return;
    }

    highlightWord(currentPlayIndex);

    const text = currentWords[currentPlayIndex].en;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // --- [수정됨] 언어 및 보이스 명시적 할당 ---
    const selectedLang = langSelect.value || 'en-US';
    utterance.lang = selectedLang;
    
    if (availableVoices.length > 0) {
        const voice = availableVoices.find(v => v.lang.includes(selectedLang) || v.lang.includes(selectedLang.replace('-', '_')));
        if (voice) utterance.voice = voice;
    }
    // -------------------------------------------
    
    utterance.onend = () => {
        currentPlayIndex++;
        const delayMs = parseInt(delaySelect.value, 10);
        setTimeout(playNextWord, delayMs); 
    };

    utterance.onerror = (e) => {
        console.warn('Speech error:', e);
        currentPlayIndex++;
        playNextWord();
    };

    window.speechSynthesis.speak(utterance);
}

// --- [수정됨] 중복 선언된 resetPlayAll 함수를 하나로 통합 ---
function resetPlayAll() {
    isPlayingAll = false;
    if (playAllBtn) {
        playAllBtn.textContent = '▶ 전체 재생';
        playAllBtn.classList.remove('playing');
    }
    document.querySelectorAll('.word-item').forEach(el => el.classList.remove('playing-now'));
}
// -----------------------------------------------------------

function speak(text) {
    if (isPlayingAll) {
        resetPlayAll();
    }
    
    if (!window.speechSynthesis) {
        alert("이 브라우저는 음성 합성을 지원하지 않습니다.");
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // --- [수정됨] 언어 및 보이스 명시적 할당 ---
    const selectedLang = langSelect.value || 'en-US';
    utterance.lang = selectedLang; 
    
    if (availableVoices.length > 0) {
        const voice = availableVoices.find(v => v.lang.includes(selectedLang) || v.lang.includes(selectedLang.replace('-', '_')));
        if (voice) utterance.voice = voice;
    }
    // -------------------------------------------
    
    window.speechSynthesis.speak(utterance);
}

window.onscroll = function() {
    if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
        goToTopBtn.classList.add('show');
    } else {
        goToTopBtn.classList.remove('show');
    }
};

goToTopBtn.onclick = function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

loadData();