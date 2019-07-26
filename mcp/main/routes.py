from flask import render_template, request, redirect, url_for, Blueprint

main = Blueprint('main', __name__)


@main.route("/")
@main.route("/home")
def home():
    page = request.args.get('page', 1, type=int)
    return redirect(url_for('users.account'))


@main.route("/about")
def about():
    return render_template('about.html', title='About')
