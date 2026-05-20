# 📢 트렐로 파워업 업데이트 로그 (Update Log)

- **작업 일시**: 2026년 5월 20일
- **작업 내용**: 통합 체크리스트 모달창 크기(좌우 너비) 최적화 및 캐시 이슈 해결

---

## 1. 문제 현상 및 분석

### 🔍 현상
- 트렐로 보드 상단에서 **[전체 체크리스트]** 버튼을 클릭하여 파워업을 실행했을 때, 모달창(통합 체크리스트)이 화면 중앙에 약 50% 정도의 좁은 너비로만 출력됨.
- 내부 콘텐츠인 요일별 체크리스트 열(Column)들과 우측 통합 Activity 패널의 내용이 잘려 정상적인 확인이 불가능함.

### 💡 원인 분석
1. **Trello SDK 기본 제한**: `public/connector.html`에서 모달을 띄울 때 호출하는 `t.modal` 함수 옵션 중 `fullscreen` 값이 `false`로 지정되어 있어 트렐로 기본 카드 크기로 너비가 강제 제한되었습니다.
2. **트렐로 자체 캐싱 동작**: 트렐로 플랫폼은 `connector.html` 파일의 내용을 서버 및 브라우저 레벨에서 매우 길게 캐싱합니다. 이에 따라 설정 파일 수정만으로는 사용자 브라우저에 바로 반영되지 않는 현상이 발생할 수 있습니다.

---

## 2. 수정 사항 및 해결 방법

모달창 크기 속성을 전체 화면 크기로 조정함과 동시에, 트렐로의 캐싱 문제를 방지할 수 있도록 하이브리드 방식으로 이중 안전장치를 마련했습니다.

### 📁 수정된 파일 목록

#### ① [connector.html](file:///e:/OneDrive - 주식회사 웰에셋/1. 다운로드/10. AI 작업 관련/5. 트렐로 파워업(체크리스트)/public/connector.html)
- Trello Power-Up 초기 진입 시 기본 모달 속성을 fullscreen으로 열도록 설정값을 변경했습니다.
```html
// 변경 전
return t.modal({
  title: '통합 체크리스트',
  url: '/checklist-modal',
  fullscreen: false,
  height: 800,
});

// 변경 후
return t.modal({
  title: '통합 체크리스트',
  url: '/checklist-modal',
  fullscreen: true,
  height: 800,
});
```

#### ② [page.tsx](file:///e:/OneDrive - 주식회사 웰에셋/1. 다운로드/10. AI 작업 관련/5. 트렐로 파워업(체크리스트)/src/app/checklist-modal/page.tsx)
- `connector.html` 캐싱으로 인해 좁은 모달이 열린 상황이더라도, 내부에 로드되는 React 컴포넌트 실행 즉시 Trello API `t.updateModal`를 호출하여 강제로 fullscreen 너비로 최적화하는 보완 장치를 심었습니다.
```typescript
useEffect(() => {
  fetchTodos();
  const initT = () => {
    if ((window as any).TrelloPowerUp) {
      const t = (window as any).TrelloPowerUp.iframe();
      setTrello(t);
      
      // Trello의 커넥터 캐싱 문제를 대비해 모달이 열릴 때 강제로 fullscreen으로 즉시 확대
      try {
        t.updateModal({ fullscreen: true });
      } catch (e) {
        console.error('Failed to force fullscreen modal:', e);
      }

      fetchActivity();
    }
  };
  ...
}, []);
```

---

## 3. 배포 및 검증 결과

- **Git 작업**: 변경 사항 로컬 커밋 및 원격 GitHub 리포지토리(`main` 브랜치)에 푸시 완료.
- **Vercel 자동 배포**: GitHub 커밋 트리거를 통해 Vercel 서버 재빌드 및 배포 완료.
- **최종 검증**: 브라우저에서 트렐로 보드를 새로고침(캐시 새로고침)한 뒤 실행하면, 캐싱 영향 없이 좌우 검은색 배경 영역에 맞게 넓고 시원하게 펼쳐진 창으로 정상 동작합니다.
