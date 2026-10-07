from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from models import db
from models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect_user_dashboard(session.get('role'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        mobile = request.form.get('mobile', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        terms = request.form.get('terms')

        if not name or not mobile or not password:
            flash('Full Name, Mobile Number, and Password are required.', 'danger')
            return render_template('register.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('register.html')

        if not terms:
            flash('You must agree to the Terms of Service to register.', 'warning')
            return render_template('register.html')

        # Check duplicate mobile
        existing_mobile = User.query.filter_by(mobile=mobile).first()
        if existing_mobile:
            flash('An account with this Mobile Number already exists.', 'danger')
            return render_template('register.html')

        # Check duplicate email if provided
        if email:
            existing_email = User.query.filter_by(email=email).first()
            if existing_email:
                flash('An account with this Email Address already exists.', 'danger')
                return render_template('register.html')
        else:
            email = f"user_{mobile}@queueless.local"

        user = User(
            name=name,
            mobile=mobile,
            email=email,
            role='citizen'
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        # Log in user directly
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['role'] = user.role
        session['mobile'] = user.mobile
        session['email'] = user.email

        flash('Account created successfully! Welcome to QueueLess.', 'success')
        return redirect(url_for('citizen.dashboard'))

    return render_template('register.html')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect_user_dashboard(session.get('role'))

    if request.method == 'POST':
        login_input = request.form.get('mobile_or_email', '').strip()
        password = request.form.get('password', '')

        if not login_input or not password:
            flash('Please enter your Mobile/Email and Password.', 'danger')
            return render_template('login.html')

        # Search by mobile or email
        user = User.query.filter(
            (User.mobile == login_input) | (User.email == login_input.lower())
        ).first()

        if not user or not user.check_password(password):
            flash('Invalid credentials. Please check your Mobile/Email and Password.', 'danger')
            return render_template('login.html')

        # Set Flask Session
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['role'] = user.role
        session['mobile'] = user.mobile
        session['email'] = user.email

        flash(f'Welcome back, {user.name}!', 'success')
        return redirect_user_dashboard(user.role)

    return render_template('login.html')


@auth_bp.route('/guest-login')
def guest_login():
    """Allows instant browsing as demo citizen guest."""
    session['user_id'] = 5
    session['user_name'] = 'Aarav Mehta (Guest)'
    session['role'] = 'citizen'
    session['mobile'] = '9898012345'
    session['email'] = 'aarav@citizen.com'
    flash('Logged in as Guest Citizen.', 'info')
    return redirect(url_for('citizen.dashboard'))


@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('index'))


def redirect_user_dashboard(role):
    if role == 'admin':
        return redirect(url_for('admin.dashboard'))
    elif role == 'staff':
        return redirect(url_for('staff.dashboard'))
    else:
        return redirect(url_for('citizen.dashboard'))
