import logging
from urllib import response
import fastapi
from fastapi import logger
import requests
import logging
import json
from services.supabase import login_agent
logger = logging.getLogger("whatsapp_app")

async def login_user(user_data:dict):
 
 phone_number=user_data.get("phone") 
 password=user_data.get("password")
 res=await login_agent(phone_number,password)
 logger.critical(f"Login response: {phone_number},{password},{res}" )
 if res.get("status") == "success":
   if "agent" in res:
     return {"status":"success","message":"Successful login","agent":res["agent"]}
 else:
   return {"status":"failed","message":"Login failed,please try again"}  