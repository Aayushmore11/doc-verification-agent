from sqlalchemy import create_engine

DATABASE_URL = (
    "postgresql+psycopg2://"
    "sanjeevanichaurasia:YOUR_PASSWORD@localhost:5432/aadhaar_db"
)

engine = create_engine(DATABASE_URL)
