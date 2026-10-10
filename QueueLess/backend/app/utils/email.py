import smtplib
from email.message import EmailMessage
import os
from datetime import datetime

# Local email fallback log for debugging
EMAIL_LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "local_emails.txt")

def send_local_email(to_email: str, subject: str, message_body: str):
    """
    Sends an actual email using SMTP.
    Requires SMTP_SERVER, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in environment/local variables.
    If none are provided, gracefully falls back to local file logging.
    """
    from app.core.config import settings
    smtp_server = settings.SMTP_SERVER
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    
    msg = EmailMessage()
    msg.set_content(message_body)
    msg['Subject'] = subject
    msg['From'] = smtp_user or "no-reply@tokengo.local"
    msg['To'] = to_email

    try:
        if smtp_user and smtp_password:
            # Proper working email integration via SMTP
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            print(f"Proper email sent successfully to {to_email} via {smtp_server}")
        else:
            # Missing credentials -> Fallback to Local Mocking but inform user how to activate
            print(f"\n[WARNING: SMTP_USER and SMTP_PASSWORD missing. Simulating email instead]")
            _mock_email(to_email, subject, message_body)
            
    except Exception as e:
        print(f"SMTP Email Send Failed: {e}")
        _mock_email(to_email, subject, message_body)

def _mock_email(to_email: str, subject: str, message: str):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    email_content = f"\n{'='*60}\nTIME: {timestamp}\nTO: {to_email}\nSUBJECT: {subject}\n{'-'*60}\n{message}\n{'='*60}\n"
    print(f"\n[LOCAL EMAIL INTERCEPTED]\n{email_content}\n")
    try:
        with open(EMAIL_LOG_FILE, "a") as f:
            f.write(email_content)
    except Exception:
        pass
