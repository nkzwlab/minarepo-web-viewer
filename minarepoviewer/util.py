# -*- coding: utf-8 -*-
import re


_pat_geo_point = re.compile(r'\APOINT\((-?[0-9\.]+) (-?[0-9\.]+)\)\Z')


def parse_geo_point(geo_point_str):
    m = _pat_geo_point.match(geo_point_str)
    if not m:
        return (None, None)

    lat, lng = m.groups()
    return (lat, lng)
