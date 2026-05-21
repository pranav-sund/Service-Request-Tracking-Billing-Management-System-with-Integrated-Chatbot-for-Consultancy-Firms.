from flask import Flask, request, redirect
from flask import session, jsonify
from flask_sqlalchemy import SQLAlchemy

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from reportlab.pdfgen import canvas

app = Flask(__name__)

# ====================================
# CONFIGURATION
# ====================================

app.config["SECRET_KEY"] = "pranavsund123"

app.config[
    "SQLALCHEMY_DATABASE_URI"
] = "sqlite:///pranav_client_management.db"

app.config[
    "SQLALCHEMY_TRACK_MODIFICATIONS"
] = False

db = SQLAlchemy(app)


# ====================================
# DATABASE MODELS
# ====================================

class Client(db.Model):

    client_id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100)
    )

    email = db.Column(
        db.String(120),
        unique=True
    )

    organization = db.Column(
        db.String(100)
    )

    password_hash = db.Column(
        db.String(300)
    )


class ServiceRequest(db.Model):

    request_id = db.Column(
        db.Integer,
        primary_key=True
    )

    client_id = db.Column(
        db.Integer,
        db.ForeignKey(
            'client.client_id'
        )
    )

    service_type = db.Column(
        db.String(100)
    )

    description = db.Column(
        db.Text
    )

    status = db.Column(
        db.String(50),
        default="Pending"
    )


class Invoice(db.Model):

    invoice_id = db.Column(
        db.Integer,
        primary_key=True
    )

    request_id = db.Column(
        db.Integer
    )

    amount = db.Column(
        db.Float
    )

    payment_status = db.Column(
        db.String(50),
        default="Pending"
    )


class ChatbotLog(db.Model):

    chat_id = db.Column(
        db.Integer,
        primary_key=True
    )

    query = db.Column(
        db.Text
    )

    response = db.Column(
        db.Text
    )


# ====================================
# HOME
# ====================================

@app.route('/')

def home():

    return """

<h1>
Pranav Sund Client Management System
</h1>

<hr>

<a href='/register'>
Register
</a>

<br><br>

<a href='/login'>
Login
</a>

<br><br>

<a href='/admin'>
Admin Dashboard
</a>

<br><br>

<a href='/reports'>
Reports
</a>

"""


# ====================================
# REGISTER
# ====================================

@app.route(
'/register',
methods=['GET','POST']
)

def register():

    if request.method=="POST":

        existing=Client.query.filter_by(
            email=request.form['email']
        ).first()

        if existing:

            return "Email already exists"

        password=generate_password_hash(
            request.form['password']
        )

        user=Client(

            name=request.form['name'],

            email=request.form['email'],

            organization=request.form['organization'],

            password_hash=password

        )

        db.session.add(user)

        db.session.commit()

        return redirect('/login')


    return '''

<h2>Register</h2>

<form method=post>

Name:<br>
<input name=name>

<br><br>

Email:<br>
<input name=email>

<br><br>

Organization:<br>
<input name=organization>

<br><br>

Password:<br>

<input
type=password
name=password>

<br><br>

<button>

Register

</button>

</form>

'''


# ====================================
# LOGIN
# ====================================

@app.route(
'/login',
methods=['GET','POST']
)

def login():

    if request.method=="POST":

        user=Client.query.filter_by(

            email=request.form[
            'email'
            ]

        ).first()

        if user and check_password_hash(

            user.password_hash,

            request.form[
            'password'
            ]

        ):

            session[
            'user'
            ]=user.client_id

            return redirect(
            '/dashboard'
            )

        return "Invalid Login"


    return '''

<h2>Login</h2>

<form method=post>

Email:<br>

<input
name=email>

<br><br>

Password:<br>

<input
type=password
name=password>

<br><br>

<button>

Login

</button>

</form>

'''


# ====================================
# DASHBOARD
# ====================================

@app.route('/dashboard')

