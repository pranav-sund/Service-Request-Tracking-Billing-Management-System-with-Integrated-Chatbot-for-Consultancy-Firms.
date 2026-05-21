import streamlit as st
import requests

API_URL="http://localhost:5000"

def initialize():

    if "history" not in st.session_state:

        st.session_state.history=[]


def chatbot():

    st.subheader(
    "Consultancy Chatbot"
    )

    query=st.text_input(
    "Ask Question"
    )

    if st.button("Send"):

        response=requests.post(

            f"{API_URL}/chatbot",

            json={

            "query":query

            }

        )

        data=response.json()

        st.success(

        data["response"]

        )


def request_form():

    st.subheader(
    "Submit Service Request"
    )

    client_id=st.number_input(
    "Client ID"
    )

    service=st.text_input(
    "Service Type"
    )

    desc=st.text_area(
    "Description"
    )

    if st.button(
    "Submit Request"
    ):

        payload={

        "client_id":client_id,

        "service_type":service,

        "description":desc

        }

        response=requests.post(

        f"{API_URL}/submit_request",

        json=payload

        )

        st.success(
        "Request Submitted"
        )


def reports():

    st.subheader(
    "Reports Dashboard"
    )

    r=requests.get(

    f"{API_URL}/reports"

    )

    data=r.json()

    st.metric(

    "Total Requests",

    data["total_requests"]

    )


def main():

    initialize()

    st.title(

    "Pranav Sund Client Management System"

    )

    page=st.sidebar.selectbox(

    "Select Module",

    [

        "Chatbot",

        "Service Request",

        "Reports"

    ]

    )

    if page=="Chatbot":

        chatbot()

    elif page=="Service Request":

        request_form()

    elif page=="Reports":

        reports()


if __name__=="__main__":

    main()