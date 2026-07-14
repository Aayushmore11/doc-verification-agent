import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:isStrongPassword123!@localhost:5432/doc_verification"
)

# Hide password in logs/printouts for security
db_info = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL
print(f"Testing database connection to: {db_info}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("Success: Connected to the database successfully!")
        
        # Test if the customers table exists
        try:
            res_table = conn.execute(text("SELECT COUNT(*) FROM customers"))
            count = res_table.scalar()
            print(f"Success: 'customers' table exists and contains {count} records.")
        except Exception as table_err:
            print(f"Warning: Connected to database, but failed to query 'customers' table. Error: {table_err}")
            
except Exception as e:
    print("Error: Failed to connect to the database!", file=sys.stderr)
    print(e, file=sys.stderr)
    sys.exit(1)
