from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import sqlite3

app = FastAPI(
title="Pranav Sund Client Management System"
)

# ==========================
# MODELS
# ==========================

class ClientRequest(BaseModel):

    name:str
    email:str
    organization:str


class ServiceRequestModel(BaseModel):

    client_id:int
    service_type:str
    description:str


class ChatRequest(BaseModel):

    query:str


# ==========================
# DATABASE
# ==========================

DB="consultancy.db"

def connect():

    return sqlite3.connect(DB)


# ==========================
# REGISTER CLIENT
# ==========================

@app.post("/register")

def register(data:ClientRequest):

    conn=connect()

    c=conn.cursor()

    c.execute("""

    INSERT INTO client
    (name,email,organization)

    VALUES(?,?,?)

    """,(

    data.name,

    data.email,

    data.organization

    ))

    conn.commit()

    conn.close()

    return {

    "status":"success",

    "message":"Client Registered"

    }


# ==========================
# SERVICE REQUEST
# ==========================

@app.post(
"/submit_request"
)

def request_service(

data:ServiceRequestModel

):

    conn=connect()

    c=conn.cursor()

    c.execute("""

    INSERT INTO service_request

    (

    client_id,

    service_type,

    description

    )

    VALUES(?,?,?)

    """,(

    data.client_id,

    data.service_type,

    data.description

    ))

    conn.commit()

    conn.close()

    return {

    "status":"success"

    }


# ==========================
# CHATBOT
# ==========================

FAQS={

"services":
"We provide consultancy services",

"invoice":
"Invoice available after completion",

"status":
"Track status from dashboard"

}


@app.post(
"/chatbot"
)

def chatbot(data:ChatRequest):

    response=FAQS.get(

    data.query.lower(),

    "Sorry I couldn't understand"

    )

    return {

    "response":response

    }


# ==========================
# REPORTS
# ==========================

@app.get("/reports")

def reports():

    conn=connect()

    c=conn.cursor()

    c.execute(

    "SELECT COUNT(*) FROM service_request"

    )

    total=c.fetchone()[0]

    conn.close()

    return {

    "total_requests":total

    }


# ==========================
# MAIN
# ==========================

if __name__=="__main__":

    import uvicorn

    uvicorn.run(

        app,

        host="0.0.0.0",

        port=5000

    )