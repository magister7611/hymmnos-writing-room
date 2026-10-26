# Hymmnos · 작은 작업실

브라우저 안에서 휴므노스 문장과 노랫말을 만드는 비공식 팬 창작 도구입니다. HTML·CSS·JavaScript와 정적 분석기 파일만 배포하며 Python/Node 서버 및 GPT API 호출 없이 실행합니다.

[작업실 열기](https://magister7611.github.io/hymmnos-writing-room/)

## 사용

한국어 문장을 입력하고 감정구, 본문 어휘 범위, 표현 방식을 선택하세요.

- **원문에 가깝게:** 주체·대상·바람·부정을 드러내는 문장 조합
- **시적인 의역 허용:** 감정 강도의 변화와 문맥상 생략을 설명하는 가사형 조합
- **중앙정순률 / 표준계열 전체:** 서로 다른 어휘 범위를 엄격히 구분
- 사전 866항목 검색, 표준계열 549항목 사용, 단어별 원문 확인
- 구간별 가사, 즐겨찾기, 직접 조합·수정, 문장 저장, TXT 및 JSON 백업

예: ‘나는 너를 지키고 싶어’는 바라는 사람과 지키는 사람이 모두 화자인 구조로 분석합니다. ‘나는 네가 내 곁에 있기를 바라’는 바라는 사람과 곁에 있는 사람을 구분합니다.

이 도구는 범용 한국어 번역기나 공식 문법 검증기가 아닙니다. 형태소 분석 후 지원하는 문장 관계를 규칙으로 구성합니다. 조건·인과·관형절, 질문·명령·수동태와 복잡한 다중 동사 구조는 일부 보류합니다. 과거·미래의 정밀도와 한정 표현은 별도 안내합니다. 희망과 기도, 좋아함과 사랑처럼 의미가 바뀌는 근사는 설명을 붙입니다. 문법 조합 후보의 관용적 자연성은 직접 검토해야 합니다.

첫 접속과 오프라인 파일 저장이 완료된 뒤에는 연결이 끊겨도 사용할 수 있습니다. 브라우저가 저장 파일을 제거하면 다시 접속해야 합니다. 사용자의 입력은 생성 서버에 전송하지 않습니다. 호스팅 서비스의 일반적인 접속 기록 수집과는 별개입니다.

## 기존 작업실에서 옮기기

기존 GPT 사이트의 ‘내 문장 → 백업’에서 JSON 파일을 내려받고 새 사이트의 ‘내 문장 → 가져오기’로 가져오세요. 주소가 바뀌면 브라우저 저장소도 달라져 자동으로 이전되지 않습니다. GPT 작업실은 이 프로젝트와 별도로 유지되며 설정 안내에서 열 수 있습니다. 이 버전에는 API 키를 넣는 칸이 없습니다.

## 개발·배포

개발 및 빌드에 Node.js 24를 사용합니다. **배포 후 실행에는 Node.js 서버가 필요하지 않습니다.**

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run verify
```

`dist/`의 파일 전체가 배포 결과입니다. `index.html`을 직접 더블클릭하는 대신 로컬 서버 또는 HTTPS 정적 호스팅으로 여세요.

GitHub 저장소의 **Settings → Pages → Source → GitHub Actions**를 선택하면 `main`에 푸시할 때 검사·빌드·배포합니다. 상대 경로를 사용하므로 `<사용자>.github.io/<저장소>/` 형식에서 동작하도록 구성했습니다. 공개 Pages와 저장소에는 개인 문장 백업이나 API 키를 올리지 마세요.

## 파일 구성

- `src/Studio.jsx`: 화면·기기 저장·내보내기
- `src/worker/generate.worker.js`: 화면과 분리해서 실행하는 분석 작업
- `src/engine/parse.js`: 한국어 분석 결과를 주체·대상·소유·위치·바람·부정으로 구성
- `src/engine/lexicon.js`: 사전 대응과 검토한 의미별 우선 어휘
- `src/engine/generate.js`: 의미 구조를 휴므노스 문장/어구로 구성하고 한계 표시
- `src/engine/catalog.js`, `src/data/`: 사전 조회·방언 구분·원본 메타데이터
- `scripts/finish-build.mjs`: 오프라인 캐시 파일 생성
- `scripts/verify-static.mjs`: 비밀 값 패턴·서버 의존·상대 경로·분석기 자산 검사
- `tests/meaning.test.mjs`: 실제 Garu 분석기를 사용하는 의미 관계 검사

## 자료와 권리

- Hymmnoserver / Neil Tallim 및 기여자: https://hymmnoserver.uguu.ca/ · https://github.com/flan/hymmnoserver
- 사전은 기존 작업실에서 정리한 2016-01-09 덤프와 2026-10-26 대조 자료를 사용합니다. 영어·일본어·방언·품사를 보존하고 한국어 검토용 뜻을 추가했습니다. 저장소 BY-SA 3.0 고지와 일부 현행 페이지 BY-NC-SA 3.0 고지가 다르며 GUST/Banpresto 원저작물 예외가 있습니다. `public/data/source-notice.txt`와 `public/notices/hymmnos-license.README`를 확인하세요. 원저작물의 권리를 새로 부여하지 않습니다.
- Garu(garu-ko) / Yongjin Cho: https://github.com/ongjin/garu . 코드 Apache-2.0, 번들 사전의 개별 자료 고지·라이선스·변경 내역은 `public/notices/garu/`에 보존했습니다. 모델을 변경하지 않았습니다. 형태소 분석 평가 점수는 휴므노스 번역 정확도와 다릅니다.
- Libre Caslon Display / Impallari Type 및 기여자: OFL-1.1. 글꼴과 라이선스를 자체 배포하며 외부 글꼴 서버에 의존하지 않습니다.
- 앱 구현 코드의 조건은 `LICENSE`에 있습니다. 사전·모델·글꼴의 별도 권리를 대체하지 않습니다.

언어 규칙과 확인 범위는 `docs/문장-엔진.md`를 참고하세요.
