from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
# from flask_login import LoginManager
from flask_user import login_required, UserManager, UserMixin
from flask_mail import Mail
from flask_migrate import Migrate
from mcp.config import Config


db = SQLAlchemy()
migrate = None
bcrypt = Bcrypt()
user_manager = None
# login_manager = LoginManager()
# login_manager.login_view = 'users.login'
# login_manager.login_message_category = 'info'
mail = Mail()


def create_app(config_class=Config):
    app = Flask(__name__)
    migrate = Migrate(app, db)
    app.config.from_object(Config)
    
    db.init_app(app)
    bcrypt.init_app(app)
    # login_manager.init_app(app)
    mail.init_app(app)

    user_manager = UserManager(app, db, models.User)
    # user_manager.login_view = 'users.login'
    # user_manager.login_message_category = 'info'

    from mcp.users.routes import users
    from mcp.main.routes import main
    from mcp.errors.handlers import errors
    app.register_blueprint(users)
    app.register_blueprint(main)
    app.register_blueprint(errors)

    return app
