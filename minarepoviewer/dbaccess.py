# -*- coding: utf-8 -*-
import time
import datetime
from contextlib import contextmanager

import MySQLdb


from time import strftime
from util import parse_geo_point, geo2addr


class MinaRepoDBA(object):
    def __init__(self, mysql_conf, timeout=120.0):
        self._cfg = mysql_conf
        self._timeout = timeout
        self._connect()

    def get_reports(
            self, t_start=None, t_end=None, nodes=None,
            progress=None, query=None, top_left=None, bottom_right=None):
        result = self._get_reports(t_start, t_end, nodes, progress, query, top_left, bottom_right)
        return list(result)

    def _get_reports(
            self, t_start=None, t_end=None, nodes=None,
            progress=None, query=None, top_left=None, bottom_right=None):
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

        if progress is not None and 0 < len(progress):
            if progress == 'finished':
                conditions.append('finished = 1')
                conditions.append('level > 0')
            elif progress == 'unfinished':
                conditions.append('finished = 0')
                conditions.append('level > 0')

        if query is not None and 0 < len(nodes):
            conditions.append("user regexp '^.*%s.*'" % query)

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

        cols = 'id, type, user, st_astext(geo), timestamp, image, comment, address, level, finished'
        col_keys = [
            'id', 'type', 'user', 'geo', 'timestamp', 'image', 'comment', 'address', 'level', 'finished'
        ]

        if len(conditions) == 0:
            sql = 'SELECT %s FROM minarepo ORDER BY timestamp DESC;' % cols
        else:
            cond = ' AND '.join(conditions)
            sql = 'SELECT %s FROM minarepo WHERE %s ORDER BY timestamp DESC;' % (cols, cond)

        with self.connection() as conn:
            print 'sql=%s' % sql
            print 'sql-args=%s' % args
            cursor = conn.cursor()
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
            except:
                conn.rollback()
                raise
            else:
                conn.commit()
            finally:
                cursor.close()

    def get_report(self, report_id):
        cols = 'id, type, user, astext(geo), timestamp, image, comment, address, level, finished'
        col_keys = [
            'id', 'type', 'user', 'geo', 'timestamp', 'image', 'comment', 'address', 'level', 'finished'
        ]
        sql = 'SELECT %s FROM minarepo WHERE id = %%s;' % cols

        with self.connection() as conn:
            ret = dict()
            cursor = conn.cursor()
            try:
                cursor.execute(sql, (report_id,))
                result = list(cursor.fetchall())[0]
                for i, col in enumerate(col_keys):
                    ret[col] = result[i]
                ret['geo'] = parse_geo_point(ret['geo'])
            except:
                conn.rollback()
                raise
            else:
                conn.commit()
            finally:
                cursor.close()

        return ret

    def insert_report(self, repo_type, user, lat, lon, img, comm, key):
        timestamp = strftime('%Y-%m-%d %H:%M:%S')
        addr = geo2addr(lat, lon, key)
        sql = "INSERT INTO minarepo (type, user, geo, timestamp, image, comment, address) " \
            "VALUES (%s, %s, ST_GeomFromText('POINT(%s %s)'), %s, %s, %s, %s)"
        args = (repo_type, user, float(lat), float(lon), timestamp, img, comm, addr)

        with self.connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(sql, args)
                conn.commit()
            except MySQLdb.Error as error:
                conn.rollback()
                print error
                return False
            finally:
                cursor.close()

            return True

    def get_comments(self, report_id, time_start=None, time_end=None):
        sql_params = []
        sql_conds = []

        if time_start:
            sql_conds.append('(%s <= timestamp)')
            sql_params.append(time_start)

        if time_end:
            sql_conds.append('(timestamp < %s)')
            sql_params.append(time_end)

        sql_conds.append('(report_id = %s)')
        sql_params.append(report_id)

        with self.connection() as conn:
            cursor = conn.cursor()
            try:
                cols = ('id', 'report_id', 'user', 'comment', 'image', 'timestamp')
                cond = ' AND '.join(sql_conds)
                sql = 'SELECT %s FROM comment WHERE %s ORDER BY timestamp ASC;' % (','.join(cols), cond)
                cursor.execute(sql, sql_params)
                ret = []
                for row in cursor.fetchall():
                    item = dict()
                    for i, col in enumerate(cols):
                        item[col] = row[i]
                    ret.append(item)
                return ret

            except:
                conn.rollback()
                raise
            else:
                conn.commit()

            finally:
                cursor.close()

    def insert_comment(self, report_id, comment, image, user='', timestamp=None):
        if timestamp is None:
            timestamp = datetime.datetime.now()

        with self.connection() as conn:
            sql = 'INSERT INTO comment(report_id, user, comment, image, timestamp) VALUES (%s, %s, %s, %s, %s);'
            sql_params = (report_id, user, comment, image, timestamp)

            cursor = conn.cursor()
            try:
                cursor.execute(sql, sql_params)
                conn.commit()
            except MySQLdb.Error as error:
                conn.rollback()
                print error
                return False
            finally:
                cursor.close()

            return True

    def finish_report_correspondence(self, report_id):
        with self.connection() as conn:
            sql = 'UPDATE minarepo SET finished=1 WHERE id=%s;' % report_id

            cursor = conn.cursor()
            try:
                cursor.execute(sql)
                conn.commit()
            except MySQLdb.Error as error:
                conn.rollback()
                print error
                return False
            finally:
                cursor.close()

            return True

    def revert_report_correspondence(self, report_id):
        with self.connection() as conn:
            sql = 'UPDATE minarepo SET finished=0 WHERE id=%s;' % report_id

            cursor = conn.cursor()
            try:
                cursor.execute(sql)
                conn.commit()
            except MySQLdb.Error as error:
                conn.rollback()
                print error
                return False
            finally:
                cursor.close()

            return True

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
            passwd=self._cfg['pass'],
            charset='utf8mb4'
        )
        self._last_comm = time.time()

    def _reconnect(self):
        self._close()
        self._connect()

    @contextmanager
    def connection(self):
        if self._last_comm + self._timeout < time.time():
            self._reconnect()

        try:
            yield self._conn
        except Exception as e:
            try:
                self._reconnect()
            except:
                pass
            raise e
        else:
            self._last_comm = time.time()
