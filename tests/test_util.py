# -*- coding: utf-8 -*-
from unittest import TestCase
from nose.tools import ok_, eq_


from minarepoviewer.util import parse_geo_point


class UtilTestCase(TestCase):
    def setUp(sef):
        pass

    def tearDown(self):
        pass

    def test_parse_geo_point(self):
        r1 = parse_geo_point('POINT(35.4651712 139.4840395)')
        eq_(('35.4651712', '139.4840395'), r1)

        r2 = parse_geo_point('POINT(-35.4651712 139.4840395)')
        eq_(('-35.4651712', '139.4840395'), r2)

        r3 = parse_geo_point('POINT(35.4651712 -139.4840395)')
        eq_(('35.4651712', '-139.4840395'), r3)

        r4 = parse_geo_point('POINT(-35.4651712 -139.4840395)')
        eq_(('-35.4651712', '-139.4840395'), r4)

        r5 = parse_geo_point('')
        eq_((None, None), r5)

        r6 = parse_geo_point('POINT(hoge moge)')
        eq_((None, None), r6)
