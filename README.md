# 틱택토 게임 (Tic Tac Toe)

웹 브라우저에서 플레이할 수 있는 틱택토 게임입니다. **멀티플레이 모드**와 **AI 모드**를 지원합니다.

## 🎮 기능

### 멀티플레이 모드
- 두 명의 플레이어가 온라인으로 대전
- O 또는 X 심볼 선택 가능
- O가 먼저 시작
- 실시간 WebSocket 통신

### AI 모드
- 싱글플레이: AI와 대전
- Minimax 알고리즘 기반 강력한 AI
- AI는 거의 질 수 없는 최강의 상대

### 게임 규칙
- 3x3 보드에서 표준 틱택토 규칙 적용
- 3개가 일렬로 나열되면 승리
- 보드가 가득 차면 무승부
- 게임 결과 화면 표시

## 🚀 배포 (Render)

이 프로젝트는 **Render**에 배포되었습니다.

### 배포 방법

1. **Render 계정 생성**
   - https://render.com 에서 계정 생성

2. **GitHub 저장소 연결**
   - Render 대시보드에서 "New +" 클릭
   - "Web Service" 선택
   - GitHub 저장소 선택

3. **배포 설정**
   - **Name**: tictactoe (또는 원하는 이름)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free 또는 Paid

4. **배포 시작**
   - "Create Web Service" 클릭
   - 자동으로 빌드 및 배포 시작

## 💻 로컬 실행

### 필수 요구사항
- Node.js 14+ 
- npm

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 서버 시작
npm start
```

브라우저에서 `http://localhost:3000` 으로 접속

## 📁 프로젝트 구조

```
tictactoe2/
├── server/
│   └── index.js           # Express + WebSocket 서버
├── public/
│   ├── index.html         # HTML
│   ├── style.css          # 스타일
│   └── script.js          # 클라이언트 로직
├── package.json           # 프로젝트 설정
└── README.md              # 이 파일
```

## 🛠️ 기술 스택

- **백엔드**: Node.js, Express
- **실시간 통신**: WebSocket (ws)
- **프론트엔드**: HTML5, CSS3, Vanilla JavaScript
- **AI**: Minimax 알고리즘

## 🎯 게임 플레이

### 멀티플레이
1. 메뉴에서 "멀티플레이" 선택
2. O 또는 X 선택
3. 다른 플레이어가 입장할 때까지 대기
4. 게임 시작

### AI 모드
1. 메뉴에서 "AI와 플레이" 선택
2. O 또는 X 선택
3. 즉시 게임 시작

## 📝 라이선스

MIT License

## 👨‍💻 개발자

Made with ❤️ by nesticat