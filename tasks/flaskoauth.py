from flask import Flask

from flask.ext.oauth import OAuth

oauth = OAuth()

client_id = '311996974047.apps.googleusercontent.com'
client_secret = 'w-OafbM5XFHXEyctLaxjZ5W2'
site = 'https://accounts.google.com'
redirect_uri = 'http://www.saltiresable.com/saltflask/callback'
auth_uri = '/o/oauth2/auth'
token_uri = '/o/oauth2/token'


tasks = oauth.remote_app('tasks',
    base_url=site,
    authorize_url=auth_uri,
    request_token_url='https://www.googleapis.com/auth/tasks',
    access_token_url='/o/oauth2/auth',
    consumer_key=client_id,
    consumer_secret=client_secret
)