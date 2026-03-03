from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import numpy as np
from scipy import stats
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'options-backtest-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Options Backtesting API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class BacktestConfig(BaseModel):
    strategy_type: str  # simple_call, simple_put, bull_call_spread, bear_put_spread, straddle, strangle, iron_condor
    index: str  # NIFTY, BANKNIFTY
    contract_type: str  # weekly, monthly
    start_date: str
    end_date: str
    lots: int = 1
    entry_time: str = "09:30"
    exit_time: str = "15:15"
    strike_selection: str = "ATM"  # ATM, ITM, OTM or specific offset
    stop_loss_percent: Optional[float] = None
    target_percent: Optional[float] = None
    # For spreads
    spread_width: Optional[int] = None

class BacktestCreate(BaseModel):
    name: str
    config: BacktestConfig

class TradeRecord(BaseModel):
    date: str
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    pnl: float
    pnl_percent: float
    strike: int
    option_type: str
    lots: int
    exit_reason: str

class BacktestResult(BaseModel):
    id: str
    user_id: str
    name: str
    config: BacktestConfig
    trades: List[TradeRecord]
    statistics: Dict[str, Any]
    created_at: str

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============= BACKTEST ENGINE =============

def generate_mock_option_data(index: str, start_date: str, end_date: str, contract_type: str):
    """Generate realistic mock options data for backtesting"""
    from datetime import datetime, timedelta
    import random
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Base spot prices for indices
    base_prices = {"NIFTY": 22000, "BANKNIFTY": 47000}
    base_price = base_prices.get(index, 22000)
    
    # Lot sizes
    lot_sizes = {"NIFTY": 25, "BANKNIFTY": 15}
    lot_size = lot_sizes.get(index, 25)
    
    data = []
    current_price = base_price
    current_date = start
    
    while current_date <= end:
        # Skip weekends
        if current_date.weekday() < 5:
            # Simulate daily price movement
            daily_change = random.gauss(0, 0.01)  # ~1% daily volatility
            current_price = current_price * (1 + daily_change)
            
            # ATM strike (rounded to nearest 50 for NIFTY, 100 for BANKNIFTY)
            strike_interval = 50 if index == "NIFTY" else 100
            atm_strike = round(current_price / strike_interval) * strike_interval
            
            # Generate option prices based on Black-Scholes-like logic
            iv = random.uniform(0.12, 0.25)  # Implied volatility
            days_to_expiry = 7 if contract_type == "weekly" else 30
            time_value = iv * np.sqrt(days_to_expiry / 365) * current_price * 0.4
            
            # Morning prices (entry)
            call_entry = max(10, time_value + random.uniform(-20, 20))
            put_entry = max(10, time_value + random.uniform(-20, 20))
            
            # Afternoon prices (exit) - simulate intraday movement
            intraday_move = random.gauss(0, 0.02) * current_price
            theta_decay = time_value * 0.1  # Daily theta
            
            call_exit = max(5, call_entry + intraday_move * 0.5 - theta_decay + random.uniform(-15, 15))
            put_exit = max(5, put_entry - intraday_move * 0.5 - theta_decay + random.uniform(-15, 15))
            
            data.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "spot_price": round(current_price, 2),
                "atm_strike": atm_strike,
                "call_entry": round(call_entry, 2),
                "call_exit": round(call_exit, 2),
                "put_entry": round(put_entry, 2),
                "put_exit": round(put_exit, 2),
                "iv": round(iv * 100, 2),
                "lot_size": lot_size
            })
        
        current_date += timedelta(days=1)
    
    return data

