# -*- coding: utf-8 -*-
import time

import MySQLdb


from util import parse_geo_point


class MinaRepoDBA(object):
    def __init__(self, mysql_conf, timeout=120.0):
        self._cfg = mysql_conf
        self._timeout = timeout
        self._connect()

    def get_reports(
            self, t_start=None, t_end=None, nodes=None,
            top_left=None, bottom_right=None):
        result = self._get_reports(t_start, t_end, nodes, top_left, bottom_right)
        return list(result)

    def _get_reports(
            self, t_start=None, t_end=None, nodes=None,
            top_left=None, bottom_right=None):
        args = []
        conditions = []

        if t_start and t_end:
            conditions.append('(`timestamp` BETWEEN %s AND %s)')
            args.append(t_start)
            args.append(t_end)
        else:
            if t_start is not None:
                conditions.append('(%s <= `timestamp`)')
                args.append(t_start)
            elif t_end is not None:
                conditions.append('`timestamp` <= (%s)')
                args.append(t_end)

        if nodes is not None and 0 < len(nodes):
            values = ', '.join(['%s'] * len(nodes))
            conditions.append('(`type` IN (%s))' % values)
            for n in nodes:
                args.append(n)
        elif nodes is not None and len(nodes) == 0:
            conditions.append('1 = 0')  # nodes = [] means no match

        # TODO: top_left, bottom_right のcondition組み立てる
        if top_left and bottom_right:
            # WHERE MBRWithin(geom_field, GeomFromText('LineString(130.00 30.00, 140.00 40.00)', 4326));
            linestring = 'LineString(%s %s %s %s)' % (
                top_left['latitude'],
                top_left['longitude'],
                bottom_right['latitude'],
                bottom_right['longitude']
            )
            geo_cond = 'MBRWithin(geo, GeomFromText(%s, 4326)' % linestring
            conditions.append(geo_cond)

        cols = 'id, type, user, astext(geo), timestamp, image, comment, address'
        col_keys = [
            'id', 'type', 'user', 'geo', 'timestamp', 'image', 'comment', 'address'
        ]

        if len(conditions) == 0:
            sql = 'SELECT %s FROM minarepo ORDER BY timestamp;' % cols
        else:
            cond = ' AND '.join(conditions)
            sql = 'SELECT %s FROM minarepo WHERE %s ORDER BY timestamp;' % (cols, cond)

        if self._last_comm + self._timeout < time.time():
            self._reconnect()

        print 'sql=%s' % sql
        print 'sql-args=%s' % args
        cursor = self._conn.cursor()
        try:
            cursor.execute(sql, args)
            result = cursor.fetchall()
            for row in result:
                r_obj = dict()
                for i, col in enumerate(col_keys):
                    r_obj[col] = row[i]
                    if col == 'geo':
                        r_obj[col] = parse_geo_point(r_obj[col])
                yield r_obj

        finally:
            cursor.close()

    def get_report(self, report_id):
        cols = 'id, type, user, astext(geo), timestamp, image, comment, address'
        col_keys = [
            'id', 'type', 'user', 'geo', 'timestamp', 'image', 'comment', 'address'
        ]
        sql = 'SELECT %s FROM minarepo WHERE id = %%s;' % cols

        if self._last_comm + self._timeout < time.time():
            self._reconnect()

        ret = dict()
        cursor = self._conn.cursor()
        try:
            cursor.execute(sql, (report_id,))
            result = list(cursor.fetchall())[0]
            for i, col in enumerate(col_keys):
                ret[col] = result[i]
            ret['geo'] = parse_geo_point(ret['geo'])
        finally:
            cursor.close()

        return ret

    def _close(self):
        if self._conn is None:
            return

        try:
            self._conn.close()
        except:
            pass

    def _connect(self):
        self._conn = MySQLdb.connect(
            db=self._cfg['db'],
            host=self._cfg['host'],
            user=self._cfg['user'],
            passwd=self._cfg['pass']
        )
        self._last_comm = time.time()

    def _reconnect(self):
        self._close()
        self._connect()
