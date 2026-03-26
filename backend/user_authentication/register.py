from services.supabase import store_agent_details
import logging

logger = logging.getLogger("whatsapp_app")

async def register_user(user: dict):
    name = user.get("name")
    phone = user.get("phone")
    location = user.get("location")
    email = user.get("email")
    password = user.get("password")

    logger.info(f"Registration data: {name},{email},{password},{phone},{location}")

    res= await store_agent_details(name, phone, email, password, location)

    if (res.get("response") == "success"):
        return {"message": "registration successful"}
    else:
        error_msg = res.get("error", "unknown error")
        if "duplicate key" in error_msg.lower() or "already exists" in error_msg.lower():
            return {"message": "User exists"}
            
