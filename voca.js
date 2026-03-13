const speakText = (text) => {
    if (!window.speechSynthesis) {
        alert("이 브라우저는 음성 합성을 지원하지 않습니다.");
        return;
    }

    // 1. 현재 진행 중인 음성이 있다면 중지 (카카오톡 내 충돌 방지)
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 2. 한국어 설정 (카카오톡 내 기본값 이슈 방지)
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0; // 속도
    utterance.pitch = 1.0; // 음높이

    // 3. 음성 목록 로드 확인 후 실행
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        // 음성이 아직 로드되지 않았다면 이벤트를 기다림
        window.speechSynthesis.onvoiceschanged = () => {
            const updatedVoices = window.speechSynthesis.getVoices();
            utterance.voice = updatedVoices.find(v => v.lang.includes('ko')) || updatedVoices[0];
            window.speechSynthesis.speak(utterance);
        };
    } else {
        utterance.voice = voices.find(v => v.lang.includes('ko')) || voices[0];
        window.speechSynthesis.speak(utterance);
    }
};

// 사용 예시: 반드시 버튼 클릭 같은 '직접적인' 이벤트 내부에서 실행
document.getElementById('speakBtn').addEventListener('click', () => {
    speakText("안녕하세요, 카카오톡에서도 목소리가 들리나요?");
});