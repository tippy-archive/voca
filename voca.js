let wordData = [];
let isKoHidden = false;

let currentWords = [];
let isPlayingAll = false;
let currentPlayIndex = 0;

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
}

function openStudyScreen(day) {
    mainScreen.classList.remove('active');
    studyScreen.classList.add('active');
    studyTitle.textContent = `Day ${day}`;
    isKoHidden = false;
    currentPlayIndex = 0; // 새로운 Day에 들어오면 인덱스 초기화
    
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
    const wordItem = e.target.closest('.word-item'); // 클릭한 요소의 부모인 .word-item 찾기
    if (!wordItem) return;

    // 모든 단어 요소들 중 현재 클릭한 요소가 몇 번째인지 인덱스 찾기
    const wordElements = Array.from(document.querySelectorAll('.word-item'));
    const clickedIndex = wordElements.indexOf(wordItem);

    if (e.target.classList.contains('en-box')) {
        // 인덱스 업데이트: 이제 전체 재생을 누르면 여기서부터 시작합니다.
        currentPlayIndex = clickedIndex; 
        
        // 강조 효과 적용
        highlightWord(clickedIndex);
        
        // 음성 출력
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
        
        // 주의: currentPlayIndex를 0으로 초기화하는 코드를 삭제했습니다.
        // 덕분에 개별 클릭으로 설정된 인덱스부터 시작합니다.
        playNextWord();
    }
};

function playNextWord() {
    if (!isPlayingAll || currentPlayIndex >= currentWords.length) {
        resetPlayAll();
        return;
    }

    // 강조 함수 호출
    highlightWord(currentPlayIndex);

    const text = currentWords[currentPlayIndex].en;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langSelect.value;
    
    utterance.onend = () => {
        currentPlayIndex++; // 다음 단어로 인덱스 증가
        const delayMs = parseInt(delaySelect.value, 10);
        setTimeout(playNextWord, delayMs); 
    };

    utterance.onerror = () => {
        currentPlayIndex++;
        playNextWord();
    };

    window.speechSynthesis.speak(utterance);
}

function resetPlayAll() {
    isPlayingAll = false;
    if (playAllBtn) {
        playAllBtn.textContent = '▶ 전체 재생';
        playAllBtn.classList.remove('playing');
    }
    document.querySelectorAll('.word-item').forEach(el => el.classList.remove('playing-now'));
}

function resetPlayAll() {
    isPlayingAll = false;
    if (playAllBtn) {
        playAllBtn.textContent = '▶ 전체 재생';
        playAllBtn.classList.remove('playing');
    }
}

function speak(text) {
    if (isPlayingAll) {
        resetPlayAll();
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = langSelect.value; 
    
    window.speechSynthesis.speak(utterance);
}

// 1. 스크롤 감지 및 버튼 표시/숨김
window.onscroll = function() {
    // 페이지가 400px 이상 내려갔는지 확인
    if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
        goToTopBtn.classList.add('show');
    } else {
        goToTopBtn.classList.remove('show');
    }
};

// 2. 버튼 클릭 시 최상단으로 부드럽게 이동
goToTopBtn.onclick = function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // 부드러운 스크롤 효과
    });
};

loadData();