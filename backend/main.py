import logging
from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from typing import Optional

# Import your services
from services.supabase import (
    store_agent_details,
    login_agent, # We will use this to get the DB info
    add_property as add_property_service,
    get_properties_by_agent,
    update_property,
    delete_property,
    get_all_properties,
    get_all_agents,
    get_agent_by_id,
)

app = FastAPI()

# ------------------ LOGGING ------------------
logger = logging.getLogger("app")
logging.basicConfig(level=logging.DEBUG)

# ------------------ MODELS ------------------

class AgentLogin(BaseModel):
    email: str
    password: str

class PropertyUpdate(BaseModel):
    name: str
    location: str
    price: float
    agent_id: int

# ------------------ AGENT ROUTES ------------------

@app.post("/login")
async def login(credentials: AgentLogin):
    try:
        # This service should handle Supabase Auth + Database lookup
        # and return the agent dictionary from your 'agents' table
        response = await login_agent(credentials.email, credentials.password)
        
        if response.get("status") == "failed":
            raise HTTPException(status_code=401, detail=response.get("message"))

        logger.debug(f"Login response: {response}")
        return response

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/register")
async def register_user_endpoint(
    request: Request,
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    location: str = Form(...),
    image: UploadFile = File(None)
):
    try:
        response = await store_agent_details(
            request, name, phone, email, password, location, image
        )
        logger.debug(f"Registration response: {response}")
        return response
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_agents")
async def get_agents_endpoint(agent_id: Optional[int] = None):
    try:
        if agent_id:
            return await get_agent_by_id(agent_id)

        return await get_all_agents()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------ PROPERTY ROUTES ------------------

@app.get("/properties")
async def get_properties_endpoint(agent_id: Optional[int] = None):
    try:
        # If agent_id is provided, filter properties
        if agent_id:
            return await get_properties_by_agent(agent_id)
        return await get_all_properties()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/addproperties/{agent_id}")
async def add_property_endpoint(
    agent_id: int,
    name: str = Form(...),
    location: str = Form(...),
    price: float = Form(...),
    status: str = Form(...),
    phone_number: str = Form(...),
    image: UploadFile = File(None)
):
    try:
        response = await add_property_service(
            name,
            location,
            price,
            status,
            phone_number,
            agent_id,
            image
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/properties/{property_id}")
async def delete_property_endpoint(property_id: int):
    try:
        response = await delete_property(property_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/properties/{property_id}")
async def update_property_endpoint(
    property_id: int,
    name: str = Form(...),
    location: str = Form(...),
    price: float = Form(...),
    agent_id: int = Form(...),
    image: UploadFile = File(None)
):
    try:
        response = await update_property(
            prop_id=property_id,
            prop_name=name,
            prop_location=location,
            prop_price=price,
            agent_id=agent_id,
            image=image
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))