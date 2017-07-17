# -*- coding: utf-8 -*-


import datetime

from sqlalchemy import (
    event,
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    Boolean,
)
from sqlalchemy.types import BigInteger, Float
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
#from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import (
    backref,
    relationship,
)

from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


class GeoLayer(Base):
    __tablename__ = 'geo_layer'
    id = Column(BigInteger, primary_key=True)
    name = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created = Column(DateTime, nullable=False, default=datetime.datetime.now)

    def to_api_dict(self):
        return dict(
            id=self.id,
            name=self.name,
            created=self.created.strftime('%Y-%m-%d %H:%M:%S')
        )
