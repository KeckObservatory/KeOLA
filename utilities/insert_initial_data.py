import pymongo, pickle

db = pymongo.Connection().obsLog

with open("initialData.pickle", "r") as f:
    data = pickle.load(f)

db.instruments.insert( data["instruments"] )
db.fitsViews.insert( data["fitsViews"] )

