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
from contextlib import contextmanager, closing

import click
from bottle import (
    Bottle, HTTPResponse, request, response,
    route, static_file, auth_basic, BaseRequest,
    redirect
)
from jinja2 import Template
from beaker.middleware import SessionMiddleware


from dbaccess import MinaRepoDBA
from export import MRExportFile
from util import make_alchemy_session_class, random_str
from models import GeoLayer


DEFAULT_PORT = 3780


_pat_time_sep = re.compile(r'[\-: ]')


reload(sys)
sys.setdefaultencoding('utf-8')


def parse_time(t_start):
    chunks = re.split(_pat_time_sep, t_start)
    y, m, d, hour, min, sec = [ int(c) for c in chunks ]
    return datetime.datetime(y, m, d, hour, min, sec)


def check(username, password):
    here = os.path.dirname(__file__)

    cfg_file = os.path.join(here, './config/.htpasswd')
    f = open(cfg_file, 'r')
    auth_check_word = f.readline()
    f.close()

    hs = hashlib.sha1()
    hs.update(password.encode("utf-8"))
    login_word = username + ":{SHA}" + str(base64.b64encode(hs.digest()).decode("utf-8"))

    return (auth_check_word.strip() == login_word.strip())


class MinaRepoViewer(object):

    def __init__(self, mysql_conf_file, static_dir=None, template_dir=None):
        assert mysql_conf_file and os.path.exists(mysql_conf_file)

        self._mysql_conf_file = mysql_conf_file
        with open(mysql_conf_file, 'rb') as fh:
            self._mysql_conf = json.load(fh)
            self._dba = MinaRepoDBA(self._mysql_conf)

        here = os.path.dirname(__file__)

        if static_dir is None:
            static_dir = os.path.join(here, './static')

        if template_dir is None:
            template_dir = os.path.join(here, './template')

        self._static_dir = static_dir
        self._template_dir = template_dir
        self._sess_cls = make_alchemy_session_class(self._mysql_conf)
        self._session_dir = '/tmp/minarepo.session'
        if not os.path.exists(self._session_dir):
            os.makedirs(self._session_dir)

    @contextmanager
    def session(self):
        with closing(self._sess_cls()) as session:
            yield session

    @property
    def beaker(self):
        return request.environ.get('beaker.session')

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
        dtime = datetime.datetime.now()
        dtime_str = dtime.strftime('%Y-%m-%d-%H-%M-%S')
        return self._render('index.html.j2', timestamp=dtime_str)

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
        progress = request.params.get('progress', None)
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

        query = request.params.get('query', None)
        if query is not None:
            query = query.strip()

        reports = self._dba.get_reports(time_start, time_end, nodes, progress, query)
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
        api_key = 'YOUR_API_KEY'

        ret = self._dba.insert_report(report_type, user, lat, lon, image, comment, api_key)
        if not ret:
            return self._json_response(ret, 500)
        return self._json_response(ret)

    def api_detail(self, report_id):
        report = self._dba.get_report(report_id)
        report['timestamp'] = report['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        result = dict(report=report)
        return self._json_response(result)

    def api_report_comments(self, report_id):
        time_start = request.params.get('time_start', None)
        time_end = request.params.get('time_end', None)

        if time_start:
            time_start = parse_time(time_start)

        if time_end:
            time_end = parse_time(time_end)

        try:
            report_id = int(report_id)
            comments = self._dba.get_comments(report_id, time_start, time_end)
            for comment in comments:
                comment['timestamp'] = comment['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        except:
            return self._json_response(None, 500)

        return self._json_response(comments)

    def api_comment_new(self, report_id):
        user = request.params.get('user', '')
        comment = request.params.get('comment', '')
        finished = request.params.get('finished', '')
        revert = request.params.get('revert', '')
        image = request.params.get('image', '')
        try:
            report_id = int(report_id)
            ret = self._dba.insert_comment(report_id, comment, image, user)
            if finished:
                self._dba.finish_report_correspondence(report_id)
            elif revert:
                self._dba.revert_report_correspondence(report_id)
        except:
            logging.exception('error')
            return self._json_response(None, 500)

        if not ret:
            return self._json_response(None, 500)
        return self._json_response(ret)

    def api_report_delete(self, report_id):
        report = self._dba.get_report(report_id)
        if not report:
            return self._json_response(None, 404)
        self._dba.delete(report_id)

        result = dict(deleted_report_id=report_id)
        return self._json_response(result)

    def static(self, file_name):
        return static_file(file_name, root=self._static_dir)

    def kml_index(self):
        session = self.beaker
        print 'kml_index'
        err, suc = [], []
        kml_layer_name = ''
        with self.session() as s:
            try:
                if request.method == 'POST':
                    csrf = request.params.get('csrf', '')
                    if session.get('csrf', '') != csrf:
                        print 'csrf token mismatch'
                        r = HTTPResponse(status=302)
                        r.set_header('Location: /kml/')
                        raise r

                    print 'method = POST'
                    name = request.params.get('name', '')
                    name = name.decode('utf-8')
                    upload = request.files.get('kml_file', '')
                    if not name:
                        err.append(u'KMLレイヤーの名前を入力してください')
                    else:
                        kml_layer_name = name

                    if not upload:
                        err.append(u'ファイルがアップロードされていません')

                    if not err:
                        tmp_fname = '/tmp/minarepo_kml_%s' % random_str(40)
                        upload.save(tmp_fname)
                        try:
                            with open(tmp_fname, 'rb') as fh:
                                fdata = fh.read()

                            geo_layer = GeoLayer(
                                name=name,
                                content=fdata,
                                file_size=len(fdata)
                            )
                            s.add(geo_layer)
                        finally:
                            os.remove(tmp_fname)

                    suc.append(u'KMLレイヤーを作成しました: %s' % name)
                    kml_layer_name = ''

                layers = s.query(GeoLayer).order_by(GeoLayer.created.desc())
                layers = [ l.to_api_dict() for l in layers ]

            except:
                s.rollback()
                raise
            else:
                s.commit()
                print 'commited'

        session['csrf'] = random_str(100)

        return self._render('kml.html.j2', err=err, suc=suc,
            layers=layers, kml_layer_name=kml_layer_name, session=self.beaker)

    def kml_file(self, kml_id):
        with self.session() as s:
            mime_type = 'application/vnd.google-earth.kml+xml'
            geo_layer = s.query(GeoLayer).filter_by(id=int(kml_id)).first()
            if not geo_layer:
                raise HTTPResponse(status=404, body='404 Not Found')

            resp = HTTPResponse(status=200, body=geo_layer.content)
            resp.set_header('Content-Type', mime_type)
            resp.set_header('Content-Length', str(geo_layer.file_size))
            if request.params.get('download', '') == 'true':
                fname = geo_layer.name + '.kml'
                fname = fname.replace('/', '_')
                resp.set_header('Content-Disposition', 'attachment; filename="%s"' % fname)
            else:
                resp.set_header('Content-Disposition', 'inline')
            return resp

    def api_kml_catalog(self):
        with self.session() as s:
            layers = s.query(GeoLayer)
            ret = [ dict(id=l.id, name=l.name) for l in layers ]
            return self._json_response(dict(layers=ret))

    def api_kml_delete(self, kml_id):
        with self.session() as s:
            geo_layer = s.query(GeoLayer).filter_by(id=int(kml_id)).first()
            if not geo_layer:
                raise HTTPResponse(status=404, body='404 Not Found')

            return self._json_response(dict(layer=dict(id=geo_layer.id, name=geo_layer.name)))

    def kml_update(self, kml_id):
        session = self.beaker
        with self.session() as s:
            geo_layer = s.query(GeoLayer).filter_by(id=int(kml_id)).first()
            if not geo_layer:
                raise HTTPResponse(status=404, body='404 Not Found')

            if request.method == 'POST':
                if session['csrf'] != request.params.get('csrf', ''):
                    return redirect('/')

                errors = []
                name = request.params.get('name', '')
                name = name.decode('utf-8')
                if not name:
                    errors.append(u'KMLレイヤーの名前が指定されていません')


                if len(errors) == 0:
                    upload = request.files.get('kml_file', '')
                    if upload:
                        tmp_fname = '/tmp/minarepo_kml_%s' % random_str(40)
                        try:
                            upload.save(tmp_fname)
                            with open(tmp_fname, 'rb') as fh:
                                fdata = fh.read()
                            geo_layer.content = fdata
                            geo_layer.file_size= len(fdata)
                        finally:
                            os.remove(tmp_fname)

                    geo_layer.name = name
                    s.add(geo_layer)
                    s.commit()
                    return redirect('/kml/')
                else:
                    return self._render(
                        'kml_update.html.j2', geo_layer=geo_layer, session=session,
                        errors=errors
                    )

        return self._render('kml_update.html.j2', geo_layer=geo_layer, session=session)

    def kml_delete(self, kml_id):
        session = self.beaker
        with self.session() as s:
            geo_layer = s.query(GeoLayer).filter_by(id=int(kml_id)).first()
            if not geo_layer:
                raise HTTPResponse(status=404, body='404 Not Found')

            if request.method == 'POST':
                if session['csrf'] != request.params.get('csrf', ''):
                    return redirect('/')

                confirmed = request.params.get('confirmed', None)
                if not confirmed:
                    session['csrf'] = random_str(100)
                    return self._render(
                        'kml_delete.html.j2',
                        geo_layer=geo_layer,
                        error=u'チェックしてください',
                        session=session
                    )

                s.delete(geo_layer)
                s.commit()
                return redirect('/kml/')
            else:
                session['csrf'] = random_str(100)
                return self._render('kml_delete.html.j2', geo_layer=geo_layer, session=session)

    def create_wsgi_app(self):
        app = Bottle(catchall=False)
        BaseRequest.MEMFILE_MAX = 1024 * 1024

        app.route('/static/<file_name:path>', ['GET'], self.static)

        # app.route('/', ['GET'], self.html_index)
        app.route('/api/reports', ['GET', 'POST'], self.api_reports)
        app.route('/api/detail/<report_id>', ['GET'], self.api_detail)
        app.route('/api/report/<report_id>/comments', ['GET'], self.api_report_comments)
        app.route('/api/report/<report_id>/comments/new', ['GET', 'POST'], self.api_comment_new)
        app.route('/api/report/<report_id>/delete', ['DELETE'], self.api_report_delete)

        app.route('/export/reports', ['GET', 'POST'], self.export_reports)
        app.route('/post/new_report', ['POST'], self.insert_report)

        app.route('/api/kml/catalog', ['GET'], self.api_kml_catalog)
        app.route('/api/kml/delete/<kml_id>', ['DELETE'], self.api_kml_delete)
        app.route('/kml/', ['GET', 'POST'], self.kml_index)
        app.route('/kml/file/<kml_id>', ['GET', 'POST'], self.kml_file)
        app.route('/kml/update/<kml_id>', ['GET', 'POST'], self.kml_update)
        app.route('/kml/delete/<kml_id>', ['GET', 'POST'], self.kml_delete)

        @app.route('/', method='GET')
        @auth_basic(check)
        def minarepo_home():
            return self.html_index()

        @app.route('/new_report', method='GET')
        @auth_basic(check)
        def minarepo_new_report():
            dtime = datetime.datetime.now()
            dtime_str = dtime.strftime('%Y-%m-%d-%H-%M-%S')
            return self._render('new-report.html.j2', timestamp=dtime_str)

        @app.route('/smartcheck', method='GET')
        @auth_basic(check)
        def minarepo_smartcheck():
            dtime = datetime.datetime.now()
            dtime_str = dtime.strftime('%Y-%m-%d-%H-%M-%S')
            return self._render('smartcheck.html.j2', timestamp=dtime_str)

        session_opts = {
            'session.type': 'file',
            'session.cookie_expires': 60 * 60 * 24 * 14,
            'session.data_dir': self._session_dir,
            'session.auto': True
        }
        app = SessionMiddleware(app, session_opts)

        return app


# for gunicorn
def build_wsgi_app(mysql_conf, static_dir, template_dir):
    app = MinaRepoViewer(mysql_conf, static_dir, template_dir)
    return app.create_wsgi_app()


@click.command()
@click.option('-m', '--mysql-conf', help='MySQL conf file(json)')
@click.option('-s', '--static-dir', default=None)
@click.option('-t', '--template-dir', default=None)
@click.option('-p', '--port', type=int, default=DEFAULT_PORT, help='port (default: %d)' % DEFAULT_PORT)
def main(mysql_conf, static_dir, template_dir, port):
    from wsgiref.simple_server import make_server

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    here = os.path.dirname(__file__)
    if static_dir is None:
        static_dir = os.path.abspath(os.path.join(here, './static'))
        print 'default static_dir: %s' % static_dir

    if template_dir is None:
        template_dir = os.path.abspath(os.path.join(here, './template'))
        print 'default template_dir: %s' % template_dir

    if not os.path.exists(static_dir):
        sys.stderr.write('static_dir not exists: %s\n' % static_dir)
        sys.exit(1)

    if not os.path.exists(template_dir):
        sys.stderr.write('template_dir not exists: %s\n' % template_dir)
        sys.exit(1)

    app = MinaRepoViewer(mysql_conf, static_dir, template_dir)
    wsgi_app = app.create_wsgi_app()

    server = make_server('', port, wsgi_app)
    print 'started at http://localhost:%d/' % port
    server.serve_forever()


if __name__ == '__main__':
    main()
