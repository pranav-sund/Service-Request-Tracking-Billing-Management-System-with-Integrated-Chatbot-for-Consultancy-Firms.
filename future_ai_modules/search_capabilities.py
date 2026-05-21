# search_capabilities.py

import difflib
import sqlite3

DATABASE="pranav_client_management.db"

FAQS={

"services":
"We provide business consulting, analytics and branding services.",

"invoice":
"Invoice can be viewed after service completion.",

"status":
"Track your request status from dashboard.",

"billing":
"Billing information available under invoice section.",

"report":
"Reports can be viewed by administrators."

}


# ==========================
# RULE BASED CHATBOT
# ==========================

def chatbot_response(query):

    query=query.lower()

    if query in FAQS:

        return FAQS[query]

    possible=difflib.get_close_matches(

        query,

        FAQS.keys(),

        n=1,

        cutoff=0.5

    )

    if possible:

        return FAQS[possible[0]]

    return(
    "Sorry, I could not understand."
    )


# ==========================
# REQUEST SEARCH
# ==========================

def request_status(request_id):

    conn=sqlite3.connect(
    DATABASE
    )

    c=conn.cursor()

    c.execute("""

    SELECT status

    FROM service_request

    WHERE request_id=?

    """,(request_id,))

    data=c.fetchone()

    conn.close()

    if data:

        return data[0]

    return "Request not found"


# ==========================
# INVOICE SEARCH
# ==========================

def invoice_status(request_id):

    conn=sqlite3.connect(
    DATABASE
    )

    c=conn.cursor()

    c.execute("""

    SELECT payment_status

    FROM invoice

    WHERE request_id=?

    """,(request_id,))

    data=c.fetchone()

    conn.close()

    if data:

        return data[0]

    return "Invoice not found"


# ==========================
# REPORT COUNTS
# ==========================

def report_summary():

    conn=sqlite3.connect(
    DATABASE
    )

    c=conn.cursor()

    c.execute(
    "SELECT COUNT(*) FROM service_request"
    )

    total=c.fetchone()[0]

    c.execute("""

    SELECT COUNT(*)

    FROM service_request

    WHERE status='Completed'

    """)

    completed=c.fetchone()[0]

    conn.close()

    return{

    "total_requests":total,

    "completed":completed

    }