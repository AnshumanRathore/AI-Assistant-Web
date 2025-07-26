import streamlit as st
import openai

openai.api_key = "your_openai_api_key"

def ask_gpt(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    return response['choices'][0]['message']['content']

st.set_page_config(page_title="AI Assistant", page_icon="🤖")
st.title("🤖 My AI Assistant")

user_input = st.text_input("Ask me anything:")

if user_input:
    with st.spinner("Thinking..."):
        response = ask_gpt(user_input)
        st.success(response)
