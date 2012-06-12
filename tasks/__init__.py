import time

from flask import Flask
from flask import jsonify, redirect, render_template, request, session, url_for

from gtasks import GTasks


app = Flask(__name__)
app.secret_key = '\xf9\xeeV\x06~T\xc78j1C]\xfb\xddx\xad\xfb\xc8\xc5\x1b[g\x13%'

client_id = '311996974047.apps.googleusercontent.com'
client_secret = 'w-OafbM5XFHXEyctLaxjZ5W2'
callback_uri = 'http://localhost:5000/callback'

gtasks = GTasks(client_id, client_secret, callback_uri)


@app.route('/authorize')
def authorize():
    # redirect to this authorize uri
    # it will redirect back to redirect_uri passing 'code' as a param
    return redirect(gtasks.get_authorize_uri())
    
    
@app.route('/callback')
def callback():
    code = request.args.get('code', '')
    
    response = gtasks.get_access_token(code)
    if 'access_token' in response:
        # store token to make requests with it
        session['token'] = response['access_token']
        session['expiry'] = response['expires_in'] + time.time()
        return redirect(url_for('index'))
    else:
        return 'Not authorized!'


@app.route('/')
def index():
    # check if logged in
    if not session.get('token') or session.get('expiry', 0) < time.time():
        return redirect(url_for('authorize'))
    gtasks.set_access_token(session['token'])
    
    def get_child_tasks(tasks, rootid=None):
        branch = []
        for task in tasks:
            if task.get('parent') == rootid:
                task['children'] = get_child_tasks(tasks, task['id'])
                branch.append(task)
        return branch
    
    lists = []
    for tasklist in gtasks.do_request('tasklists.list')['items']:
        tasklist['items'] = get_child_tasks(gtasks.do_request('tasks.list', tasklist['id'])['items'])
        lists.append(tasklist)
    
    return render_template('tasks.html', lists=lists)


@app.route('/_update_task')
def update():
    tasklist = request.args.get('tasklist')
    task = request.args.get('task')
    
    fields = {}
    for field in ('title', 'updated', 'completed'):
        value = request.args.get(field)
        if value is not None:
            fields[field] = value
    
    response = gtasks.do_request('tasks.update', tasklist, task, fields)
    return jsonify(response)
    


if __name__ == '__main__':
    app.debug = True
    app.run()
    