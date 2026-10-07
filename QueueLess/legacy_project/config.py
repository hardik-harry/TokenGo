import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'queueless-super-secret-key-2026-secure')
    
    # Database Configuration
    DB_TYPE = os.environ.get('DB_TYPE', 'sqlite')  # 'mysql' or 'sqlite'
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_NAME = os.environ.get('DB_NAME', 'queueless_db')

    if DB_TYPE == 'mysql':
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        # SQLite default for instant portability & test setup
        sqlite_db_path = os.path.join(BASE_DIR, 'database', 'queueless.db')
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_db_path}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_PERMANENT = False
    SESSION_TYPE = 'filesystem'
    
    # Secure Session Cookies Configuration
    SESSION_COOKIE_HTTPONLY = True          # Prevent client-side JS from reading the cookie
    SESSION_COOKIE_SAMESITE = 'Lax'         # Protection against Cross-Site Request Forgery (CSRF)
    # SESSION_COOKIE_SECURE = True          # Uncomment in production forcing HTTPS only
