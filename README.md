# minarepo-web-viewer

minarepo's web viewer!!


## prepare python env to develop


### install sass

You need to run sass on command line.

1. install sass http://sass-lang.com/install
2. keep sass running to compile mrv.scss file into mrv.css like:

    $ cd minarepoviewer/static
    $ sass --scss --watch ./scss:./css

### install babel

You need Babel ( https://babeljs.io/ ) to compile .jsx file into .js file.

    $ cd minarepoviewr/static
    $ babel --watch ./jsx --out-dir ./js

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


## run web app on your machine

    $ python ./minarepoviewer/server.py -m ./junk/mysql.secret.json
<<<<<<< HEAD


Then MinaRepoVewier will runs on http://localhost:3780/
=======
>>>>>>> 7ebe328dd1c0d6aa9a7de66e541a4e7a9fa8ab6e
