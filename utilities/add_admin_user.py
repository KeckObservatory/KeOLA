import pymongo
from getpass import getpass
from hashlib import md5

user = raw_input("Username: ")
password = getpass("Password: ")

db = pymongo.Connection().obsLog

db.users.save({ "username": user, "password": md5( password ).hexdigest()  })
