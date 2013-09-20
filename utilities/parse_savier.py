import mysql.connector
import pickle
from datetime import date, datetime, timedelta
import time
import pymongo

class KeepConnected:
    def __init__(self, user, password, host, database):
        self.user, self.password, self.host, self.database = user, password, host, database

    def connect(self):
        self.connection = mysql.connector.connect(user=self.user, password=self.password , \
                                             host=self.host, database=self.database)
        self.cur = self.connection.cursor()

    def listFromQuery(self, query, args=tuple()):
        for s in [5, 15, 30, 60, 120, 240]:
            try:
                self.cur.execute(query, args)
            except mysql.connector.errors.InterfaceError:
                print "Connection lost, reconnecting in", s, "seconds"
                time.sleep( s ) 
                self.connect()
            else:
                try:
                    return [x for x in self.cur]
                except mysql.connector.errors.InterfaceError:
                    print "Connection lost, reconnecting in", s, "seconds"
                    time.sleep( s ) 
                    self.connect()
        print "Ran out of reconnect"
        exit( 1 )

    def close(self):
        self.connection.close() 
            

conn = KeepConnected(user="savier", password="savier", host="mysqlserver", database="savier")
conn.connect()

db = pymongo.Connection().obsLog2

#instrs = {"deimos":[], "esi":[], "hires":[], "lris":[], "mosfire":[], "nirc2":[], "nirspec":[], "osiris":[]}
#instrs = {"deimos":{}, "esi":{}, "hires":{}, "lris":{}, "mosfire":{}, "nirc2":{}, "nirspec":{}, "osiris":{}}
#instrs = {"deimos":0, "esi":0, "hires":0, "lris":0, "mosfire":0, "nirc2":0, "nirspec":0, "osiris":0}
instrs = {"osiris": 0}

pageSize = 10

tot = db.fits.find().count()

for i, instr in instrs.iteritems():

    print "Getting count and keys for", i

    keys = [x[0] for x in conn.listFromQuery("DESC "+i)]

    count = conn.listFromQuery("select COUNT(Id) from "+i)[0][0]

    parsed = db.fits.find({"instrument": i}).count()

    print "Parsing..."

    for offset in range(parsed, count, pageSize):
        start = datetime.now()

        rows = conn.listFromQuery("SELECT * from "+i+" LIMIT %s OFFSET %s", (pageSize, offset))
        results = [ dict([ (keys[j], v) for j, v in enumerate(x) ]) for x in rows]

        for r in results:
            fn = r["FileName"]

            del r["FileName"]

            mod = r["ModDate"]

            del r["Id"]

            if "/" in fn:
                directory = fn[:fn.rfind("/")].rstrip("/")
                filename = fn[fn.rfind("/"):].lstrip("/")
            else:
                directory = ""
                filename = fn

            entry = {"filename": filename, 
                     "directory": directory,
                     "last_modified": mod,
                     "instrument": i,
                     "headers": [r]}

            db.fits.insert( entry )
            instr += 1

            #instr.append(entry)

            #if directory in instr:
            #    instr[ directory ].append( entry )
            #else:
            #    instr[ directory ] = [ entry ]

        #print i, (offset/pageSize)+1, "of", (count/pageSize)+1, ":", [(k, len(x)) for k, x in instrs.iteritems()] 
        secs = (datetime.now()-start).total_seconds()
        prev = tot
        tot = db.fits.find().count()
        print i, (offset/pageSize)+1, "of", (count/pageSize)+1, ":", tot, "entries total", ((tot-prev)/secs), "per second" 
        time.sleep( 5 )
                
conn.close()

