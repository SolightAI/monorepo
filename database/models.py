from peewee import *
from pydantic import BaseModel as PydanticBaseModel

database = SqliteDatabase('auction.db')

# model definitions -- the standard "pattern" is to define a base model class
# that specifies which database to use.  then, any subclasses will automatically
# use the correct storage.
class BaseModel(Model):
    class Meta:
        database = database


class Advertiser(BaseModel):
    name = CharField()
    created_at = DateTimeField()

    def asdict(self):
        return {
            "name": self.name,
            "created_at": self.created_at,
        }

class Ad(BaseModel):
    advertiser = ForeignKeyField(Advertiser, backref='ads')
    headline = TextField()
    description = TextField()
    url = TextField()
    created_at = DateTimeField()

    def asdict(self):
        return {
            "advertiser": self.advertiser.asdict(),
            "headline": self.headline,
            "description": self.description,
            "url": self.url,
            "created_at": self.created_at,
        }

class AdModel(PydanticBaseModel):
    headline: str
    description: str
    url: str


def create_tables():
    with database:
        database.create_tables([Advertiser, Ad])
