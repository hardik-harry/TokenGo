from datetime import datetime
from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify, request
from models import db
from models.user import User
from models.counter import Counter
from models.service import Service
from models.token import Token
from services.queue_manager import QueueManager
from functools import wraps

staff_bp = Blueprint('staff', __name__, url_prefix='/staff')
api_staff_bp = Blueprint('api_staff', __name__, url_prefix='/api/staff')

def staff_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
                return jsonify({'error': 'Unauthorized'}), 401
            flash('Please log in first.', 'warning')
            return redirect(url_for('auth.login'))
        if session.get('role') not in ['staff', 'admin']:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
                return jsonify({'error': 'Staff access required'}), 403
            flash('Access denied. Staff role required.', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function


@staff_bp.route('/dashboard')
@staff_required
def dashboard():
    staff_user = User.query.get(session['user_id'])
    
    counter = None
    if staff_user.counter_id:
        counter = Counter.query.get(staff_user.counter_id)

    available_counters = Counter.query.filter_by(status='active').all()
    all_services = Service.query.filter_by(status='active').all()

    current_token = None
    waiting_tokens = []
    completed_today_count = 0
    avg_service_time = 15

    if counter and counter.service_id:
        current_token = Token.query.filter_by(counter_id=counter.id, status='serving').first()
        waiting_tokens = Token.query.filter_by(service_id=counter.service_id, status='waiting').order_by(Token.created_at.asc()).all()
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
        completed_today_count = Token.query.filter(
            Token.counter_id == counter.id,
            Token.status == 'completed',
            Token.completed_at >= today_start
        ).count()

        service = Service.query.get(counter.service_id)
        if service:
            avg_service_time = service.average_service_time

    return render_template(
        'staff/dashboard.html',
        staff_user=staff_user,
        counter=counter,
        available_counters=available_counters,
        services=all_services,
        current_token=current_token,
        waiting_tokens=waiting_tokens,
        completed_today_count=completed_today_count,
        avg_service_time=avg_service_time
    )


@staff_bp.route('/queue')
@staff_required
def queue():
    staff_user = User.query.get(session['user_id'])
    counter = Counter.query.get(staff_user.counter_id) if staff_user.counter_id else None

    service_filter = request.args.get('service_id', type=int)
    if not service_filter and counter:
        service_filter = counter.service_id

    services = Service.query.filter_by(status='active').all()

    query = Token.query
    if service_filter:
        query = query.filter_by(service_id=service_filter)

    tokens_waiting = query.filter_by(status='waiting').order_by(Token.created_at.asc()).all()
    tokens_serving = query.filter_by(status='serving').order_by(Token.called_at.desc()).all()
    tokens_recent = query.filter(Token.status.in_(['completed', 'skipped'])).order_by(Token.completed_at.desc()).limit(10).all()

    return render_template(
        'staff/queue.html',
        staff_user=staff_user,
        counter=counter,
        services=services,
        selected_service_id=service_filter,
        waiting_tokens=tokens_waiting,
        serving_tokens=tokens_serving,
        recent_tokens=tokens_recent
    )


@staff_bp.route('/assign-counter', methods=['POST'])
@staff_required
def assign_counter():
    counter_id = request.form.get('counter_id', type=int)
    staff_user = User.query.get(session['user_id'])

    if counter_id:
        counter = Counter.query.get(counter_id)
        if counter:
            counter.staff_id = staff_user.id
            staff_user.counter_id = counter.id
            db.session.commit()
            flash(f'Successfully assigned to {counter.counter_name}.', 'success')
        else:
            flash('Counter not found.', 'danger')
    else:
        staff_user.counter_id = None
        db.session.commit()
        flash('Unassigned from counter.', 'info')

    return redirect(url_for('staff.dashboard'))


# --- Standard Web & JSON API Endpoints for Staff Dashboard ---

@staff_bp.route('/call-next', methods=['POST'])
@api_staff_bp.route('/call-next', methods=['POST'])
@staff_required
def call_next():
    staff_user = User.query.get(session['user_id'])
    if not staff_user.counter_id:
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Assign yourself to a counter first'}), 400
        flash('Please select and assign yourself to a counter first!', 'warning')
        return redirect(url_for('staff.dashboard'))

    try:
        token = QueueManager.call_next(staff_user.counter_id, staff_user.id)
        if token:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': True, 'message': f'Called Token {token.token_number}', 'token': token.to_dict()})
            flash(f'Called Token {token.token_number} to Counter!', 'success')
        else:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': False, 'message': 'No waiting tokens in queue'})
            flash('No waiting tokens in queue for this service.', 'info')
    except Exception as e:
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': str(e)}), 500
        flash(f'Error calling token: {str(e)}', 'danger')

    return redirect(url_for('staff.dashboard'))


@api_staff_bp.route('/start', methods=['POST'])
@staff_bp.route('/start', methods=['POST'])
@staff_required
def start_serving():
    data = request.get_json() or {}
    token_id = data.get('token_id') or request.form.get('token_id')
    staff_user = User.query.get(session['user_id'])

    if not token_id:
        # Start serving current counter token if present
        current = Token.query.filter_by(counter_id=staff_user.counter_id, status='serving').first()
        if current:
            return jsonify({'success': True, 'message': f'Serving token {current.token_number}', 'token': current.to_dict()})
        return jsonify({'success': False, 'message': 'Token ID required'}), 400

    token = Token.query.get(token_id)
    if not token:
        return jsonify({'success': False, 'message': 'Token not found'}), 404

    token.status = 'serving'
    token.counter_id = staff_user.counter_id
    token.called_at = datetime.utcnow()
    db.session.commit()

    if request.is_json or request.path.startswith('/api/'):
        return jsonify({'success': True, 'message': f'Started serving Token {token.token_number}', 'token': token.to_dict()})

    flash(f'Started serving Token {token.token_number}.', 'success')
    return redirect(url_for('staff.dashboard'))


@staff_bp.route('/complete/<int:token_id>', methods=['POST'])
@staff_bp.route('/complete', methods=['POST'])
@api_staff_bp.route('/complete', methods=['POST'])
@staff_required
def complete_token(token_id=None):
    if not token_id:
        data = request.get_json() or {}
        token_id = data.get('token_id') or request.form.get('token_id')

    try:
        token = QueueManager.complete_token(token_id)
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': True, 'message': f'Token {token.token_number} completed', 'token': token.to_dict()})
        flash(f'Token {token.token_number} marked as completed.', 'success')
    except Exception as e:
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': str(e)}), 500
        flash(f'Error: {str(e)}', 'danger')

    return redirect(url_for('staff.dashboard'))


@staff_bp.route('/skip/<int:token_id>', methods=['POST'])
@staff_bp.route('/skip', methods=['POST'])
@api_staff_bp.route('/skip', methods=['POST'])
@staff_required
def skip_token(token_id=None):
    if not token_id:
        data = request.get_json() or {}
        token_id = data.get('token_id') or request.form.get('token_id')

    try:
        token = QueueManager.skip_token(token_id)
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': True, 'message': f'Token {token.token_number} skipped', 'token': token.to_dict()})
        flash(f'Token {token.token_number} marked as skipped.', 'warning')
    except Exception as e:
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': str(e)}), 500
        flash(f'Error: {str(e)}', 'danger')

    return redirect(url_for('staff.dashboard'))


@staff_bp.route('/api/queue')
@api_staff_bp.route('/queue')
@staff_required
def queue_api():
    staff_user = User.query.get(session['user_id'])
    counter = Counter.query.get(staff_user.counter_id) if staff_user.counter_id else None

    if not counter or not counter.service_id:
        return jsonify({'waiting': [], 'serving': None, 'completed_today': 0})

    current_token = Token.query.filter_by(counter_id=counter.id, status='serving').first()
    waiting_tokens = Token.query.filter_by(service_id=counter.service_id, status='waiting').order_by(Token.created_at.asc()).all()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
    completed_today_count = Token.query.filter(
        Token.counter_id == counter.id,
        Token.status == 'completed',
        Token.completed_at >= today_start
    ).count()

    return jsonify({
        'serving': current_token.to_dict() if current_token else None,
        'waiting': [t.to_dict() for t in waiting_tokens],
        'completed_today': completed_today_count
    })
