"""Local, offline solar-term themes. Calendar switches at 00:00 UTC+8."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).parent
THEMES = [
    {**item, 'category': item.get('category', 'solar')}
    for item in json.loads((ROOT / 'solar-themes.json').read_text(encoding='utf-8'))
]
THEME_BY_KEY = {item['key']: item for item in THEMES}
CALENDAR = json.loads((ROOT / 'solar-calendar.json').read_text(encoding='utf-8'))['years']

def current_term(moment=None):
    moment = moment or datetime.now(timezone(timedelta(hours=8)))
    if moment.tzinfo:
        moment = moment.astimezone(timezone(timedelta(hours=8)))
    today = moment.date().isoformat()
    entries = [(date, key) for year in (moment.year - 1, moment.year)
               for key, date in CALENDAR.get(str(year), {}).items() if date <= today]
    if str(moment.year) in CALENDAR and entries:
        return max(entries)[1]
    # Outside the bundled official calendar, use an approximate apparent solar
    # longitude; no remote calendar dependency or fixed Gregorian day guesses.
    utc = moment.astimezone(timezone.utc) if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
    jd = utc.timestamp() / 86400 + 2440587.5
    t = (jd - 2451545.0) / 36525
    mean_longitude = 280.46646 + 36000.76983*t + 0.0003032*t*t
    anomaly = math.radians((357.52911 + 35999.05029*t - 0.0001537*t*t) % 360)
    center = ((1.914602 - 0.004817*t - 0.000014*t*t)*math.sin(anomaly)
              + (0.019993 - 0.000101*t)*math.sin(2*anomaly) + 0.000289*math.sin(3*anomaly))
    apparent = (mean_longitude + center - 0.00569 - 0.00478*math.sin(math.radians(125.04-1934.136*t))) % 360
    return THEMES[(int(apparent // 15) + 3) % 24]['key']

def get_theme(profile=None, moment=None):
    selected = (profile or {}).get('home_theme', 'auto')
    key = selected if selected in THEME_BY_KEY else current_term(moment)
    return {**THEME_BY_KEY[key], 'mode': 'manual' if selected in THEME_BY_KEY else 'auto'}

def theme_catalog(profile=None):
    selected = (profile or {}).get('home_theme', 'auto')
    return {'themes': THEMES, 'selected': selected if selected in THEME_BY_KEY else 'auto',
            'active': get_theme(profile), 'calendar_timezone': 'Asia/Shanghai'}
