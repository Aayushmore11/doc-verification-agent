from sqlalchemy import create_engine

DATABASE_URL = (
    "postgresql+psycopg2://"
    "postgres:1136@localhost:5432/DOC_verifiction_db"
)

engine = create_engine(DATABASE_URL)
