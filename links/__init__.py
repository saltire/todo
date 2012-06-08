from flask import Flask
from flask import redirect, render_template, request, url_for

from flask.ext.sqlalchemy import SQLAlchemy


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://saltire_sable:salieri@localhost/saltire_apps'
db = SQLAlchemy(app)



class Link(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    uri = db.Column(db.String(1024))

    def __init__(self, title, uri):
        self.title = title
        self.uri = uri



@app.route('/')
def list_links():
    return render_template('links.html', links=Link.query.all(), root=url_for('list_links'))


@app.route('/dump', methods=['POST'])
def dump_link():
    db.session.add(Link(title=request.form['title'], uri=request.form['uri']))
    db.session.commit()
    
    return redirect(url_for('list_links'))



if __name__ == '__main__':
    app.run(debug=True)
