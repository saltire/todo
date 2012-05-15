#!/usr/bin/python
import sys
sys.path.insert(0, '/home/saltire/lib/python2.6/site-packages')
sys.path.insert(0, '/home/saltire/flask')

from flup.server.fcgi import WSGIServer
from links import app

if __name__ == '__main__':
    WSGIServer(app).run()
