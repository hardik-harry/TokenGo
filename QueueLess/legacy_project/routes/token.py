from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify, session
from models import db
from models.token import Token
from services.queue_manager import QueueManager
from services.wait_time import WaitTimeCalculator
from functools import wraps

token_bp = Blueprint('token', __name__, url_prefix='/token')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
                return jsonify({'error': 'Unauthorized'}), 401
            flash('Please log in first.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


@token_bp.route('/generate', methods=['POST'])
@login_required
def generate():
    user_id = session['user_id']
    service_id = request.form.get('service_id', type=int)

    if not service_id:
        flash('Please select a valid service.', 'danger')
        return redirect(url_for('citizen.services'))

    # Check if user already has an active token (waiting or serving)
    existing_active = Token.query.filter(
        Token.user_id == user_id,
        Token.status.in_(['waiting', 'serving'])
    ).first()

    if existing_active:
        flash(f'You already have an active token ({existing_active.token_number}). Please complete or cancel it before generating a new token.', 'warning')
        return redirect(url_for('citizen.view_token', token_id=existing_active.id))

    try:
        token = QueueManager.create_token(user_id=user_id, service_id=service_id)
        flash(f'Virtual Token {token.token_number} generated successfully!', 'success')
        return redirect(url_for('citizen.view_token', token_id=token.id))
    except Exception as e:
        flash(f'Error generating token: {str(e)}', 'danger')
        return redirect(url_for('citizen.services'))


@token_bp.route('/track', methods=['GET', 'POST'])
def track():
    """Public Track Token Search Page."""
    searched_token_num = request.args.get('token_number') or request.form.get('token_number', '')
    token_data = None

    if searched_token_num:
        token = Token.query.filter_by(token_number=searched_token_num.strip().upper()).first()
        if token:
            stats = WaitTimeCalculator.calculate_token_stats(token)
            token_data = {
                'id': token.id,
                'token': token.token_number,
                'token_number': token.token_number,
                'service_name': token.service.service_name if token.service else 'General',
                'current_token': stats['current_serving_token'],
                'people_ahead': stats['people_ahead'],
                'queue_position': stats['queue_position'],
                'estimated_wait': stats['estimated_wait'],
                'counter': token.counter.counter_name if token.counter else 'Pending Assignment',
                'status': token.status.upper()
            }
        else:
            flash(f'Token "{searched_token_num}" was not found.', 'warning')

    return render_template('token_track.html', token_data=token_data, searched_token=searched_token_num)


@token_bp.route('/api/status/<int:token_id>')
def status_api(token_id):
    token = Token.query.get(token_id)
    if not token:
        return jsonify({'error': 'Token not found'}), 404

    stats = WaitTimeCalculator.calculate_token_stats(token)

    return jsonify({
        'id': token.id,
        'token': token.token_number,
        'token_number': token.token_number,
        'service_name': token.service.service_name if token.service else '',
        'counter': token.counter.counter_name if token.counter else 'Pending Assignment',
        'counter_number': token.counter.counter_name if token.counter else 'Pending Assignment',
        'status': token.status.upper(),
        'queue_position': stats['queue_position'],
        'position': stats['queue_position'],
        'people_ahead': stats['people_ahead'],
        'estimated_wait': stats['estimated_wait'],
        'estimated_wait_mins': stats['estimated_wait'],
        'current_token': stats['current_serving_token'],
        'current_serving_token': stats['current_serving_token']
    })


@token_bp.route('/cancel/<int:token_id>', methods=['POST'])
@login_required
def cancel(token_id):
    user_id = session['user_id']
    try:
        token = QueueManager.cancel_token(token_id, user_id)
        flash(f'Token {token.token_number} has been cancelled.', 'info')
    except Exception as e:
        flash(f'Failed to cancel token: {str(e)}', 'danger')

    return redirect(url_for('citizen.dashboard'))
