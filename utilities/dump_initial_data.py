import pymongo, pickle

db = pymongo.Connection().obsLog

data = {"instruments": [x for x in db.instruments.find({}, {"_id": 0})], 
"fitsViews": [ x for x in db.fitsViews.find({}, {"_id": 0})] }

with open("initialData.pickle", "w") as f:
    pickle.dump(data, f)

