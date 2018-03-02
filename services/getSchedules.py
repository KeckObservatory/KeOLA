# Library that enables  HTTP requests
try:
    from urllib.request import urlopen
except ImportError:
    from urllib2 import urlopen

from datetime import date, timedelta, datetime
import sys

def fromWeb( inDate ):
    """ Pulls schedules for a given date from the website and parses them into a dictionary """
    url = "http://www/observing/schedule/ws/telsched.php?date=" + inDate.strftime("%Y-%m-%d") + "&tel="

    schedules = {}
    for tel in [1,2]:
        schedules[ tel ] = {}
        print(url)
        response = urlopen( url + str(tel) )
        #result = response.read()
        #print(response)
        for line_number,line in enumerate(response):
        #sys.exit(0)
        #for s in result.split("\n"):
        #for s in result:
            s=line.decode('utf-8')
            #print (s)
            if "=" in s:
                kv = s.split("=")
                schedules[ tel ][ kv[0] ] = kv[1]
    return schedules

def parseTwilight( sched ):
    """ Parses a schedule's twilight entry into a dictionary """
    # Parse schedule's Twilight dictionary for storage in logs
    # ( This ugly looking one liner essentially just parses
    #   what is the serialization of a dictionary into a string
    #   back into the actual dictionary it represents )
    return dict( [[ y.strip("'") for y in x.split(":", 1)] for x in sched["Twilight"].strip("{}").split(",") ]  )

def findInstrEntry( dbInstruments, instrStr ):
    """ Find the matching instrument db entry for a given instrument string """
    for instrument in dbInstruments:
        if instrument["name"] in instrStr:
            return instrument
    return instrStr

def genLogs( d, db, errors ):
    """ Parses out database log entries from the schedule for a given date """

    # An empty list to append output logs
    outLogs = []

    # Get a list of all the entries in the "instruments" collection
    dbInstruments = [x for x in db.instruments.find()]

    # List of months to be used for really lame lower casing method
    mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    # Pull logs for this date
    for sched in fromWeb( d ).values():
        #print("******************** SCHEDULE ENTRY ******************")
        #print("Sched: "+str(sched))

        # Implentation of Dr. Rizzi's finite state machine algorithm for
        # parsing schedule entries.  The result we want is an array
        # which groups together any instrument account entries that
        # are sperated with a +, each grouping being an array of
        # dictionaries that have the form
        # { "instrEntry": ( database entry for the matching instrument,
        #                   or original instrument string if entry not found )
        #   "accountID" : ( The string of the parsed account ID or "" if none found )
        # }

        instrAcc = sched["InstrAcc"]
        obsList = [[]]
        inParens = False
        foundParens = False
        curInstrument = False
        splitPos = 0
        for i, ch in enumerate( instrAcc ):
            if ch == "(":
                foundParens = True
                inParens = True
                curInstrument = findInstrEntry( dbInstruments, instrAcc[ splitPos : i ] )
                splitPos = i+1
            elif ch == ")":
                inParens = False
                obsList[-1].append( { "instrEntry": curInstrument, "accountID":  instrAcc[ splitPos : i ] } )
            elif ch == "/" and inParens:
                obsList[-1].append( { "instrEntry": curInstrument, "accountID":  instrAcc[ splitPos : i ] } )
                splitPos = i+1
                obsList.append([])
            elif ch == "/" or ch == "+" or i == ( len(instrAcc)-1 ):
                if i == ( len(instrAcc)-1 ):
                    i+=1
                if not foundParens:
                    curInstrument = findInstrEntry( dbInstruments, instrAcc[ splitPos : i ] )
                    obsList[-1].append( { "instrEntry": curInstrument, "accountID": "" } )
                foundParens = False
                splitPos = i+1
                curInstrument = False
                if ch == "/":
                    obsList.append([])

        # Now that we have them split into separate entries and grouped by observers
        # we go through and try to generate the dataDirs list for each log

        # We will need to keep track of an account+id combos that appear
        # more than once so that we can append "_B", "_C" etc to the
        # date portion of their directory names
        splitTally = {}

        for obsGroup in obsList:
            #print("******************** OBSGROUP ENTRY ******************")
            #print(str(obsList))
            for obs in obsGroup:
                #print (type(obs['instrEntry']))
                if type(obs["instrEntry"]) is not dict:
                    errors.append("Omit: No instrument found matching " + obs["instrEntry"] )
                    obs["instrEntry"] = False
                elif obs["accountID"] == "":
                    try:
                        errors.append("Omit: No account ID found for "+ obs["instrEntry"]["name"]+" log." )
                    except:
                        errors.append("Omit: No account ID found for "+ str(obs["instrEntry"])+" log." )
                    obs["instrEntry"] = False
                else:
                    instr = obs["instrEntry"]
                    if (instr["dirName"]+obs["accountID"]) not in splitTally:
                        # The first of the duplicate instrument+id combos
                        # doesn't need anything appended after the date
                        obs["dateSuffix"] = ""
                        # Create an initial tally entry that will be incremented
                        # every new duplication of this instrument+id combo
                        splitTally[ instr["dirName"]+obs["accountID"] ] = "_A"
                    else:
                        # Pull the relevant tally
                        tal = splitTally[ instr["dirName"]+obs["accountID"] ]
                        # Increment it "_A" -> "_B", etc.
                        tal = tal[:-1] + chr( ord( tal[-1] ) + 1 )
                        splitTally [instr["dirName"]+obs["accountID"]] = tal

                        # Store it for later appending
                        obs["dateSuffix"] = tal

                    # Increment day by one, and store it in the observation
                    obs["date"] = (d+timedelta(days=1))

                    # Create dataDirs specific to this log entry by supplying
                    # this obs entry to the format string stored for each protoDir
                    obs["dataDirs"] = []
                    for pd in instr["protoDirs"]:
                        dir =  pd.format( **obs )

                        # Really lame way of lowercasing the months because I can't
                        # figure out any way to simply lower case within format spec
                        for m in mons:
                            if m in dir:
                                dir = dir.replace(m, m.lower() )

                        obs["dataDirs"].append( dir )


        # Now attempt to actually create the logs, appending details from the schedule if possible

        projSplit = sched["ProjCode"].split("/")
        obsSplit = sched["Observers"].split("/")
        piSplit = sched["Principal"].split("/")

        for i in range(len( obsList )) :
            for obs in [x for x in obsList[i] if x["instrEntry"]]:
                protoLog = {"instrument": obs["instrEntry"]["name"],
                    "project": "",
                    "observers": "",
                    "pi": "",
                    "sa": sched["SA"].strip(),
                    "oa": sched["OA"].strip(),
                    "utcDate": datetime.utcnow(),
                    "activeDirs": [],
                    "dataDirs": obs["dataDirs"] }
                # observers
                if i < len( obsSplit ) and obsSplit[i].strip()!="":
                    protoLog["observers"] = obsSplit[ i ].strip()
                else:
                    errors.append("Warning: Failed to find observers for "+obs["instrEntry"]["name"]+" log" )
                # projects
                if i < len( projSplit ) and projSplit[i].strip()!="":
                    protoLog["project"] = projSplit[ i ].strip()
                else:
                    errors.append("Warning: Failed to find project code for "+obs["instrEntry"]["name"]+" log")
                # PIs
                if i < len( piSplit ) and piSplit[i].strip()!="":
                    protoLog["pi"] = piSplit[ i ].strip()
                else:
                    errors.append("Warning: Failed to find PI information for "+obs["instrEntry"]["name"]+" log")

                outLogs.append( protoLog )
        
    # Return the log entries generated
    return outLogs

