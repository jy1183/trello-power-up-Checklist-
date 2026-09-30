# 체크리스트: 기한 없는 체크리스트 항목 표기 및 보드 지원

- [x] 백엔드 API (`/api/trello/checklists`): `!item.due` 및 `state !== 'complete'` 항목 `noDueTasks` 수집 및 반환 구현
- [x] 백엔드 API (`/api/trello/checklists`): PUT 요청 시 `dueDate === null` 또는 빈 값일 때 Trello `due=null` 처리 지원
- [x] 프론트엔드 모달 (`checklist-modal/page.tsx`): `noDueTodos` 상태 및 필터링(`filteredNoDue`) 구현
- [x] 프론트엔드 모달 (`checklist-modal/page.tsx`): 제일 왼쪽에 '기한 없음' 보드 컬럼 렌더링 (인덱스 개념으로 0개여도 항상 유지)
- [x] 드래그 앤 드롭 및 상태 연동: '기한 없음' <-> 요일별 컬럼 간 상호 드래그 이동 및 체크 완료 시 목록 제거 처리
- [x] 더블클릭 추가 연동: '기한 없음' 컬럼에서 새 할일 추가 시 기한 없이 등록 지원
- [x] 빌드 및 타입 검사 (`npx tsc --noEmit`) 검증
- [x] context-notes.md 업데이트 및 최종 정리

## 보완: 아카이브된 카드의 체크리스트 제외
- [x] Trello API 보드 조회 시 닫힌(closed) 보드 제외 (`filter=open` 및 `!b.closed`)
- [x] Trello API 카드 조회 시 아카이브된 카드 제외 (`filter=visible` 쿼리 파라미터 적용)
- [x] 카드 순회 시 `card.closed` 체크하여 아카이브된 카드 체크리스트 배제
- [x] 타입 검사 및 빌드 검증 (`npx tsc --noEmit`)
- [x] context-notes.md 업데이트 및 완료 보고

## 기한 없음 내 '보관함' 폴더 기능 추가
- [x] 백엔드 API (`/api/trello/checklists`): PUT 요청 시 checkItem `name` 수정 파라미터 지원
- [x] 백엔드 API (`/api/trello/checklists`): `[보관함]` 접두사 감지(`isStorage`) 및 깔끔한 title 파싱 지원
- [x] 프론트엔드 모달 (`checklist-modal/page.tsx`): '기한 없음' 보드 내 상단 단기 할 일과 하단 '보관함' 폴더 분리
- [x] 하단 고정 접이식(Accordion) UI 구현: 스크롤 시에도 최하단 고정, 클릭 시 펼침/접힘
- [x] 상호 드래그 앤 드롭 지원:
  - 단기 -> 보관함 드롭 시 `[보관함]` 접두사 부여 및 저장
  - 보관함 -> 단기/요일 컬럼 드롭 시 접두사 제거 및 기한 설정/제거
  - 팀원 간 Trello 서버 영속화로 동일 화면 유지
- [x] 타입 검사 (`npx tsc --noEmit`) 및 프로덕션 빌드 검증
- [x] context-notes.md 기록 갱신


