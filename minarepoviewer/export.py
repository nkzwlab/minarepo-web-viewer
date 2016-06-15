# -*- coding: utf-8 -*-
import os.path

from util import random_str, build_excel_row


class MRExportFile(object):
    def __init__(self, dba):
        self._dba = dba
        self._fname = '/tmp/mrv_' + random_str(12) + '.csv'
        self._finished = False

    @property
    def file_name(self):
        if not self._finished:
            raise ValueError('not finished')
        return self._fname

    def export(self, t_start, t_end, nodes, top_left, bottom_right):
        result = self._dba._get_reports(
            t_start, t_end, nodes, top_left, bottom_right
        )

        col_names = [
            'id', 'type', 'user', 'geo', 'timestamp', 'comment', 'address'
        ]

        header_cols = [
            u'ID', u'レポート種別', u'レポート投稿者', u'GPS緯度', u'GPS経度', u'レポート投稿時刻', u'コメント', u'住所'
        ]

        type2japanese = dict(
            ps_animal=u'動物の死体',
            ps_illegalGarbage=u'不法投棄ごみ',
            ps_garbageStation=u'回収されていないゴミ',
            ps_graffiti=u'落書き',
            ps_damage=u'痛んだ道路',
            ps_streetlight=u'問題のある街灯',
            ps_kyun=u'キュン',
            ps_others=u'その他'
        )

        with open(self._fname, 'wb') as fh:
            fh.write(build_excel_row(header_cols))

            for report in result:
                values = []
                for c in col_names:
                    v = report[c]
                    if c == 'geo':
                        values.append(v[0])
                        values.append(v[1])
                    elif c == 'type':
                        values.append(type2japanese.get(v, '???'))
                    else:
                        values.append(v)

                excel_line = build_excel_row(values)
                fh.write(excel_line)

        self._finished = True

    def remove_file(self):
        if os.path.exists(self._fname):
            if not self._finished:
                raise ValueError('not finished')
            os.remove(self._fname)
