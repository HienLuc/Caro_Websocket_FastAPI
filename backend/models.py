from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class User(BaseModel):
    username: str
    password: str
    win_count: int = 0
    loss_count: int = 0

class GameHistory(BaseModel):
    player1: str
    player2: str
    winner: str
    played_at: str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class LoginRequest(BaseModel):
    username: str
    password: str

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None