def dashboard():

    if 'user' not in session:

        return redirect('/login')

    data=ServiceRequest.query.filter_by(
        client_id=session['user']
    ).all()


    html="""

<h2>
Pranav Sund Client Dashboard
</h2>

<a href='/request'>
Submit Service Request
</a>

<br><br>

<a href='/chat'>
Chatbot
</a>

<hr>

"""

    for x in data:

        html+=f"""

Request ID:
{x.request_id}

<br>

Service:
{x.service_type}

<br>

Status:
{x.status}

<hr>

"""

    return html


# ====================================
# SERVICE REQUEST
# ====================================

@app.route(
'/request',
methods=['GET','POST']
)

def request_service():

    if request.method=="POST":

        req=ServiceRequest(

            client_id=session['user'],

            service_type=request.form[
            'service'
            ],

            description=request.form[
            'description'
            ]
        )

        db.session.add(req)

        db.session.commit()

        return redirect('/dashboard')


    return '''

<h2>

Submit Service Request

</h2>

<form method=post>

Service Type:

<input
name=service>

<br><br>

Description:

<textarea
name=description>

</textarea>

<br><br>

<button>

Submit

</button>

</form>

'''


# ====================================
# ADMIN
# ====================================

@app.route('/admin')

def admin():

    data=ServiceRequest.query.all()

    html="""

<h1>

Admin Dashboard

</h1>

<hr>

"""

    for x in data:

        html+=f"""

Request ID:
{x.request_id}

<br>

Service:
{x.service_type}

<br>

Status:
{x.status}

<br>

<a href=/complete/{x.request_id}>
Complete
</a>

|

<a href=/invoice/{x.request_id}>
Generate Invoice
</a>

<hr>

"""

    return html


# ====================================
# COMPLETE
# ====================================

@app.route('/complete/<id>')

def complete(id):

    r=ServiceRequest.query.get(id)

    r.status="Completed"

    db.session.commit()

    return redirect('/admin')


# ====================================
# INVOICE PDF
# ====================================

@app.route('/invoice/<id>')

def invoice(id):

    filename=f"invoice_{id}.pdf"

    pdf=canvas.Canvas(filename)

    pdf.drawString(
        100,
        800,
        "Pranav Sund Client Management Invoice"
    )

    pdf.drawString(
        100,
        760,
        f"Request ID: {id}"
    )

    pdf.drawString(
        100,
        720,
        "Amount : Rs.5000"
    )

    pdf.drawString(
        100,
        680,
        "Status : Pending"
    )

    pdf.save()

    return f"Invoice Generated: {filename}"


# ====================================
# REPORTS
# ====================================

@app.route('/reports')

def reports():

    total=ServiceRequest.query.count()

    completed=ServiceRequest.query.filter_by(
        status="Completed"
    ).count()

    pending=ServiceRequest.query.filter_by(
        status="Pending"
    ).count()

    return f"""

<h2>Reports</h2>

Total Requests:
{total}

<br><br>

Completed:
{completed}

<br><br>

Pending:
{pending}

"""


# ====================================
# CHATBOT
# ====================================

FAQS={

"services":
"We provide business strategy, analytics and consultancy support",

"invoice":
"Invoice available after completion",

"status":
"Check dashboard for request updates"

}

@app.route(
'/chat',
methods=['GET','POST']
)

def chat():

    if request.method=="POST":

        q=request.form[
        'query'
        ].lower()

        response=FAQS.get(

            q,

            "Sorry, I couldn't understand"

        )

        log=ChatbotLog(

            query=q,

            response=response

        )

        db.session.add(log)

        db.session.commit()

        return f"""

Bot:

{response}

<br><br>

<a href=/chat>

Back

</a>

"""

    return '''

<h2>Chatbot</h2>

<form method=post>

Enter Query:

<input name=query>

<button>

Ask

</button>

</form>

'''


# ====================================
# LOGOUT
# ====================================

@app.route('/logout')

def logout():

    session.clear()

    return redirect('/')


# ====================================
# MAIN
# ====================================

if __name__=="__main__":

    with app.app_context():

        db.create_all()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )
