#!/usr/bin/env python 

# Include os for filesystem navigation, commands for execution of 
# java code, and sys/getopt for handling commandline arguments
import os, commands, sys, getopt

# Include hashlib and pickle to store hashes to check for unchanged code
# that doesn't need to be "recompiled"
import hashlib, pickle

# Include libraries for submission of the JS to Google's Closure Copiler.
# See: https://developers.google.com/closure/compiler/docs/api-tutorial1
import httplib, urllib, sys


### Configuration ###

# Path to local instance of Google's Closure Compiler to be used by default
# https://developers.google.com/closure/compiler/docs/gettingstarted_app
CC_PATH = "~/obsMonitor/utilities/closure_compiler/compiler.jar"


### Helper functions ###

def usage():
    """ Print usage info """
    print """
NAME
    jscompiler - Compile a directory of using Google's Closure Compiler

SYNOPSIS
    jscomipler.py [OPTIONS] ... [CODE DIRECTORY] [OUT FILE] 

DESCRIPTION
        Simple javascript "compiler" helper which recursively crawls through a given
    directory, gathering .js files in alphabetical order, submitting them to 
    the Google Closure Compiler (either through the web API or via a local instance 
    in Java), and saves the output into one big minified .min.js file.  Additionally, 
    the script builds up a set of hashes for code that it has compiled, and when it
    runs next, only recompiles code that has changed.  

    Configuration variables in script:
    CC_PATH     : Path to local instance of the Closure Compiler (used by default)

    Note: files with "nocompile" in their names are included without optimization.

OPTIONS:
    -l [ path to closure app ]
                        Specify the path to the local instance of Google's 
                        Closure Compiler and compile all code using it.
                        This requires that you have a working commandline 
                        java.  Alternatively, you can manually override the 
                        CC_PATH variable in the Config section of this script
                        and run with no options (default behavior is to use 
                        local compilation.)

    -o, --use-online    Submit the files to the online API for the Closure
                        Compiler.  Note: the script submits each file 
                        individually, so if you are frequently changing many
                        files and recompiling often, you can run into an API
                        request limit.  

    --no-compile        Gather all the files inline and save without 
                        compilation.  Useful for debugging.

    -h, --help          Show this dialog
"""


# Run a local compilation of code via Closure Compiler app
def local_compile( fName ):
    cmd = "java -jar " + CC_PATH + " --compilation_level SIMPLE_OPTIMIZATIONS --warning_level QUIET --js "
    cmd += fName
    return commands.getstatusoutput( cmd )


# Function to submit code to Google's Closure Compiler API online
def submit_code(inCode):
    # This code submits our javascript to Google's Clusure Compiler app 
    # (Stolen directly from the tutorial linked above)

    params = urllib.urlencode([
        ('js_code', inCode ),
        ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
        ('output_format', 'text'),
        ('output_info', 'compiled_code'),
      ])

    headers = { "Content-type": "application/x-www-form-urlencoded" }
    conn = httplib.HTTPConnection('closure-compiler.appspot.com')
    conn.request('POST', '/compile', params, headers)
    response = conn.getresponse()
    outCode = response.read()
    conn.close

    return outCode


# Submit code to the Closure Compiler online, asking for any errors
def get_errors(inCode):
    params = urllib.urlencode([
        ('js_code', inCode ),
        ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
        ('output_format', 'text'),
        ('output_info', 'errors'),
      ])
    headers = { "Content-type": "application/x-www-form-urlencoded" }
    conn = httplib.HTTPConnection('closure-compiler.appspot.com')
    conn.request('POST', '/compile', params, headers)
    response = conn.getresponse()
    errors = response.read()
    conn.close

    return errors


# Calculate an MD5 hash for a given string
def get_md5( inCode ):
    return hashlib.md5( inCode ).digest()


### Main application ###

def main(argv):
    useOnline = noCompile = False

    try:
        opts, args = getopt.getopt(argv, "hl:o", ["help", "no-compile", "use-online"]) 
    except getopt.GetoptError:
        usage()
        sys.exit(1)

    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            exit()
        if opt == "-l":
            global CC_PATH
            CC_PATH = arg
        elif opt in ("-o", "--use-online"):
            useOnline = True
        elif opt == "--no-compile":
            noCompile = True

    if len( args ) != 2:
        usage()
        sys.exit(1)
    jsdir, outfile = args[0].rstrip('/'), args[1]

    try:
        with open( "codeDB.pickle", "r") as f:
            codeDB = pickle.load( f )
    except:
        print "Starting new code database"
        codeDB = {}

    # Add all the files recursively in this directory that end in ".js"
    toAdd = []
    for path, dirs, files in os.walk(jsdir):
        for f in files:
            if f[-3:] == ".js":
                toAdd.append(path+"/"+f)

    # Sort them
    toAdd.sort()


    outJS = ""

    for fName in toAdd:
        with open( fName, "r" ) as f:
            code = f.read() 

        if noCompile or "nocompile" in fName:
            print "Including " + fName + " without compilation"
            outJS += code + "\n\n"
        else:
            codeMD5 = get_md5( code )

            if fName not in codeDB:
                codeDB[ fName ] = { "md5": "", "minJS": "" }
                print "Added and",

            if codeDB[ fName ]["md5"] != codeMD5:
                print "compiling " + fName
                if not useOnline:
                    result = local_compile( fName )
                    if result[0] == 0:
                        minJS = result[1]
                    else:
                        print "Errors found in " + fName 
                        print result[1]
                        exit(1)
                else:
                    minJS = submit_code( code )
                    if not minJS.strip():
                        print fName + " returned empty!  Assuming errors, resubmitting for details..."
                        print get_errors( code )
                        exit(1)
                    if minJS.strip()[:10] == "Error(22):":
                        print "\nWe have hit the Closure API's submit limit for the hour"
                        print "consider running a local version of the app\n"
                        print minJS
                        exit(1)
            else:
                # If code hasn't changed, use stored code
                minJS = codeDB[ fName ]["minJS"]

            codeDB[ fName ]["md5"] = codeMD5
            codeDB[ fName ]["minJS"] = minJS
            outJS += minJS + "\n\n"

    # Write the output to outfile 
    with open( outfile, "w") as f:
        f.write( outJS )
    print "Compiling and optimzation successful (I think..)"

    with open( "codeDB.pickle", "w") as f:
        pickle.dump( codeDB, f)


if __name__ == "__main__":
    main(sys.argv[1:])
