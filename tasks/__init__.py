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


@app.route('/callback')
def callback():
    code = request.args.get('code', '')
    
    session['test'] = 'CALLBACK'
    
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
    print session.items()
    # check if logged in
    if not session.get('token') or time.time() > session.get('expiry', 0):
        return redirect(gtasks.get_authorize_uri())
    
    gtasks.set_access_token(session['token'])
    
    session['test'] = '___TEST___'
    print 'set session test'
    print session.items()
    
    def get_child_tasks(tasks, rootid=None):
        branch = []
        for task in tasks:
            if task.get('parent') == rootid:
                task['children'] = get_child_tasks(tasks, task['id'])
                branch.append(task)
        return branch
    
    lists = []
    session['lists'] = gtasks.do_request('tasklists.list')['items']
    for tasklist in session['lists']:
        tasklist['items'] = get_child_tasks(gtasks.do_request('tasks.list', tasklist['id'])['items'])
        lists.append(tasklist)
    
    return render_template('tasks.html', lists=lists)


@app.route('/_update_task', methods=['put', 'get'])
def update():
    print "vvvvv"
    print session.items()
    print "^^^^^"
    tasklist = (tasklist for tasklist in session['lists'] if tasklist['id'] == request.form.get('tasklist'))[0]    
    task = (task for task in tasklist['items'] if task['id'] == request.form.get('task'))[0]
    
    fields = ('title', 'updated', 'completed')
    task.update({field: request.form[field] for field in fields if field in request.form})
    
    response = gtasks.do_request('tasks.update', tasklist['id'], task['id'], body=task)
    return response
    


if __name__ == '__main__':
    app.debug = True
    app.run()
    