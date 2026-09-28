# 체크리스트: 기한 없는 체크리스트 항목 표기 및 보드 지원

- [x] 백엔드 API (`/api/trello/checklists`): `!item.due` 및 `state !== 'complete'` 항목 `noDueTasks` 수집 및 반환 구현
- [x] 백엔드 API (`/api/trello/checklists`): PUT 요청 시 `dueDate === null` 또는 빈 값일 때 Trello `due=null` 처리 지원
- [x] 프론트엔드 모달 (`checklist-modal/page.tsx`): `noDueTodos` 상태 및 필터링(`filteredNoDue`) 구현
- [x] 프론트엔드 모달 (`checklist-modal/page.tsx`): 제일 왼쪽에 '기한 없음' 보드 컬럼 렌더링 (인덱스 개념으로 0개여도 항상 유지)
- [x] 드래그 앤 드롭 및 상태 연동: '기한 없음' <-> 요일별 컬럼 간 상호 드래그 이동 및 체크 완료 시 목록 제거 처리
- [x] 더블클릭 추가 연동: '기한 없음' 컬럼에서 새 할일 추가 시 기한 없이 등록 지원
- [x] 빌드 및 타입 검사 (`npx tsc --noEmit`) 검증
- [x] context-notes.md 업데이트 및 최종 정리
