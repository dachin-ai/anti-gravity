import gspread
from pathlib import Path
creds = Path('credentials.json')
if not creds.exists():
    raise SystemExit('missing credentials.json')
client = gspread.service_account(filename=str(creds))
sh = client.open_by_url('https://docs.google.com/spreadsheets/d/1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc')
ws = sh.worksheet('AT2')
rows = ws.get_all_values()
print('header:', rows[0])
print('sample:', rows[1])
print('len header', len(rows[0]))
