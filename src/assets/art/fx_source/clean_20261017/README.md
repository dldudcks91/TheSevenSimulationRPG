# 클린 도트 스킬 이펙트

기존 `pixel2d` 그림체의 설치본 88장과 원본·최종 프롬프트를 보존한다. 나머지 이전 2D 스타일의 원본·프롬프트·설치본은 삭제했다. 생성 방식은 Codex 내장 imagegen이다.

- [스킬·셀 대응표](manifest.json), [내보내기 기록](export_report.json)
- 원본: `sheet_pixel2d_01.png` ~ `sheet_pixel2d_03.png`
- 최종 프롬프트: [01](prompt_pixel2d_01.txt) · [02](prompt_pixel2d_02.txt) · [03](prompt_pixel2d_03.txt)
- 설치: `python scripts/build_clean_fx.py pixel2d`

새 다섯 그림체는 [material_20261017](../material_20261017/README.md)에 있다. 클린 도트 원본은 새 그림의 형태 대응 참조로 사용했으며 보존 그림 파일의 바이트는 변경하지 않았다.
