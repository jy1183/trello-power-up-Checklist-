# 🚀 Trello 커스텀 파워업(Power-Up) 등록 및 배포 가이드

본 문서는 직접 개발한 Trello 파워업(통합 체크리스트 등)을 Vercel에 배포하고, Trello에 연동하여 보드에서 사용할 수 있도록 설정하는 전체 과정을 담은 가이드입니다.

---

## 1단계: Vercel에 코드 배포
1. GitHub 레포지토리에 파워업 코드를 올립니다.
2. [Vercel](https://vercel.com/) 대시보드에서 `Add New Project`를 클릭하여 해당 GitHub 레포지토리를 Import 합니다.
3. 우선 별다른 설정 없이 하단의 **`Deploy`** 버튼을 눌러 1차 배포를 완료합니다.
4. 배포가 완료되면 생성된 **Vercel 프로젝트 주소**(예: `https://my-trello-powerup.vercel.app`)를 복사해 둡니다.

---

## 2단계: Trello 파워업 생성 및 설정
파워업은 사용할 트렐로 워크스페이스 단위로 생성해야 합니다.

1. **[Trello Power-Ups Admin 페이지(클릭)](https://trello.com/power-ups/admin)** 에 접속합니다.
2. 우측 상단의 **`New Power-Up`** (또는 Custom Power-Up 생성) 버튼을 클릭합니다.
3. 파워업 이름(예: 통합 체크리스트)을 입력하고, 이 파워업을 사용할 **워크스페이스(팀)를 정확히 선택**한 후 생성합니다.
4. 생성된 파워업 설정 페이지에서 다음 두 가지를 필수적으로 설정합니다:
   - **`Basic Information` 탭**: `Iframe connector URL` 칸에 아까 복사한 **Vercel 주소 뒤에 `/connector.html`**을 붙여서 입력합니다. 
     *(예: `https://my-trello-powerup.vercel.app/connector.html`)*
   - **`Capabilities` 탭**: **`Board Buttons`** 권한에 체크(✅)를 하고 반드시 하단의 `Save` 버튼을 눌러 저장합니다. (버튼 외에 다른 기능을 쓴다면 해당 기능도 체크)

---

## 3단계: Trello API Key 및 Token 발급
이 파워업이 내 트렐로 데이터(보드, 카드 등)에 접근할 수 있도록 권한(API Key와 Token)을 발급받아야 합니다.
> ⚠️ **주의**: 파워업을 새로 만들 때마다 API Key가 새로 발급됩니다. 기존 파워업을 지웠다면 반드시 새 키와 토큰을 발급받아야 합니다.

1. 파워업 설정 페이지 좌측 메뉴에서 **`API Key`** 탭을 클릭합니다.
2. 화면에 나타난 긴 영문/숫자 형태의 **API Key**를 복사합니다.
3. 복사한 API Key를 이용해서 **Token을 발급**받기 위해 브라우저 주소창에 아래 주소를 입력하여 접속합니다. (맨 끝 부분에 방금 복사한 API Key를 넣으세요!)
   ```text
   https://trello.com/1/authorize?expiration=never&name=나의_파워업_이름&scope=read,write&response_type=token&key=여기에_API_KEY_붙여넣기
   ```
4. 트렐로 접근 허용 확인 창이 뜨면 스크롤을 내려 **`허용(Allow)`** 버튼을 누릅니다.
5. 화면에 출력되는 긴 텍스트가 바로 **`Token(토큰)`**입니다. 이를 복사해 둡니다.

---

## 4단계: Trello 워크스페이스 ID 확인
API가 특정 워크스페이스의 데이터를 긁어오기 위해 워크스페이스 ID가 필요합니다.

1. PC 브라우저로 [Trello 메인 화면](https://trello.com/)에 접속합니다.
2. 파워업을 사용할 워크스페이스(팀) 이름을 클릭해 들어갑니다.
3. 브라우저 맨 위의 주소창(URL)을 확인합니다.
   - `https://trello.com/w/wellasset/home` 처럼 되어 있다면, `w/` 뒤의 **`wellasset`** 이 바로 워크스페이스 ID입니다. 이를 복사합니다.

---

## 5단계: Vercel 환경 변수 설정 및 재배포 (가장 중요 ⭐️)
앞서 수집한 3가지 핵심 정보를 서버에 입력하고 적용하는 단계입니다.

1. Vercel 대시보드 내 프로젝트 설정(**`Settings`**)으로 이동합니다.
2. 좌측 메뉴에서 **`Environment Variables`** 탭을 클릭합니다.
3. 아래의 세 가지 변수(Key)와 값(Value)을 차례로 입력하고 `Add More`를 눌러 저장합니다.
   - `TRELLO_API_KEY` : 3단계에서 복사한 API Key
   - `TRELLO_API_TOKEN` : 3단계에서 허용(Allow)을 누르고 받은 Token
   - `TRELLO_WORKSPACE_ID` : 4단계에서 확인한 워크스페이스 ID (예: `wellasset`)
4. 🛑 **(매우 중요)** 변수를 모두 입력한 후, 상단 메뉴의 **`Deployments`** 탭으로 이동합니다.
5. 가장 상단에 있는 최근 배포 내역 우측의 **점 3개(⋮)** 버튼을 누르고 **`Redeploy`** 를 클릭하여 서버를 다시 빌드합니다. (이 과정을 거쳐야만 방금 입력한 변수들이 적용됩니다.)

---

## 6단계: 보드에 파워업 추가 및 확인
1. 해당 워크스페이스 안에 있는 아무 트렐로 보드로 접속합니다.
2. 우측 상단의 **[Power-Ups]** 버튼을 눌러 파워업 창을 엽니다.
3. 파워업 메뉴 왼쪽 카테고리를 맨 아래로 내려서 **`Custom (사용자 지정)`** 메뉴를 클릭합니다.
4. 목록에 나타난 내가 만든 파워업을 찾아 **`추가(Add)`** 버튼을 누릅니다.
5. 보드 상단에 팝업 버튼(예: 전체 체크리스트 보기)이 생겨난 것을 확인하고, 클릭하여 데이터가 정상적으로 불러와지는지(500 Error가 안 뜨는지) 확인합니다.

🎉 **설정 완료! 이제 완벽하게 동작하는 자신만의 트렐로 파워업을 즐기시면 됩니다.**
