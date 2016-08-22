# -*- coding: utf-8 -*-
import logging
import re
import sys
import os
import os.path
import json
import datetime
import gzip
import cStringIO as StringIO
import hashlib
import base64

import click
from bottle import Bottle, HTTPResponse, request, response, route, static_file, auth_basic, BaseRequest
from jinja2 import Template

from dbaccess import MinaRepoDBA
from export import MRExportFile


DEFAULT_PORT = 3780


_pat_time_sep = re.compile(r'[\-: ]')


reload(sys)
sys.setdefaultencoding('utf-8')


def parse_time(t_start):
    chunks = re.split(_pat_time_sep, _pat_time_sep)
    y, m, d, hour, min, sec = [ int(c) for c in chunks ]
    return datetime.datetime(y, m, d, hour, min, sec)


def check(username, password):
    here = os.path.dirname(__file__)

    cfg_file = os.path.join(here, './config/.htpasswd')
    f = open(cfg_file, 'r')
    auth_check_word = f.readline()
    f.close()

    hs= hashlib.sha1()
    hs.update(password.encode("utf-8"))
    login_word = username + ":{SHA}" + str(base64.b64encode(hs.digest()).decode("utf-8"))

    return auth_check_word.strip() ==login_word.strip()


class MinaRepoViewer(object):

    def __init__(self, conf_file, static_dir=None, template_dir=None):
        assert conf_file and os.path.exists(conf_file)

        self._conf_file = conf_file
        with open(conf_file, 'rb') as fh:
            self._conf = json.load(fh)
            self._dba = MinaRepoDBA(self._conf['mysql_config'])
            self._api_key = self._conf['google_api_key']

        here = os.path.dirname(__file__)

        if static_dir is None:
            static_dir = os.path.join(here, './static')

        if template_dir is None:
            template_dir = os.path.join(here, './template')

        self._static_dir = static_dir
        self._template_dir = template_dir

    def _gzip(self, s):
        out = StringIO.StringIO()
        with gzip.GzipFile(fileobj=out, mode='w') as fh:
            fh.write(s)
        return out.getvalue()

    def _accept_gzip(self, request):
        return 'gzip' in request.get_header('Accept-Ecoding', '')

    def _render(self, tpl_name, *args, **kwargs):
        tpl_f = os.path.join(self._template_dir, tpl_name)
        with open(tpl_f, 'rb') as fh:
            content = fh.read().decode('utf-8')
            tpl = Template(content)
        return tpl.render(**kwargs)

    def html_index(self):
        return self._render('index.html.j2', API_KEY=self._api_key)

    def _json_response(self, data, status=200):
        status_msg = 'ok' if status == 200 else 'error'
        body_data = dict(
            status=status_msg,
            result=data
        )
        body = json.dumps(body_data)

        if self._accept_gzip(request):
            body = self._gzip(body)

        resp = HTTPResponse(body=body, status=status)
        resp.set_header('Content-Type', 'application/json')
        resp.set_header('Cache-Control', 'no-cache')
        resp.set_header('Pragma', 'no-cache')

        if self._accept_gzip(request):
            resp.set_header('Content-Encoding', 'gzip')

        return resp

    def api_reports(self):
        time_start = request.params.get('time_start', None)
        time_end = request.params.get('time_end', None)
        top_left = request.params.get('top_left', None)
        bottom_right = request.params.get('bottom_right', None)
        include_image = request.params.get('include_image', 'false')
        include_image = (include_image == 'true')

        if time_start:
            time_start = parse_time(time_start)

        if time_end:
            time_end = parse_time(time_end)

        nodes = request.params.get('nodes', None)
        if nodes:
            nodes = json.loads(nodes)
        else:
            # print 'nodes was None'
            nodes = None

        reports = self._dba.get_reports(time_start, time_end, nodes)
        # print '------------------'
        # print 'nodes=%s' % nodes
        # print 'len(reports)=%d' % len(reports)
        for r in reports:
            if not include_image:
                del r['image']
            r['timestamp'] = r['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            # print 'id=%d\ttype=%s\ttimestamp=%s\tuser=%s\tcomment=%s' % (
            #     r['id'],
            #     r['type'],
            #     r['timestamp'],
            #     r['user'],
            #     r['comment']
            # )

        result = dict(reports=reports)
        return self._json_response(result)

    def export_reports(self):
        try:
            time_start = request.params.get('time_start', None)
            time_end = request.params.get('time_end', None)
            top_left = request.params.get('top_left', None)
            bottom_right = request.params.get('bottom_right', None)

            if time_start:
                time_start = parse_time(time_start)

            if time_end:
                time_end = parse_time(time_end)

            nodes = request.params.get('nodes', None)
            if nodes:
                nodes = json.loads(nodes)
            else:
                print 'nodes was None'
                nodes = None

            exporter = MRExportFile(self._dba)
            exporter.export(
                time_start, time_end, nodes, top_left, bottom_right
            )

            now = datetime.datetime.now()
            download_fname = 'minarepo_%s.csv' % now.strftime('%Y%m%d%H%M%S')
            dispo = ('attachment; filename="%s"' % download_fname).encode('utf-8')
            response.set_header('Content-Disposition', dispo)
            response.content_type = 'text/csv; charset=cp932'
            with open(exporter.file_name, 'rb') as fh:
                while True:
                    chunk = fh.read(1024 * 4)
                    if chunk == '':
                        break
                    yield chunk
            exporter.remove_file()
        except Exception as e:
            logging.exception('error')

    def insert_report(self):
        report_type = request.forms.get('type', None)
        user = request.forms.get('user', None)
        lat = request.forms.get('latitude', None)
        lon = request.forms.get('longitude', None)
        image = request.forms.get('image', '')
        comment = request.forms.get('comment', '')
        api_key = self._api_key

        ret = self._dba.insert_report(report_type, user, lat, lon, image, comment, api_key)
        if not ret:
            return self._json_response(ret, 500)
        return self._json_response(ret)

    def api_detail(self, report_id):
        report = self._dba.get_report(report_id)
        report['timestamp'] = report['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        result = dict(report=report)
        return self._json_response(result)

    def static(self, file_name):
        return static_file(file_name, root=self._static_dir)

    def create_wsgi_app(self):
        app = Bottle()
        BaseRequest.MEMFILE_MAX = 1024 * 1024

        app.route('/static/<file_name:path>', ['GET'], self.static)

        # app.route('/', ['GET'], self.html_index)
        app.route('/api/reports', ['GET', 'POST'], self.api_reports)
        app.route('/api/detail/<report_id>', ['GET'], self.api_detail)
        app.route('/export/reports', ['GET', 'POST'], self.export_reports)
        app.route('/post/new_report', ['POST'], self.insert_report)

        @app.route('/', method='GET')
        @auth_basic(check)
        def minarepo_home():
            return self.html_index()

        @app.route('/new_report', method='GET')
        @auth_basic(check)
        def minarepo_new_report():
            return self._render('new-report.html.j2', API_KEY=self._api_key)

        return app


# for gunicorn
def build_wsgi_app(conf, static_dir, template_dir):
    app = MinaRepoViewer(conf, static_dir, template_dir)
    return app.create_wsgi_app()


@click.command()
@click.option('-c', '--config', help='Config file(json)')
@click.option('-s', '--static-dir', default=None)
@click.option('-t', '--template-dir', default=None)
@click.option('-p', '--port', type=int, default=DEFAULT_PORT)
def main(config, static_dir, template_dir, port):
    from wsgiref.simple_server import make_server

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    app = MinaRepoViewer(config, static_dir, template_dir)
    wsgi_app = app.create_wsgi_app()

    server = make_server('', port, wsgi_app)
    print 'port=%d' % port
    server.serve_forever()


if __name__ == '__main__':
    main()
