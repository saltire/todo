import time

from flask import Flask, g, jsonify, redirect, render_template, request, session, url_for

from gtasks import GTasks


app = Flask(__name__)
app.secret_key = '\xf9\xeeV\x06~T\xc78j1C]\xfb\xddx\xad\xfb\xc8\xc5\x1b[g\x13%'

CLIENT_ID = '311996974047.apps.googleusercontent.com'
CLIENT_SECRET = 'w-OafbM5XFHXEyctLaxjZ5W2'


@app.errorhandler(Exception)
def error_handler(e):
    app.logger.error('Uncaught {0}: {1}'.format(type(e).__name__, e.message))
    return 'Encountered an error!'


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
@app.route('/tasklist/<tlid>')
def index(tlid=None):
    app.logger.debug('displaying index')

    root = url_for('index').rstrip('/')

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
        if tlid == tasklist['id']:
            # flag to tell javascript to scroll straight to the position of this tasklist
            tasklist['start'] = True
        tasklist['items'] = get_child_tasks(g.gtasks.do_request('tasks.list', tasklist['id']).get('items', []))
        lists.append(tasklist)

    return render_template('tasks.html', lists=lists, root=root)


@app.route('/_create_tasklist', methods=['post'])
def create_tasklist():
    body = {
        'title': request.form.get('title')
        }
    response = g.gtasks.do_request('tasklists.insert', body=body)
    return jsonify(response)


@app.route('/_delete_tasklist', methods=['post'])
def delete_tasklist():
    g.gtasks.do_request('tasklists.delete', request.form.get('tasklist'))
    return 'deleted tasklist'


@app.route('/_update_tasklist', methods=['post'])
def update_tasklist():
    patch = {'title': request.form['title']} if request.form.get('title') else {}
    response = g.gtasks.do_request('tasklists.patch', request.form.get('tasklist'), body=patch)
    return jsonify(response)


@app.route('/_add_task', methods=['post'])
def add_task():
    body = {
        'title': request.form.get('title'),
        'notes': request.form.get('notes')
        }
    params = {'parent': request.form['parent']} if 'parent' in request.form else {}
    response = g.gtasks.do_request('tasks.insert', request.form.get('tasklist'), params=params, body=body)
    return jsonify(response)


@app.route('/_remove_task', methods=['post'])
def remove_task():
    g.gtasks.do_request('tasks.delete', request.form.get('tasklist'), request.form.get('task'))
    return 'deleted task'


@app.route('/_update_task', methods=['post'])
def update_task():
    fields = ('title', 'notes', 'completed', 'status')
    #patch = {field: request.form[field] for field in fields if field in request.form}
    # older syntax for < 2.7 compatibility
    patch = dict((field, request.form[field]) for field in fields if field in request.form)

    # javascript null needs to be passed as None so requests will parse it properly
    for field, value in patch.iteritems():
        if value == 'null':
            patch[field] = None

    response = g.gtasks.do_request('tasks.patch', request.form.get('tasklist'), request.form.get('task'), body=patch)
    return jsonify(response)


@app.route('/_move_task', methods=['post'])
def move_task():
    fields = ('previous', 'parent')
    params = dict((field, request.form[field]) for field in fields if field in request.form)
    response = g.gtasks.do_request('tasks.move', request.form.get('tasklist'), request.form.get('task'), params=params)
    return jsonify(response)


@app.route('/_promote_task', methods=['get'])
def promote_task():
    pass


if __name__ == '__main__':
    app.debug = True
    app.run()
