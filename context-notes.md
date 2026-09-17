# Context Notes: 통합 Activity 파일 링크 표시 개선

## 배경 및 의사결정
- **이슈**: Trello 댓글 또는 통합 Activity 목록에서 SharePoint 파일 링크가 첨부될 때 `[파일명](URL)` 형태의 마크다운 링크로 저장되어 화면에 긴 SharePoint URL 전체가 노출되어 가독성이 떨어짐.
- **방향**: 긴 URL 대신 파일명만 노출하도록 변경. 사용자의 접근 편의성을 위해 파일명을 클릭하면 원본 URL(SharePoint 문서 등)로 즉시 연결되는 하이퍼링크 방식(또는 순수 텍스트)을 적용할 수 있도록 계획 수립.
- **적용 대상**: `src/app/checklist-modal/page.tsx` 통합 Activity 렌더링 부분.

## 구현 상세
- `renderActivityText` 함수 구현:
  - 마크다운 링크 정규식 `\[([^\]]+)\]\((https?:\/\/(?:[^\s\(\)]|\([^\s\(\)]*\))+)\)` 적용 (SharePoint URL 내부의 인코딩된 괄호 쌍 처리 지원).
  - 파일명을 클릭 시 새 창(`target="_blank"`)에서 열리는 하이퍼링크로 렌더링하고, 클립 아이콘(`Paperclip`)과 스타일 태그 적용.
  - 마크다운 링크 주변의 일반 텍스트는 그대로 유지.
- 통합 Activity 렌더링 영역의 `a.text`에 `renderActivityText(a.text)` 적용 완료.
- 타입 검사(`npx tsc --noEmit`) 및 프로덕션 빌드(`npm run build`) 통과 완료.

