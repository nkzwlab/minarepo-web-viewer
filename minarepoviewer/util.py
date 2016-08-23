# -*- coding: utf-8 -*-
import string
import random
import re
import requests


_pat_geo_point = re.compile(r'\APOINT\((-?[0-9\.]+) (-?[0-9\.]+)\)\Z')


def parse_geo_point(geo_point_str):
    m = _pat_geo_point.match(geo_point_str)
    if not m:
        return (None, None)

    lat, lng = m.groups()
    return (lat, lng)


def random_str(length):
    chars = string.letters + string.digits
    ret = ''
    for i in xrange(length):
        ret += random.choice(chars)
    return ret


def quote_excel_value(v):
    if isinstance(v, (unicode,)):
        return '"' + v.replace('"', '""') + '"'
    if isinstance(v, (str,)):
        return '"' + v.decode('utf-8').replace('"', '""') + '"'
    else:
        v = str(v)
        return ('"' + v.replace('"', '""') + '"').decode('utf-8')


def build_excel_row(cols):
    quoted_cols = [ quote_excel_value(v) for v in cols ]
    unicode_line = u','.join(quoted_cols) + u'\n'
    cp932_line = unicode_line.encode('cp932')
    return cp932_line


def geo2addr(lat, lng, key):
    GMAP_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
    payload = {
        'latlng': lat + ',' + lng,
        'API_KEY': key,
        'language': 'ja'
    }
    r = requests.get(GMAP_GEOCODING_URL, params=payload)
    if r.status_code is 200:
        addr = r.json()['results'][0]['formatted_address']
        return addr
    else:
        return None