def calculate_statistics(trades: List[dict], initial_capital: float = 100000) -> Dict[str, Any]:
    """Calculate comprehensive trading statistics"""
    if not trades:
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0,
            "total_pnl": 0,
            "max_profit": 0,
            "max_loss": 0,
            "average_pnl": 0,
            "max_drawdown": 0,
            "sharpe_ratio": 0,
            "sortino_ratio": 0,
            "profit_factor": 0,
            "avg_win": 0,
            "avg_loss": 0,
            "expectancy": 0,
            "var_95": 0
        }
    
    pnls = [t["pnl"] for t in trades]
    returns = [t["pnl_percent"] for t in trades]
    
    winning = [p for p in pnls if p > 0]
    losing = [p for p in pnls if p < 0]
    
    total_pnl = sum(pnls)
    win_rate = len(winning) / len(pnls) * 100 if pnls else 0
    
    # Calculate drawdown
    cumulative = np.cumsum(pnls)
    running_max = np.maximum.accumulate(cumulative)
    drawdowns = running_max - cumulative
    max_drawdown = max(drawdowns) if len(drawdowns) > 0 else 0
    max_drawdown_percent = (max_drawdown / initial_capital) * 100 if initial_capital > 0 else 0
    
    # Sharpe Ratio (assuming 252 trading days, risk-free rate ~6%)
    if len(returns) > 1 and np.std(returns) > 0:
        excess_returns = np.array(returns) - (6 / 252)  # Daily risk-free rate
        sharpe = np.sqrt(252) * np.mean(excess_returns) / np.std(returns)
    else:
        sharpe = 0
    
    # Sortino Ratio (downside deviation)
    negative_returns = [r for r in returns if r < 0]
    if len(negative_returns) > 1:
        downside_std = np.std(negative_returns)
        sortino = np.sqrt(252) * np.mean(returns) / downside_std if downside_std > 0 else 0
    else:
        sortino = 0
    
    # Profit Factor
    gross_profit = sum(winning) if winning else 0
    gross_loss = abs(sum(losing)) if losing else 0
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf') if gross_profit > 0 else 0
    
    # Value at Risk (95%)
    var_95 = np.percentile(pnls, 5) if len(pnls) > 0 else 0
    
    # Average win/loss
    avg_win = np.mean(winning) if winning else 0
    avg_loss = np.mean(losing) if losing else 0
    
    # Expectancy
    expectancy = (win_rate / 100 * avg_win) + ((1 - win_rate / 100) * avg_loss)
    
    return {
        "total_trades": len(pnls),
        "winning_trades": len(winning),
        "losing_trades": len(losing),
        "win_rate": round(win_rate, 2),
        "total_pnl": round(total_pnl, 2),
        "max_profit": round(max(pnls), 2) if pnls else 0,
        "max_loss": round(min(pnls), 2) if pnls else 0,
        "average_pnl": round(np.mean(pnls), 2) if pnls else 0,
        "max_drawdown": round(max_drawdown, 2),
        "max_drawdown_percent": round(max_drawdown_percent, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "profit_factor": round(profit_factor, 2) if profit_factor != float('inf') else "∞",
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "expectancy": round(expectancy, 2),
        "var_95": round(var_95, 2),
        "cumulative_pnl": [round(x, 2) for x in cumulative.tolist()],
        "daily_pnl": [round(p, 2) for p in pnls]
    }

def run_backtest(config: BacktestConfig) -> tuple:
    """Execute the backtest and return trades and statistics"""
    data = generate_mock_option_data(
        config.index, 
        config.start_date, 
        config.end_date, 
        config.contract_type
    )
    
    trades = []
    
    for day in data:
        lot_size = day["lot_size"]
        total_lots = config.lots
        
        if config.strategy_type == "simple_call":
            # Long Call
            entry = day["call_entry"]
            exit_price = day["call_exit"]
            pnl = (exit_price - entry) * lot_size * total_lots
            pnl_percent = ((exit_price - entry) / entry) * 100 if entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": entry,
                "exit_price": exit_price,
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "CE",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "simple_put":
            # Long Put
            entry = day["put_entry"]
            exit_price = day["put_exit"]
            pnl = (exit_price - entry) * lot_size * total_lots
            pnl_percent = ((exit_price - entry) / entry) * 100 if entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": entry,
                "exit_price": exit_price,
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "PE",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "short_call":
            # Short Call (sell)
            entry = day["call_entry"]
            exit_price = day["call_exit"]
            pnl = (entry - exit_price) * lot_size * total_lots
            pnl_percent = ((entry - exit_price) / entry) * 100 if entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": entry,
                "exit_price": exit_price,
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "CE (Short)",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "short_put":
            # Short Put (sell)
            entry = day["put_entry"]
            exit_price = day["put_exit"]
            pnl = (entry - exit_price) * lot_size * total_lots
            pnl_percent = ((entry - exit_price) / entry) * 100 if entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": entry,
                "exit_price": exit_price,
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "PE (Short)",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "straddle":
            # Long Straddle (buy both CE and PE)
            call_entry = day["call_entry"]
            put_entry = day["put_entry"]
            call_exit = day["call_exit"]
            put_exit = day["put_exit"]
            
            total_entry = call_entry + put_entry
            total_exit = call_exit + put_exit
            pnl = (total_exit - total_entry) * lot_size * total_lots
            pnl_percent = ((total_exit - total_entry) / total_entry) * 100 if total_entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": total_entry,
                "exit_price": total_exit,
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Straddle",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "short_straddle":
            # Short Straddle (sell both CE and PE)
            call_entry = day["call_entry"]
            put_entry = day["put_entry"]
            call_exit = day["call_exit"]
            put_exit = day["put_exit"]
            
            total_entry = call_entry + put_entry
            total_exit = call_exit + put_exit
            pnl = (total_entry - total_exit) * lot_size * total_lots
            pnl_percent = ((total_entry - total_exit) / total_entry) * 100 if total_entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": total_entry,
                "exit_price": total_exit,
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Short Straddle",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "strangle":
            # Long Strangle (OTM call + OTM put)
            # Simulate OTM prices as 70% of ATM
            call_entry = day["call_entry"] * 0.7
            put_entry = day["put_entry"] * 0.7
            call_exit = day["call_exit"] * 0.65
            put_exit = day["put_exit"] * 0.65
            
            total_entry = call_entry + put_entry
            total_exit = call_exit + put_exit
            pnl = (total_exit - total_entry) * lot_size * total_lots
            pnl_percent = ((total_exit - total_entry) / total_entry) * 100 if total_entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": round(total_entry, 2),
                "exit_price": round(total_exit, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Strangle",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "short_strangle":
            # Short Strangle (sell OTM call + OTM put)
            call_entry = day["call_entry"] * 0.7
            put_entry = day["put_entry"] * 0.7
            call_exit = day["call_exit"] * 0.65
            put_exit = day["put_exit"] * 0.65
            
            total_entry = call_entry + put_entry
            total_exit = call_exit + put_exit
            pnl = (total_entry - total_exit) * lot_size * total_lots
            pnl_percent = ((total_entry - total_exit) / total_entry) * 100 if total_entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": round(total_entry, 2),
                "exit_price": round(total_exit, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Short Strangle",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "bull_call_spread":
            # Bull Call Spread (buy lower strike call, sell higher strike call)
            spread_width = config.spread_width or 100
            buy_call = day["call_entry"]
            sell_call = day["call_entry"] * 0.6  # Higher strike = lower premium
            buy_call_exit = day["call_exit"]
            sell_call_exit = day["call_exit"] * 0.55
            
            net_entry = buy_call - sell_call
            net_exit = buy_call_exit - sell_call_exit
            pnl = (net_exit - net_entry) * lot_size * total_lots
            pnl_percent = ((net_exit - net_entry) / net_entry) * 100 if net_entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": round(net_entry, 2),
                "exit_price": round(net_exit, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Bull Call Spread",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "bear_put_spread":
            # Bear Put Spread (buy higher strike put, sell lower strike put)
            buy_put = day["put_entry"]
            sell_put = day["put_entry"] * 0.6  # Lower strike = lower premium
            buy_put_exit = day["put_exit"]
            sell_put_exit = day["put_exit"] * 0.55
            
            net_entry = buy_put - sell_put
            net_exit = buy_put_exit - sell_put_exit
            pnl = (net_exit - net_entry) * lot_size * total_lots
            pnl_percent = ((net_exit - net_entry) / net_entry) * 100 if net_entry > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": round(net_entry, 2),
                "exit_price": round(net_exit, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Bear Put Spread",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
            
        elif config.strategy_type == "iron_condor":
            # Iron Condor (sell OTM put, buy further OTM put, sell OTM call, buy further OTM call)
            sell_put = day["put_entry"] * 0.7
            buy_put = day["put_entry"] * 0.4
            sell_call = day["call_entry"] * 0.7
            buy_call = day["call_entry"] * 0.4
            
            sell_put_exit = day["put_exit"] * 0.65
            buy_put_exit = day["put_exit"] * 0.35
            sell_call_exit = day["call_exit"] * 0.65
            buy_call_exit = day["call_exit"] * 0.35
            
            net_credit = (sell_put - buy_put) + (sell_call - buy_call)
            net_exit = (sell_put_exit - buy_put_exit) + (sell_call_exit - buy_call_exit)
            pnl = (net_credit - net_exit) * lot_size * total_lots
            pnl_percent = ((net_credit - net_exit) / net_credit) * 100 if net_credit > 0 else 0
            
            trades.append({
                "date": day["date"],
                "entry_time": config.entry_time,
                "exit_time": config.exit_time,
                "entry_price": round(net_credit, 2),
                "exit_price": round(net_exit, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "strike": day["atm_strike"],
                "option_type": "Iron Condor",
                "lots": total_lots,
                "exit_reason": "EOD"
            })
    
    # Apply stop loss and target if configured
    if config.stop_loss_percent or config.target_percent:
        for trade in trades:
            if config.stop_loss_percent and trade["pnl_percent"] < -config.stop_loss_percent:
                trade["exit_reason"] = "Stop Loss"
            elif config.target_percent and trade["pnl_percent"] > config.target_percent:
                trade["exit_reason"] = "Target"
    
    statistics = calculate_statistics(trades)
    return trades, statistics

# ============= BACKTEST ENDPOINTS =============

@api_router.post("/backtest/run")
async def create_and_run_backtest(backtest_data: BacktestCreate, current_user: dict = Depends(get_current_user)):
    """Run a new backtest and save results"""
    try:
        trades, statistics = run_backtest(backtest_data.config)
        
        backtest_id = str(uuid.uuid4())
        backtest_doc = {
            "id": backtest_id,
            "user_id": current_user["id"],
            "name": backtest_data.name,
            "config": backtest_data.config.model_dump(),
            "trades": trades,
            "statistics": statistics,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.backtests.insert_one(backtest_doc)
        
        # Remove MongoDB _id before returning
        backtest_doc.pop("_id", None)
        
        return backtest_doc
    except Exception as e:
        logger.error(f"Backtest error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@api_router.get("/backtests")
async def get_user_backtests(current_user: dict = Depends(get_current_user)):
    """Get all backtests for the current user"""
    backtests = await db.backtests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return backtests

@api_router.get("/backtests/{backtest_id}")
async def get_backtest(backtest_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific backtest by ID"""
    backtest = await db.backtests.find_one(
        {"id": backtest_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return backtest

@api_router.delete("/backtests/{backtest_id}")
async def delete_backtest(backtest_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a backtest"""
    result = await db.backtests.delete_one({"id": backtest_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return {"message": "Backtest deleted successfully"}

# ============= MARKET DATA ENDPOINTS =============

@api_router.get("/market/indices")
async def get_indices():
    """Get available indices for backtesting"""
    return {
        "indices": [
            {"symbol": "NIFTY", "name": "Nifty 50", "lot_size": 25},
            {"symbol": "BANKNIFTY", "name": "Bank Nifty", "lot_size": 15}
        ]
    }

@api_router.get("/market/strategies")
async def get_strategies():
    """Get available trading strategies"""
    return {
        "strategies": [
            {"id": "simple_call", "name": "Long Call", "category": "Simple", "description": "Buy a call option"},
            {"id": "simple_put", "name": "Long Put", "category": "Simple", "description": "Buy a put option"},
            {"id": "short_call", "name": "Short Call", "category": "Simple", "description": "Sell a call option"},
            {"id": "short_put", "name": "Short Put", "category": "Simple", "description": "Sell a put option"},
            {"id": "straddle", "name": "Long Straddle", "category": "Volatility", "description": "Buy ATM call and put"},
            {"id": "short_straddle", "name": "Short Straddle", "category": "Volatility", "description": "Sell ATM call and put"},
            {"id": "strangle", "name": "Long Strangle", "category": "Volatility", "description": "Buy OTM call and put"},
            {"id": "short_strangle", "name": "Short Strangle", "category": "Volatility", "description": "Sell OTM call and put"},
            {"id": "bull_call_spread", "name": "Bull Call Spread", "category": "Directional", "description": "Bullish limited risk strategy"},
            {"id": "bear_put_spread", "name": "Bear Put Spread", "category": "Directional", "description": "Bearish limited risk strategy"},
            {"id": "iron_condor", "name": "Iron Condor", "category": "Neutral", "description": "Range-bound strategy"}
        ]
    }

# ============= DASHBOARD STATS =============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard summary statistics"""
    backtests = await db.backtests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    if not backtests:
        return {
            "total_backtests": 0,
            "total_pnl": 0,
            "avg_win_rate": 0,
            "best_strategy": None,
            "recent_backtests": []
        }
    
    total_pnl = sum(b["statistics"]["total_pnl"] for b in backtests)
    avg_win_rate = np.mean([b["statistics"]["win_rate"] for b in backtests])
    
    # Find best performing strategy
    best = max(backtests, key=lambda x: x["statistics"]["total_pnl"])
    
    return {
        "total_backtests": len(backtests),
        "total_pnl": round(total_pnl, 2),
        "avg_win_rate": round(avg_win_rate, 2),
        "best_strategy": {
            "name": best["name"],
            "pnl": best["statistics"]["total_pnl"],
            "strategy": best["config"]["strategy_type"]
        },
        "recent_backtests": backtests[:5]
    }

# ============= ROOT =============

@api_router.get("/")
async def root():
    return {"message": "Options Backtesting API", "version": "1.0.0"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
