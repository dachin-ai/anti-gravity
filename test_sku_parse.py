import re
DELIM = r'[+/\-|,;" ]'
MIN_LEN = 12
def parse(s):
    parts = re.split(DELIM, s.strip())
    return [p.strip() for p in parts if len(p.strip()) >= MIN_LEN]
print(parse('FR0208A40001+FR0208A38404'))
print(parse('SHORT+FR0208A40001/FR0208B12345'))
print(parse('FR0208A40001-B'))
print(parse('FR0208A40001'))
