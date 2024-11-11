from peewee import *

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


class Ad(BaseModel):
    advertiser = ForeignKeyField(Advertiser, backref='ads')
    headline = TextField()
    description = TextField()
    url = TextField()
    created_at = DateTimeField()


def create_tables():
    with database:
        database.create_tables([Advertiser, Ad])
