# minarepo-web-viewer

minarepo's web viewer!!


## Technology Stack

- database: mysql 5.7
- server:
  - python 2.7
  - bottle (web app framework)
  - Jinja2 (template language)
- client responsive framework(css+js): Zurb Foundation
- client logic: React.js + Fluxxor
- client css: SCSS


## develop guide

### which file to edit?

- modify server side: edit minarepoviewer/server.py and minarepoviewer/dbaccess.py
- modify server html: edit minarepoviewer/template/index.html.j2 (note: template language is Jinja2)
- modify images: see minarepoviewer/static/img/*
- modify client logic: edit minarepoviewer/static/jsx/mrv.jsx and make sure compile it into mrv.js by jsx command
- modify css: edit minarepoviewer/static/scss/mrv.scss and make sure compile it into mrv.css by sass command


2. keep sass running to compile mrv.scss file into mrv.css like:

    $ cd minarepoviewer/static
    $ sass --scss --watch ./scss:./css


###install react-tools
You need react-tools to compile .jsx file into .js file.
  
    $ npm (-g) install react-tools
    $ cd minarepoviewer/static
    $ jsx -x jsx --watch ./jsx ./js

### prepare mysql

Install mysql and keep it running on your machine.

If you are using Mac:

    $ brew install mysql
    $ brew services start mysql

Then create database for the application.

    $ mysql -u root
    > CREATE DATABASE FujisawaMinaRepo;

### prepare mysql data


    soxfujisawa$ mysqldump -u soxfire -p FujisawaMinaRepo > ~/dump.sql
    local$ scp soxfujisawa:~/dump.sql /tmp/
    local$ mysql -u root FujisawaMinaRepo < /tmp/dump.sql


### prepare python

1. install pip ( sudo easy_install pip )
2. install virtualenv ( sudo pip install virtualenv )
3. create virtualenv with dir name ".venv" under project dir (ignored by .gitignore)
4. activate virtualenv (source ./.venv/bin/activate)
5. install depending libraries (pip install -r ./requirements.txt)

next time, you just activate virtualenv.


### prepare mysql connection config

    $ cp ./mysql.secret.json.template ./mysql.secret.json
    $ (edit mysql.secret.json)


### run web app on your machine

    $ python ./minarepoviewer/server.py -m ./junk/mysql.secret.json


Then MinaRepoVewier will runs on http://localhost:3780/

### interested in table schema?


see `schema.sql`  
or  
use `desc minarepo;` command in MySQL command line.
