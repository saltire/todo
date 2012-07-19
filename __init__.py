import time

from flask import Flask
from flask import jsonify, redirect, render_template, request, session, url_for

from gtasks import GTasks


app = Flask(__name__)
app.secret_key = '\xf9\xeeV\x06~T\xc78j1C]\xfb\xddx\xad\xfb\xc8\xc5\x1b[g\x13%'

# google tasks specific stuff
client_id = '311996974047.apps.googleusercontent.com'
client_secret = 'w-OafbM5XFHXEyctLaxjZ5W2'
callback_uri = 'http://localhost:5000/callback'
gtasks = GTasks(client_id, client_secret, callback_uri)


@app.route('/callback')
def callback():
    code = request.args.get('code', '')
    
    response = gtasks.get_access_token(code)
    if 'access_token' in response:
        # store token to make requests with it
        session['token'] = response['access_token']
        session['expiry'] = time.time() + response['expires_in'];
        return redirect(url_for('index'))
    else:
        return 'Not authorized!'


@app.route('/')
def index():
    # check if token exists and has not expired
    if not session.get('token') or time.time() > session.get('expiry', 0):
        return redirect(gtasks.get_authorize_uri())
    
    gtasks.set_access_token(session['token'])
    
    def get_child_tasks(tasks, rootid=None):
        branch = []
        for task in tasks:
            if task.get('parent') == rootid:
                task['children'] = get_child_tasks(tasks, task['id'])
                branch.append(task)
        return branch
    
    # build a tree of tasks for each tasklist
    lists = []
    for tasklist in gtasks.do_request('tasklists.list')['items']:
        tasklist['items'] = get_child_tasks(gtasks.do_request('tasks.list', tasklist['id'])['items'])
        lists.append(tasklist)
    
    root = url_for('index').replace('/index.fcgi', '').rstrip('/')
    
    return render_template('tasks.html', lists=lists, root=root)


@app.route('/_add_task', methods=['post'])
def add_task():
    body = {
        'title': request.form.get('title'),
        'notes': request.form.get('notes')
        }
    response = gtasks.do_request('tasks.insert', request.form.get('tasklist'), body=body)
    return jsonify(response)


@app.route('/_delete_task', methods=['post'])
def delete_task():
    gtasks.do_request('tasks.delete', request.form.get('tasklist'), request.form.get('task'))
    return 'deleted'


@app.route('/_update_task', methods=['post'])
def update_task():
    fields = ('title', 'notes', 'updated', 'completed', 'status')
    #patch = {field: request.form[field] for field in fields if field in request.form}
    # older syntax for < 2.7 compatibility
    patch = dict((field, request.form[field]) for field in fields if field in request.form)
    
    # javascript null needs to be passed as None so requests will parse it properly
    for field, value in patch.iteritems():
        if value == 'null':
            patch[field] = None
    
    response = gtasks.do_request('tasks.patch', request.form.get('tasklist'), request.form.get('task'), body=patch)
    return repr(response)


@app.route('/_move_task', methods=['post'])
def move_task():
    fields = ('previous', 'parent')
    params = dict((field, request.form[field]) for field in fields if field in request.form)
    response = gtasks.do_request('tasks.move', request.form.get('tasklist'), request.form.get('task'), params=params)
    return repr(response)


if __name__ == '__main__':  
    app.debug = True
    app.run()
    
