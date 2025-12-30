# Museum Window (Head-Tracked Parallax) — React + R3F

세련된 미술관 감상 경험을 목표로 만든 테스트 프로젝트입니다.
웹캠 기반 얼굴 트래킹으로 사용자의 위치 변화를 추정하고, 카메라의 `projectionMatrix`를 오프-센터로 조정해
'창문처럼' 보이는 시차(parallax)를 구현합니다.

## Run

```bash
npm i
npm run dev
```

## Notes

- 트래킹이 꺼져 있거나 카메라 권한이 거부되면, 마우스 움직임이 시차 입력으로 대체됩니다.
- 작품 이미지는 외부 파일 없이도 바로 동작하도록 **캔버스 텍스처(추상 레이어)**로 생성했습니다.
  실제 작품으로 바꾸려면 `src/scene/ArtworkFrame.jsx`에서 레이어 텍스처만 교체하면 됩니다.
