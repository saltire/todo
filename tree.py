import time

from flask import Flask, g, jsonify, make_response, redirect, request, session, url_for

from gtasks import GTasks


app = Flask(__name__)
app.secret_key = '\xf9\xeeV\x06~T\xc78j1C]\xfb\xddx\xad\xfb\xc8\xc5\x1b[g\x13%'

CLIENT_ID = '311996974047.apps.googleusercontent.com'
CLIENT_SECRET = 'w-OafbM5XFHXEyctLaxjZ5W2'


@app.before_request
def init_gtasks():
    app.logger.debug('received request: ' + request.path)
    if request.endpoint == 'static':
        return

    callback_uri = url_for('callback', _external=True)
    g.gtasks = GTasks(CLIENT_ID, CLIENT_SECRET, callback_uri, logger=app.logger)

    if request.endpoint != 'callback':
        # check if token exists and has not expired
        if not session.get('token') or time.time() > session.get('expiry', 0):
            auth_uri = g.gtasks.get_authorize_uri()
            app.logger.debug('no token, redirecting to auth uri: ' + auth_uri)
            return redirect(auth_uri)

        app.logger.debug('token found in session')
        g.gtasks.set_access_token(session['token'])


@app.route('/callback')
def callback():
    code = request.args.get('code', '')
    app.logger.debug('got callback, requesting new token')

    response = g.gtasks.get_access_token(code)
    if 'access_token' in response:
        # store token to make requests with it
        session['token'] = response['access_token']
        session['expiry'] = time.time() + response['expires_in'];
        app.logger.debug('got new token, storing in session and redirecting to app index')
        return redirect(url_for('index'))
    else:
        return 'Not authorized!'


@app.route('/')
def index():
    return make_response(open('templates/tree.html').read())


@app.route('/get_tasks')
def get_tasks():
    def get_child_tasks(tasks, rootid=None):
        branch = []
        for task in tasks:
            if task.get('parent') == rootid:
                task['children'] = get_child_tasks(tasks, task['id'])
                branch.append(task)
        return branch

    # build a tree of tasks for each tasklist
    lists = []
    for tasklist in g.gtasks.do_request('tasklists.list').get('items', []):
        tasklist['items'] = get_child_tasks(g.gtasks.do_request('tasks.list', tasklist['id']).get('items', []))
        lists.append(tasklist)

    return jsonify({'tasklists': lists})



if __name__ == '__main__':
    app.debug = True
    app.run()
