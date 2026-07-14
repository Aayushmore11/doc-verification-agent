import csv

csv_file_path = "customers.csv"
sql_file_path = "customers.sql"

print(f"Reading {csv_file_path} and writing to {sql_file_path}...")

create_table_sql = """-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    aadhaar_number VARCHAR(12) UNIQUE NOT NULL,
    pan_card_number VARCHAR(10) UNIQUE NOT NULL,
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20)
);

-- Truncate existing data to avoid duplicate key errors on import
TRUNCATE TABLE customers;

-- Insert records
"""

def escape_sql_string(val):
    if val is None:
        return 'NULL'
    # Escape single quotes by doubling them
    escaped = val.replace("'", "''")
    return f"'{escaped}'"

try:
    with open(csv_file_path, mode='r', encoding='utf-8') as csv_file, \
         open(sql_file_path, mode='w', encoding='utf-8') as sql_file:
         
        # Write creation script header
        sql_file.write(create_table_sql)
        
        reader = csv.DictReader(csv_file)
        
        count = 0
        for row in reader:
            cust_id = row['id']
            full_name = escape_sql_string(row['full_name'])
            phone_number = escape_sql_string(row['phone_number'])
            aadhaar_number = escape_sql_string(row['aadhaar_number'])
            pan_card_number = escape_sql_string(row['pan_card_number'])
            date_of_birth = escape_sql_string(row['date_of_birth'])
            address = escape_sql_string(row['address'])
            city = escape_sql_string(row['city'])
            state = escape_sql_string(row['state'])
            pincode = escape_sql_string(row['pincode'])
            
            insert_stmt = (
                f"INSERT INTO customers (id, full_name, phone_number, aadhaar_number, "
                f"pan_card_number, date_of_birth, address, city, state, pincode) "
                f"VALUES ({cust_id}, {full_name}, {phone_number}, {aadhaar_number}, "
                f"{pan_card_number}, {date_of_birth}, {address}, {city}, {state}, {pincode});\n"
            )
            sql_file.write(insert_stmt)
            count += 1
            
    print(f"Successfully processed {count} records and wrote to {sql_file_path}.")

except Exception as e:
    print(f"Error occurred: {e}")
