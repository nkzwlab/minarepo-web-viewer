# -*- coding: utf-8 -*-
import hashlib

from fabric.contrib.project import rsync_project
from fabric.api import task, sudo, cd, env, local, run

# import fabtools.files
from fabtools.files import is_dir, is_file
from fabtools import require


env.hosts = ['soxfujisawa.ht.sfc.keio.ac.jp']


def root_rsync(local_dir, remote_dir, exclude=[], delete=False):
    def _end_with_slash(dir_path):
        if dir_path[-1] == '/':
            return dir_path
        else:
            return dir_path + '/'
    local_dir = _end_with_slash(local_dir)
    remote_dir = _end_with_slash(remote_dir)
    m = hashlib.md5()
    m.update(remote_dir)
    me = local('whoami', capture=True)
    remote_tmp_dir = '/tmp/%s/%s/' % (me, m.hexdigest())
    run('mkdir -p %s' % remote_tmp_dir)
    if is_dir(remote_dir):
        run('rsync -a %s %s' % (remote_dir, remote_tmp_dir))  # already exists
    rsync_project(
        remote_dir=remote_tmp_dir,
        local_dir=local_dir,
        exclude=exclude,
        delete=delete
    )
    sudo('rsync -a %s %s' % (remote_tmp_dir, remote_dir))


@task
def setup_nginx():
    sudo('apt-get install -y nginx')
    sudo('rm -f /etc/nginx/sites-enabled/default')

    conf_name = 'minarepo-web-viewer'

    require.files.file(
        '/etc/nginx/sites-available/%s' % conf_name,
        source='./files/nginx/etc/nginx/sites-available/%s' % conf_name,
        owner='root', group='root', use_sudo=True
    )

    link_src = '/etc/nginx/sites-available/%s' % conf_name
    link_dest = '/etc/nginx/sites-enabled/%s' % conf_name
    sudo('rm -f %s' % link_dest)
    sudo('ln -s %s %s' % (link_src, link_dest))
    sudo('service nginx reload')


@task
def setup_supervisor():
    # NOTE: DID NOT CHECK IF IT WORKS !!!
    # NOTE: for debian-ish linux
    sudo('pip install supervisor')
    sudo('mkdir -p /etc/supervisor/conf.d')
    sudo('mkdir -p /var/log/supervisor')

    require.files.file(
        '/etc/init.d/supervisor',
        source='./files/supervisor/etc/init.d/supervisor',
        owner='root', group='root', mode='0755', use_sudo=True
    )

    require.files.file(
        '/etc/supervisor/supervisord.conf',
        source='./files/supervisor/etc/supervisor/supervisord.conf',
        owner='root', group='root', use_sudo=True
    )

    # sudo('/etc/init.d/supervisor start')


@task
def setup_python():
    ez_setup_url = 'https://bootstrap.pypa.io/ez_setup.py'
    sudo('curl %s -o /tmp/ez_setup.py' % ez_setup_url)
    sudo('python /tmp/ez_setup.py')
    sudo('easy_install pip')
    sudo('pip install virtualenv')


@task
def tunnel():
    # ssh -L 10022:soxfujisawa.ht.sfc.keio.ac.jp:22 dali
    env.hosts = ['localhost:10022']


@task
def setup_mysql():
    pass  # FIXME


@task
def setup():
    sudo('apt-get install -y python-dev autoconf g++ libmysqlclient-dev')

    app_name = 'minarepo-web-viewer'

    require.files.directory(
        '/usr/local/%s' % app_name,
        owner='root', group='root', use_sudo=True
    )

    # copy mysql.secret.json
    require.files.file(
        '/usr/local/%s/mysql.secret.json' % app_name,
        source='./files/mysql.secret.json',
        owner='root', group='root', mode='0600', use_sudo=True
    )

    # put supervisord conf
    require.files.file(
        '/etc/supervisor/conf.d/%s.conf' % app_name,
        source='./files/supervisor/etc/supervisor/conf.d/%s.conf' % app_name,
        owner='root', group='root', use_sudo=True
    )

    # create virtualenv
    if not is_dir('/usr/local/%s/.venv' % app_name):
        with cd('/usr/local/%s' % app_name):
            sudo('virtualenv ./.venv')

    pip_path = '/usr/local/%s/.venv/bin/pip' % app_name
    sudo('%s install gunicorn' % pip_path)

    _deploy()

    sudo('supervisorctl reload')


@task
def deploy():
    _deploy()

    supervisor_app_name = 'minarepo-web-viewer'
    sudo('supervisorctl restart %s' % supervisor_app_name)


def _deploy():
    app_name = 'minarepo-web-viewer'
    root_rsync(
        './',
        '/usr/local/%s/app/' % app_name,
        exclude=['.git', 'data', '.venv', '*.tmp', '.DS_Store', '*.pyc', '*.egg-info'],
        delete=True
    )

    # install dependencies
    pip_path = '/usr/local/%s/.venv/bin/pip' % app_name
    python_path = '/usr/local/%s/.venv/bin/python' % app_name
    requirements_txt = '/usr/local/%s/app/requirements.txt' % app_name
    sudo('%s install -r %s' % (pip_path, requirements_txt))

    # install app package
    with cd('/usr/local/%s/app' % app_name):
        sudo('%s ./setup.py develop' % python_path)
