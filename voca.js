let wordData = [];
let isKoHidden = false;
let currentWords = [];
let activeWords = [];
let isPlayingAll = false;
let currentPlayIndex = 0;
let availableVoices = [];
let unknownWords = JSON.parse(localStorage.getItem('unknownWords')) || {}; // { "apple": true, "banana": true } 형식
let isFilterMode = false;

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
const collectBtn = document.getElementById('collectBtn');
const filterUnknownBtn = document.getElementById('filterUnknownBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

function populateVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}
if (window.speechSynthesis) {
    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }
}

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
    const todayDate = new Date().getDate();

    let contentHTML = `<div class="today-title">📅 오늘의 단어</div>`;

    if (todayDate === 31) {
        contentHTML += `<button class="today-btn rest-day">오늘은 쉬는날 🎉</button>`;
        todaySection.innerHTML = contentHTML;
    } else {
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

    if (collectBtn) collectBtn.style.display = 'none';
    toggleBtn.textContent = '한국어 가리기';
    toggleBtn.classList.remove('active');

    currentWords = wordData.filter(i => i.day === day);
    activeWords = [...currentWords];
    renderWords(activeWords);
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

    const displayWords = isFilterMode ?
        words.filter(item => unknownWords[item.en]) :
        words;

    if (displayWords.length === 0 && isFilterMode) {
        wordListContainer.innerHTML = '<p style="text-align:center; padding:20px;">체크된 단어가 없습니다.</p>';
        return;
    }

    displayWords.forEach(item => {
        const isChecked = unknownWords[item.en] ? '⭐' : '☆';
        const wordItem = document.createElement('div');
        wordItem.className = `word-item level-${item.level}`;

        const hiddenClass = isKoHidden ? 'hidden' : '';

        wordItem.innerHTML = `
            <div class="check-box" data-en="${item.en}">${isChecked}</div>
            <div class="en-box">${item.en}</div>
            <div class="ko-box ${hiddenClass}">${item.ko}</div>
        `;
        wordListContainer.appendChild(wordItem);
    });

    activeWords = displayWords;
}

toggleBtn.onclick = () => {
    isKoHidden = !isKoHidden;
    toggleBtn.textContent = isKoHidden ? '한국어 보이기' : '한국어 가리기';
    toggleBtn.classList.toggle('active', isKoHidden);

    if (isKoHidden) {
        document.querySelectorAll('.ko-box').forEach(el => el.classList.add('hidden'));
        if (collectBtn) collectBtn.style.display = 'block';
    } else {
        activeWords = [...currentWords];
        renderWords(activeWords);
        if (collectBtn) collectBtn.style.display = 'none';
    }

    resetPlayAll();
    currentPlayIndex = 0;
};

wordListContainer.onclick = (e) => {
    const checkBox = e.target.closest('.check-box');
    if (checkBox) {
        const enText = checkBox.getAttribute('data-en');
        if (unknownWords[enText]) {
            delete unknownWords[enText];
            checkBox.textContent = '☆';
        } else {
            unknownWords[enText] = true;
            checkBox.textContent = '⭐';
        }
        localStorage.setItem('unknownWords', JSON.stringify(unknownWords));
        return;
    }
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
        if (currentPlayIndex >= activeWords.length) {
            currentPlayIndex = 0;
        }

        isPlayingAll = true;
        playAllBtn.textContent = '■ 재생 중지';
        playAllBtn.classList.add('playing');
        playNextWord();
    }
};

function playNextWord() {
    if (!isPlayingAll || currentPlayIndex >= activeWords.length) {
        resetPlayAll();
        return;
    }

    highlightWord(currentPlayIndex);

    const text = activeWords[currentPlayIndex].en;
    const utterance = new SpeechSynthesisUtterance(text);

    const selectedLang = langSelect.value || 'en-US';
    utterance.lang = selectedLang;

    if (availableVoices.length > 0) {
        const voice = availableVoices.find(v => v.lang.includes(selectedLang) || v.lang.includes(selectedLang.replace('-', '_')));
        if (voice) utterance.voice = voice;
    }

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

function resetPlayAll() {
    isPlayingAll = false;
    if (playAllBtn) {
        playAllBtn.textContent = '▶ 전체 재생';
        playAllBtn.classList.remove('playing');
    }
    document.querySelectorAll('.word-item').forEach(el => el.classList.remove('playing-now'));
}

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

    const selectedLang = langSelect.value || 'en-US';
    utterance.lang = selectedLang;

    if (availableVoices.length > 0) {
        const voice = availableVoices.find(v => v.lang.includes(selectedLang) || v.lang.includes(selectedLang.replace('-', '_')));
        if (voice) utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
}

window.onscroll = function () {
    if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
        goToTopBtn.classList.add('show');
    } else {
        goToTopBtn.classList.remove('show');
    }
};

goToTopBtn.onclick = function () {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

loadData();

if (collectBtn) {
    collectBtn.onclick = () => {
        const hiddenEnTexts = [];
        document.querySelectorAll('.word-item').forEach(item => {
            const koBox = item.querySelector('.ko-box');
            if (koBox && koBox.classList.contains('hidden')) {
                hiddenEnTexts.push(item.querySelector('.en-box').innerText);
            }
        });

        if (hiddenEnTexts.length === 0) {
            alert("모든 단어를 확인했습니다!");
            return;
        }

        activeWords = currentWords.filter(word => hiddenEnTexts.includes(word.en));

        renderWords(activeWords);

        resetPlayAll();
        currentPlayIndex = 0;
    };
}

filterUnknownBtn.onclick = () => {
    isFilterMode = !isFilterMode;
    filterUnknownBtn.classList.toggle('active', isFilterMode);
    filterUnknownBtn.textContent = isFilterMode ? '전체 보기' : '모른 단어만';

    renderWords(currentWords);
    resetPlayAll();
    currentPlayIndex = 0;
};

toggleBtn.onclick = () => {
    isKoHidden = !isKoHidden;
    toggleBtn.textContent = isKoHidden ? '한국어 보이기' : '한국어 가리기';
    toggleBtn.classList.toggle('active', isKoHidden);

    if (!isKoHidden) {
        isFilterMode = false;
        filterUnknownBtn.classList.remove('active');
        filterUnknownBtn.textContent = '모르는 단어';
    }

    renderWords(currentWords);
    resetPlayAll();
};

if (resetDataBtn) {
    resetDataBtn.onclick = () => {
        const confirmReset = confirm(
            "별표(⭐) 표시한 모든 '모른 단어' 기록이 삭제됩니다.\n정말로 초기화하시겠습니까?"
        );

        if (confirmReset) {
            localStorage.removeItem('unknownWords');
            unknownWords = {};

            if (studyScreen.classList.contains('active')) {
                renderWords(currentWords);
            }

            alert("학습 데이터가 모두 초기화되었습니다.");
        }
    };
}