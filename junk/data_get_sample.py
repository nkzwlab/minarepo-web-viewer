# -*- coding: utf-8 -*-
import os.path
import datetime
import sys
import json

import click

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DECIMAL, DATETIME, create_engine
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.mysql import MEDIUMTEXT

from geoalchemy import GeometryColumn, Point
from geoalchemy.mysql import MySQLComparator


Base = declarative_base()


class Minarepo(Base):
    __tablename__ = "minarepo"
    id = Column('id', Integer, primary_key=True, autoincrement=True)
    type = Column("type", String(100))
    user = Column("user", String(100))
    geo = GeometryColumn("geo", Point(dimension=2, srid=4326), nullable=False, comparator=MySQLComparator)
    timestamp = Column("timestamp", DATETIME, nullable=False)
    image = Column("image", MEDIUMTEXT, nullable=True)
    comment = Column("comment", MEDIUMTEXT, nullable=True)


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

    url = 'mysql://%(user)s:%(pass)s@%(host)s/%(db)s' % config
    engine = create_engine(url, encoding='utf-8', echo=False)

    Session = sessionmaker()
    Session.configure(bind=engine)

    session = Session()

    reports = session.query(Minarepo).all()

    for r in reports:
        r_type = r.type
        r_user = r.user
        r_lat = r.geo.x
        r_lng = r.geo.y
        r_ts = r.timestamp

        print 'type=%s, user=%s, lat=%s, lng=%s, timestamp=%s' % (
            r_type, r_user, r_lat, r_lng, r_ts
        )


if __name__ == '__main__':
    main()
