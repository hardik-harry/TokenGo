from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify, request
from models import db
from models.user import User
from models.service import Service
from models.counter import Counter
from models.token import Token
from models.notification import Notification
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in first.', 'warning')
            return redirect(url_for('auth.login'))
        if session.get('role') != 'admin':
            flash('Access denied. Administrator privileges required.', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function


@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    total_citizens = User.query.filter_by(role='citizen').count()
    total_staff = User.query.filter_by(role='staff').count()
    total_services = Service.query.count()
    active_counters = Counter.query.filter_by(status='active').count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tokens_today = Token.query.filter(Token.created_at >= today_start).count()
    completed_tokens = Token.query.filter_by(status='completed').count()
    waiting_tokens = Token.query.filter_by(status='waiting').count()
    cancelled_tokens = Token.query.filter_by(status='cancelled').count()

    # Average service/waiting time calculation from database
    avg_wait = db.session.query(func.avg(Service.average_service_time)).scalar()
    avg_waiting_time = round(avg_wait, 1) if avg_wait else 15.0

    recent_tokens = Token.query.order_by(Token.created_at.desc()).limit(8).all()

    return render_template(
        'admin/dashboard.html',
        total_citizens=total_citizens,
        total_staff=total_staff,
        total_services=total_services,
        active_counters=active_counters,
        tokens_today=tokens_today,
        completed_tokens=completed_tokens,
        waiting_tokens=waiting_tokens,
        cancelled_tokens=cancelled_tokens,
        avg_waiting_time=avg_waiting_time,
        recent_tokens=recent_tokens
    )


@admin_bp.route('/users', methods=['GET', 'POST'])
@admin_required
def users():
    if request.method == 'POST':
        action = request.form.get('action')
        user_id = request.form.get('user_id', type=int)

        if action == 'update_role':
            new_role = request.form.get('role')
            user = User.query.get(user_id)
            if user:
                user.role = new_role
                db.session.commit()
                flash(f'Role updated to {new_role} for {user.name}.', 'success')

        elif action == 'delete':
            user = User.query.get(user_id)
            if user and user.id != session['user_id']:
                db.session.delete(user)
                db.session.commit()
                flash(f'User {user.name} deleted.', 'info')
            else:
                flash('Cannot delete yourself or invalid user.', 'danger')

        return redirect(url_for('admin.users'))

    all_users = User.query.order_by(User.id.asc()).all()
    return render_template('admin/users.html', users=all_users)


@admin_bp.route('/staff', methods=['GET', 'POST'])
@admin_required
def staff():
    if request.method == 'POST':
        staff_id = request.form.get('staff_id', type=int)
        counter_id = request.form.get('counter_id', type=int)

        staff_member = User.query.get(staff_id)
        if staff_member:
            staff_member.counter_id = counter_id if counter_id != 0 else None
            if counter_id != 0:
                c = Counter.query.get(counter_id)
                if c:
                    c.staff_id = staff_member.id
            db.session.commit()
            flash(f'Staff assignment updated for {staff_member.name}.', 'success')

        return redirect(url_for('admin.staff'))

    staff_members = User.query.filter(User.role.in_(['staff', 'admin'])).all()
    counters = Counter.query.all()
    services = Service.query.all()
    return render_template('admin/staff.html', staff_members=staff_members, counters=counters, services=services)


@admin_bp.route('/services', methods=['GET', 'POST'])
@admin_required
def services():
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'create':
            name = request.form.get('service_name', '').strip()
            description = request.form.get('description', '').strip()
            avg_time = request.form.get('average_service_time', type=int, default=15)

            if not name:
                flash('Service name is required.', 'danger')
            else:
                service = Service(
                    service_name=name,
                    description=description,
                    average_service_time=avg_time,
                    status='active'
                )
                db.session.add(service)
                db.session.commit()
                flash(f'Service "{name}" added successfully.', 'success')

        elif action == 'toggle':
            service_id = request.form.get('service_id', type=int)
            service = Service.query.get(service_id)
            if service:
                service.status = 'inactive' if service.status == 'active' else 'active'
                db.session.commit()
                flash(f'Service "{service.service_name}" status changed to {service.status}.', 'info')

        elif action == 'edit':
            service_id = request.form.get('service_id', type=int)
            service = Service.query.get(service_id)
            if service:
                service.service_name = request.form.get('service_name', '').strip()
                service.description = request.form.get('description', '').strip()
                service.average_service_time = request.form.get('average_service_time', type=int, default=15)
                db.session.commit()
                flash(f'Service "{service.service_name}" updated.', 'success')

        return redirect(url_for('admin.services'))

    all_services = Service.query.all()
    return render_template('admin/services.html', services=all_services)


@admin_bp.route('/counters', methods=['POST'])
@admin_required
def counters():
    action = request.form.get('action')
    if action == 'create':
        counter_name = request.form.get('counter_name', '').strip()
        service_id = request.form.get('service_id', type=int)
        if counter_name:
            c = Counter(counter_name=counter_name, service_id=service_id if service_id != 0 else None, status='active')
            db.session.add(c)
            db.session.commit()
            flash(f'Counter {counter_name} created.', 'success')
    elif action == 'toggle_status':
        counter_id = request.form.get('counter_id', type=int)
        c = Counter.query.get(counter_id)
        if c:
            c.status = 'inactive' if c.status == 'active' else 'active'
            db.session.commit()
            flash(f'Counter {c.counter_name} status changed to {c.status}.', 'info')

    return redirect(url_for('admin.staff'))


@admin_bp.route('/reports')
@admin_required
def reports():
    total_citizens = User.query.filter_by(role='citizen').count()
    total_staff = User.query.filter_by(role='staff').count()
    completed_tokens = Token.query.filter_by(status='completed').count()
    cancelled_tokens = Token.query.filter_by(status='cancelled').count()

    return render_template(
        'admin/reports.html',
        total_citizens=total_citizens,
        total_staff=total_staff,
        completed_tokens=completed_tokens,
        cancelled_tokens=cancelled_tokens
    )


def get_date_range(filter_str):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if filter_str == 'today':
        return today
    elif filter_str == '30days':
        return today - timedelta(days=30)
    else: # default to 7days
        return today - timedelta(days=7)


@admin_bp.route('/api/admin/statistics')
@admin_required
def api_admin_statistics():
    filter_str = request.args.get('filter', '7days')
    start_date = get_date_range(filter_str)
    
    # 3. Completed vs waiting vs cancelled doughnut chart
    completed_cnt = Token.query.filter(Token.status == 'completed', Token.created_at >= start_date).count()
    cancelled_cnt = Token.query.filter(Token.status == 'cancelled', Token.created_at >= start_date).count()
    skipped_cnt = Token.query.filter(Token.status == 'skipped', Token.created_at >= start_date).count()
    waiting_cnt = Token.query.filter(Token.status == 'waiting', Token.created_at >= start_date).count()
    
    return jsonify({
        'completed_vs_cancelled': {
            'labels': ['Completed', 'Cancelled', 'Skipped', 'Waiting'],
            'data': [completed_cnt, cancelled_cnt, skipped_cnt, waiting_cnt]
        }
    })


@admin_bp.route('/api/admin/daily-statistics')
@admin_required
def api_admin_daily_statistics():
    filter_str = request.args.get('filter', '7days')
    today = datetime.utcnow().date()
    
    if filter_str == 'today':
        days = 1
    elif filter_str == '30days':
        days = 30
    else:
        days = 7
        
    days_labels = []
    tokens_per_day_data = []

    for i in range(days - 1, -1, -1):
        day_date = today - timedelta(days=i)
        day_str = day_date.strftime('%b %d')
        days_labels.append(day_str)

        start_dt = datetime.combine(day_date, datetime.min.time())
        end_dt = datetime.combine(day_date, datetime.max.time())
        count = Token.query.filter(Token.created_at >= start_dt, Token.created_at <= end_dt).count()
        tokens_per_day_data.append(count)
        
    return jsonify({
        'tokens_per_day': {
            'labels': days_labels,
            'data': tokens_per_day_data
        }
    })


@admin_bp.route('/api/admin/service-statistics')
@admin_required
def api_admin_service_statistics():
    filter_str = request.args.get('filter', '7days')
    start_date = get_date_range(filter_str)
    
    services_list = Service.query.all()
    
    service_queue_labels = [s.service_name for s in services_list]
    # 2. Service-wise token bar chart
    service_queue_data = [
        Token.query.filter(Token.service_id == s.id, Token.created_at >= start_date).count() for s in services_list
    ]
    
    # 4. Average waiting time chart
    avg_wait_labels = [s.service_name for s in services_list]
    avg_wait_data = [s.average_service_time for s in services_list]
    
    return jsonify({
        'service_wise_queue': {
            'labels': service_queue_labels,
            'data': service_queue_data
        },
        'average_wait_time': {
            'labels': avg_wait_labels,
            'data': avg_wait_data
        }
    })
