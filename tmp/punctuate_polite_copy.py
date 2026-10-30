from pathlib import Path

path = Path('src/data/stage.csv')
source = path.read_bytes()
for old, new in [
    ('그도 어디까지 달라질 수 있을까요.', '그도 어디까지 달라질 수 있을까요?'),
    ('얼마나 더 먹어야 멈출 겁니까.', '얼마나 더 먹어야 멈출 겁니까?'),
    ('정말 저것을 원하는 걸까요.', '정말 저것을 원하는 걸까요?'),
]:
    assert source.count(old.encode('utf-8')) == 1, old
    source = source.replace(old.encode('utf-8'), new.encode('utf-8'))
path.write_bytes(source)
print('Polished question punctuation in 3 Korean story cells.')
