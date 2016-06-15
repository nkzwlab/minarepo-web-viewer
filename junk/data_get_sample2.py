# -*- coding: utf-8 -*-
import os.path
import datetime
import sys
import json

import click

import MySQLdb


@click.command()
@click.option('-c', '--config-file', help='config file')
def main(config_file):
    if not config_file:
        print 'missing config file option(-c/--config-file)'
        sys.exit(-1)
    elif not os.path.exists(config_file):
        print 'not found: %s' % config_file
        sys.exit(-1)

    with open(config_file, 'rb') as fh:
        config = json.load(fh)

    print 'MySQL host=%s' % config['host']
    print 'MySQL db=%s' % config['db']

    conn = MySQLdb.connect(
        db=config['db'],
        host=config['host'],
        user=config['user'],
        passwd=config['pass']
    )

    cursor = conn.cursor()

    sql = 'SELECT id, type, user, ST_ASTEXT(geo), timestamp, comment FROM minarepo;'
    cursor.execute(sql)
    rows = cursor.fetchall()
    for row in rows:
        print 'wei'
        print row


if __name__ == '__main__':
    main()
