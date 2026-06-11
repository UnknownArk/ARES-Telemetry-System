import mysql.connector
from mysql.connector import Error

def get_db_connected():
    try:
        connection= mysql.connector.connect(
            host='localhost',
            user='root',
            password='root123',
            database='space_exploration'
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error connecting to MYSQL: {e}")
        return None
    