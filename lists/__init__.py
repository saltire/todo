import time

from oauth2 import OAuth2

import requests

from flask import Flask
from flask import redirect, request, session, url_for


app = Flask(__name__)
app.secret_key = '\xf9\xeeV\x06~T\xc78j1C]\xfb\xddx\xad\xfb\xc8\xc5\x1b[g\x13%'

client_id = '311996974047.apps.googleusercontent.com'
client_secret = 'w-OafbM5XFHXEyctLaxjZ5W2'
site = 'https://accounts.google.com'
redirect_uri = 'http://localhost:5000/callback'
auth_uri = '/o/oauth2/auth'
token_uri = '/o/oauth2/token'
api_base = 'https://www.googleapis.com/tasks/v1'

handler = OAuth2(client_id, client_secret, site, redirect_uri, auth_uri, token_uri)


@app.route('/authorize')
def authorize():
    uri = handler.authorize_url('https://www.googleapis.com/auth/tasks', response_type='code')
    # redirect to this authorize uri
    # it will redirect back to redirect_uri passing 'code' as a param
    return redirect(uri)
    
    
@app.route('/callback')
def callback():
    code = request.args.get('code', '')
    print code
    response = handler.get_token(code, grant_type='authorization_code')
    if 'access_token' in response:
        # store token to make requests with it
        session['token'] = response['access_token']
        session['expiry'] = response['expires_in'] + time.time()
        return redirect(url_for('index'))
    else:
        return 'Not authorized!'


@app.route('/')
def index():
    if not 'token' in session:
        return redirect(url_for('authorize'))
    # do some stuff
    resp = requests.get('{0}/users/@me/lists'.format(api_base), params={'access_token': session['token']})
    
    lists = []
    for item in resp.json['items']:
        itreq = requests.get('{0}/lists/{1}/tasks'.format(api_base, item['id']), params={'access_token': session['token']})
        lists.append(itreq.json)
    return repr(lists[0]['items'][0])
    


if __name__ == '__main__':
    app.debug = True
    app.run()
    