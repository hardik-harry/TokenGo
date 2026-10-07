from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify, request
from models import db
from models.user import User
from models.service import Service
from models.token import Token
from models.notification import Notification
from services.wait_time import WaitTimeCalculator
from services.notification import NotificationService
from functools import wraps

citizen_bp = Blueprint('citizen', __name__, url_prefix='/citizen')

def citizen_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access your citizen dashboard.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


@citizen_bp.route('/dashboard')
@citizen_required
def dashboard():
    user_id = session['user_id']
    user = User.query.get(user_id)

    # 1. Fetch active token (waiting or serving)
    current_token_obj = Token.query.filter(
        Token.user_id == user_id,
        Token.status.in_(['waiting', 'serving'])
    ).order_by(Token.created_at.desc()).first()

    current_token_data = None
    if current_token_obj:
        stats = WaitTimeCalculator.calculate_token_stats(current_token_obj)
        current_token_data = current_token_obj.to_dict()
        current_token_data['people_ahead'] = stats['people_ahead']
        current_token_data['estimated_wait'] = stats['estimated_wait']
        current_token_data['current_serving_token'] = stats['current_serving_token']
        # Calculate progress percentage (e.g. 100 - (people_ahead * 10))
        progress_pct = max(10, min(100, 100 - (stats['people_ahead'] * 12)))
        current_token_data['progress_pct'] = progress_pct if current_token_obj.status == 'waiting' else 100

    # 2. Fetch Recent Tokens (all past tokens)
    recent_tokens = Token.query.filter_by(user_id=user_id).order_by(Token.created_at.desc()).limit(5).all()

    # 3. Unread Notifications
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(5).all()

    return render_template(
        'citizen/dashboard.html',
        user=user,
        current_token=current_token_data,
        recent_tokens=recent_tokens,
        notifications=notifications
    )


@citizen_bp.route('/services')
@citizen_required
def services():
    all_services = Service.query.filter_by(status='active').all()
    services_data = [s.to_dict() for s in all_services]
    
    user_id = session['user_id']
    active_token = Token.query.filter(
        Token.user_id == user_id,
        Token.status.in_(['waiting', 'serving'])
    ).first()

    return render_template('citizen/services.html', services=services_data, active_token=active_token)


@citizen_bp.route('/token/<int:token_id>')
@citizen_required
def view_token(token_id):
    user_id = session['user_id']
    token = Token.query.filter_by(id=token_id, user_id=user_id).first_or_404()

    stats = WaitTimeCalculator.calculate_token_stats(token)
    token_dict = token.to_dict()
    token_dict['people_ahead'] = stats['people_ahead']
    token_dict['estimated_wait'] = stats['estimated_wait']
    token_dict['current_serving_token'] = stats['current_serving_token']

    return render_template('citizen/token.html', token=token_dict)


@citizen_bp.route('/history')
@citizen_required
def history():
    user_id = session['user_id']
    status_filter = request.args.get('status', 'all')
    page = request.args.get('page', 1, type=int)

    query = Token.query.filter_by(user_id=user_id)
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)

    pagination = query.order_by(Token.created_at.desc()).paginate(page=page, per_page=10, error_out=False)
    history_tokens = pagination.items

    return render_template(
        'citizen/history.html', 
        tokens=history_tokens, 
        pagination=pagination, 
        current_status=status_filter
    )


@citizen_bp.route('/notifications')
@citizen_required
def notifications():
    user_id = session['user_id']
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    
    # Mark unread as read when viewed
    unread_notifications = [n for n in notifications if not n.is_read]
    for n in unread_notifications:
        n.is_read = True
    db.session.commit()

    return render_template('citizen/notifications.html', notifications=notifications)

@citizen_bp.route('/notifications/mark-read', methods=['POST'])
@citizen_required
def mark_notifications_read():
    user_id = session['user_id']
    notifications = Notification.query.filter_by(user_id=user_id, is_read=False).all()
    for n in notifications:
        n.is_read = True
    db.session.commit()
    return jsonify({'status': 'success'})
