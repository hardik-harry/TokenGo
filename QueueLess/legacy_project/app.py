import os
from flask import Flask, render_template, session, redirect, url_for, jsonify, request
from config import Config
from models import db
from models.user import User
from models.service import Service
from models.counter import Counter
from models.token import Token
from models.notification import Notification
from services.wait_time import WaitTimeCalculator

from routes.auth import auth_bp
from routes.citizen import citizen_bp
from routes.staff import staff_bp, api_staff_bp
from routes.admin import admin_bp
from routes.token import token_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(citizen_bp)
    app.register_blueprint(staff_bp)
    app.register_blueprint(api_staff_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(token_bp)

    # Context processors for navigation status
    @app.context_processor
    def inject_user_context():
        current_user = None
        unread_count = 0
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
        return dict(current_user=current_user, unread_count=unread_count)

    # Landing page route
    @app.route('/')
    def index():
        if 'user_id' in session:
            role = session.get('role', 'citizen')
            if role == 'admin':
                return redirect(url_for('admin.dashboard'))
            elif role == 'staff':
                return redirect(url_for('staff.dashboard'))
            else:
                return redirect(url_for('citizen.dashboard'))

        active_services = Service.query.filter_by(status='active').all()
        return render_template('index.html', services=active_services)

    # Public JSON API Endpoint for Token Lookup by Token Number
    @app.route('/api/token/<string:token_number>')
    def api_token_by_number(token_number):
        token = Token.query.filter_by(token_number=token_number.strip().upper()).first()
        if not token:
            return jsonify({'error': 'Token not found'}), 404

        stats = WaitTimeCalculator.calculate_token_stats(token)

        return jsonify({
            'token': token.token_number,
            'service_name': token.service.service_name if token.service else '',
            'current_token': stats['current_serving_token'],
            'people_ahead': stats['people_ahead'],
            'queue_position': stats['queue_position'],
            'estimated_wait': stats['estimated_wait'],
            'counter': token.counter.counter_name if token.counter else 'Pending Assignment',
            'status': token.status.upper()
        })

    # Initialize Database tables and Seed Data if empty
    with app.app_context():
        db.create_all()
        seed_database_if_empty()

    return app


def seed_database_if_empty():
    """Initializes basic seed data if database is fresh."""
    if Service.query.count() == 0:
        services_data = [
            Service(id=1, service_name='Passport Services', description='New passport applications, renewals, and booklet modifications.', average_service_time=15, status='active'),
            Service(id=2, service_name='Aadhaar Services', description='Biometric updates, new card requests, and address corrections.', average_service_time=10, status='active'),
            Service(id=3, service_name='Driving Licence', description='Learners permit, driving license renewal, vehicle registration.', average_service_time=12, status='active'),
            Service(id=4, service_name='Certificates', description='Birth certificates, marriage registration, and income/caste certificates.', average_service_time=8, status='active'),
            Service(id=5, service_name='Land Records', description='Land title verification, mutation records, and property mapping.', average_service_time=20, status='active'),
            Service(id=6, service_name='Tax Payment', description='Property tax, commercial levies, and municipal tax payment processing.', average_service_time=12, status='active')
        ]
        db.session.bulk_save_objects(services_data)
        db.session.commit()

    if User.query.count() == 0:
        admin = User(
            id=1,
            name='System Administrator',
            email='admin@queueless.gov',
            mobile='9876543210',
            role='admin'
        )
        admin.set_password('password123')

        staff1 = User(
            id=2,
            name='Officer Rajesh Kumar',
            email='rajesh.staff@queueless.gov',
            mobile='9876543211',
            role='staff'
        )
        staff1.set_password('password123')

        staff2 = User(
            id=3,
            name='Officer Priya Sharma',
            email='priya.staff@queueless.gov',
            mobile='9876543212',
            role='staff'
        )
        staff2.set_password('password123')

        citizen1 = User(
            id=4,
            name='Aarav Mehta',
            email='aarav@citizen.com',
            mobile='9898012345',
            role='citizen'
        )
        citizen1.set_password('password123')

        db.session.add_all([admin, staff1, staff2, citizen1])
        db.session.commit()

    if Counter.query.count() == 0:
        counters_data = [
            Counter(id=1, counter_name='Counter A-101', service_id=1, staff_id=2, status='active'),
            Counter(id=2, counter_name='Counter B-201', service_id=2, staff_id=3, status='active'),
            Counter(id=3, counter_name='Counter C-301', service_id=3, staff_id=None, status='active'),
            Counter(id=4, counter_name='Counter D-401', service_id=4, staff_id=None, status='active')
        ]
        db.session.bulk_save_objects(counters_data)
        db.session.commit()


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
