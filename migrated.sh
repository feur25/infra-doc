#migration postgresql to my mongodb relationnal migrator
#using cdc pipeline with saga pattern 
#!/bin/bash

# Migration PostgreSQL to MongoDB relational migrator
# Using CDC pipeline with saga pattern

sudo apt-get update

sudo apt-get install -y mongodb-org postgresql-client python3-pip python3-venv
python3 -m venv ~/migration-venv
source ~/migration-venv/bin/activate
pip install pymongo psycopg2-binary confluent-kafka

export PG_HOST="localhost"
export PG_PORT="5432"
export PG_USER="postgres"
export PG_PASSWORD="your_new_password"
export PG_DATABASE="equipements"
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB="equipements"

#your_new_password
sudo apt-get install -y kafka
kafka-topics.sh --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic pg-changes
kafka-topics.sh --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic migration-saga
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "ALTER SYSTEM SET wal_level = 'logical';"
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "ALTER SYSTEM SET max_replication_slots = 10;"
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "ALTER SYSTEM SET max_wal_senders = 10;"

sudo systemctl restart postgresql
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "SELECT pg_create_logical_replication_slot('equipements_slot', 'pgoutput');"
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "CREATE PUBLICATION equipements_pub FOR ALL TABLES;"

mkdir -p ~/debezium
wget https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/1.9.6.Final/debezium-connector-postgres-1.9.6.Final-plugin.tar.gz
tar -xzf debezium-connector-postgres-1.9.6.Final-plugin.tar.gz
cat > ~/schema-mapping.json << 'EOF'
{
  "schemaMapping": {
    "users": {
      "collection": "users",
      "fields": {
        "id": "_id",
        "username": "username",
        "email": "email"
      }
    },
    "projects": {
      "collection": "projects",
      "fields": {
        "id": "_id",
        "name": "name",
        "description": "description",
        "user_id": "userId"
      }
    }
  }
}
EOF

cat > ~/migrate.py << 'EOF'
#!/usr/bin/env python3
import psycopg2
import pymongo
import json
import os
import time
from confluent_kafka import Consumer, Producer

# Connect to PostgreSQL
pg_conn = psycopg2.connect(
    host=os.environ.get('PG_HOST'),
    port=os.environ.get('PG_PORT'),
    user=os.environ.get('PG_USER'),
    password=os.environ.get('PG_PASSWORD'),
    dbname=os.environ.get('PG_DATABASE')
)

# Connect to MongoDB
mongo_client = pymongo.MongoClient(os.environ.get('MONGO_URI'))
mongo_db = mongo_client[os.environ.get('MONGO_DB')]

# Load schema mapping
with open(os.path.expanduser('~/schema-mapping.json'), 'r') as f:
    schema_mapping = json.load(f)['schemaMapping']

# Initial data migration
def migrate_initial_data():
    cursor = pg_conn.cursor()
    
    for pg_table, mapping in schema_mapping.items():
        collection_name = mapping['collection']
        collection = mongo_db[collection_name]
        
        # Clear collection first
        collection.delete_many({})
        
        # Get all fields
        fields = list(mapping['fields'].keys())
        mongo_fields = list(mapping['fields'].values())
        
        # Query data
        cursor.execute(f"SELECT {', '.join(fields)} FROM {pg_table}")
        rows = cursor.fetchall()
        
        # Insert into MongoDB
        for row in rows:
            doc = {mongo_fields[i]: row[i] for i in range(len(fields))}
            collection.insert_one(doc)
            
        print(f"Migrated {len(rows)} records from {pg_table} to {collection_name}")

# Set up CDC consumer
def start_cdc_consumer():
    consumer_conf = {
        'bootstrap.servers': 'localhost:9092',
        'group.id': 'migration-consumer',
        'auto.offset.reset': 'earliest'
    }
    
    consumer = Consumer(consumer_conf)
    consumer.subscribe(['pg-changes'])
    
    producer_conf = {
        'bootstrap.servers': 'localhost:9092'
    }
    producer = Producer(producer_conf)
    
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
            
        if msg.error():
            print(f"Consumer error: {msg.error()}")
            continue
            
        try:
            change = json.loads(msg.value().decode('utf-8'))
            table_name = change['source']['table']
            
            if table_name in schema_mapping:
                mapping = schema_mapping[table_name]
                collection = mongo_db[mapping['collection']]
                
                # Handle different operations
                if change['op'] == 'c' or change['op'] == 'r':  # Create or Read
                    data = change['after']
                    doc = {mapping['fields'][k]: data[k] for k in mapping['fields']}
                    collection.insert_one(doc)
                    
                elif change['op'] == 'u':  # Update
                    data = change['after']
                    pk_field = mapping['fields']['id']
                    pk_value = data['id']
                    doc = {mapping['fields'][k]: data[k] for k in mapping['fields']}
                    collection.update_one({pk_field: pk_value}, {'$set': doc})
                    
                elif change['op'] == 'd':  # Delete
                    data = change['before']
                    pk_field = mapping['fields']['id']
                    pk_value = data['id']
                    collection.delete_one({pk_field: pk_value})
                
                # Send saga event
                saga_event = {
                    'table': table_name,
                    'collection': mapping['collection'],
                    'operation': change['op'],
                    'timestamp': time.time()
                }
                producer.produce('migration-saga', json.dumps(saga_event).encode('utf-8'))
                
        except Exception as e:
            print(f"Error processing message: {e}")

# Run migration
if __name__ == "__main__":
    print("Starting initial data migration...")
    migrate_initial_data()
    print("Initial migration complete. Starting CDC consumer...")

chmod +x ~/migrate.py
source ~/migration-venv/bin/activate
python ~/migrate.py

cat > ~/monitor.py << 'EOF'
#!/usr/bin/env python3
import pymongo
import os
import time
from confluent_kafka import Consumer

# Connect to MongoDB
mongo_client = pymongo.MongoClient(os.environ.get('MONGO_URI'))
mongo_db = mongo_client[os.environ.get('MONGO_DB')]

# Set up saga event consumer
consumer_conf = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'saga-monitor',
    'auto.offset.reset': 'earliest'
}

consumer = Consumer(consumer_conf)
consumer.subscribe(['migration-saga'])

# Monitor collections
collections = mongo_db.list_collection_names()
collection_counts = {coll: mongo_db[coll].count_documents({}) for coll in collections}

print("Initial collection counts:")
for coll, count in collection_counts.items():
    print(f"{coll}: {count} documents")

print("\nMonitoring CDC events:")
while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
        
    if msg.error():
        print(f"Consumer error: {msg.error()}")
        continue
        
    print(f"Saga event: {msg.value().decode('utf-8')}")
    
    # Update counts every 10 seconds
    if time.time() % 10 < 1:
        new_counts = {coll: mongo_db[coll].count_documents({}) for coll in collections}
        changes = {coll: new_counts[coll] - collection_counts[coll] for coll in collections}
        
        print("\nCollection count changes:")
        for coll, change in changes.items():
            if change != 0:
                print(f"{coll}: {change:+d} documents (total: {new_counts[coll]})")
                
        collection_counts = new_counts
EOF
chmod +x ~/monitor.py
python3 ~/monitor.py



sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo docker run -d -p 27017:27017 --name mongodb mongo:6.0

export MONGO_URI="mongodb://localhost:27017"
python ~/migrate.py
cat > ~/setup_postgres.py << 'EOF'
#!/usr/bin/env python3
import psycopg2
import os

# Connect to PostgreSQL
pg_conn = psycopg2.connect(
    host=os.environ.get('PG_HOST', 'localhost'),
    port=os.environ.get('PG_PORT', '5432'),
    user=os.environ.get('PG_USER', 'postgres'),
    password=os.environ.get('PG_PASSWORD', 'postgres'),
    dbname=os.environ.get('PG_DATABASE', 'portfolio')
)

cursor = pg_conn.cursor()

cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id)
)
''')

cursor.execute('''
INSERT INTO users (username, email) VALUES
    ('user1', 'user1@example.com'),
    ('user2', 'user2@example.com'),
    ('user3', 'user3@example.com')
''')

cursor.execute('''
INSERT INTO projects (name, description, user_id) VALUES
    ('Project 1', 'Description for project 1', 1),
    ('Project 2', 'Description for project 2', 1),
    ('Project 3', 'Description for project 3', 2),
    ('Project 4', 'Description for project 4', 3)
''')

pg_conn.commit()
cursor.close()
pg_conn.close()

print("PostgreSQL database setup completed successfully!")
EOF


sudo docker exec -it mongodb mongosh
use equipements


sudo -u postgres psql -d equipements -W your_new_password
cat > ~/equipements_schema_mapping.json << 'EOF'
{
  "schemaMapping": {
    "equipements": {
      "collection": "equipements",
      "fields": {
        "id": "_id"
      }
    },
    "fabricants": {
      "collection": "fabricants",
      "fields": {
        "id": "_id"
      }
    },
    "modeles": {
      "collection": "modeles",
      "fields": {
        "id": "_id"
      }
    },
    "entreprises": {
      "collection": "entreprises",
      "fields": {
        "id": "_id"
      }
    },
    "fonctions": {
      "collection": "fonctions",
      "fields": {
        "id": "_id"
      }
    },
    "defaillances": {
      "collection": "defaillances",
      "fields": {
        "id": "_id"
      }
    },
    "secteur_industriels": {
      "collection": "secteur_industriels",
      "fields": {
        "id": "_id"
      }
    },
    "unites": {
      "collection": "unites",
      "fields": {
        "id": "_id"
      }
    }
  }
}
EOF
cat > ~/migrate_equipements.py << 'EOF'
#!/usr/bin/env python3
import psycopg2
import pymongo
import json
import os
import time
from confluent_kafka import Consumer, Producer
import sys

# sent this in env file more secure
os.environ['PG_HOST'] = 'localhost'
os.environ['PG_PORT'] = '5432'
os.environ['PG_USER'] = 'postgres'
os.environ['PG_PASSWORD'] = 'your_new_password' 
os.environ['PG_DATABASE'] = 'equipements'
os.environ['MONGO_URI'] = 'mongodb://localhost:27017'
os.environ['MONGO_DB'] = 'equipements'

class Migrator:
    def _calls_methods(self, dictionary: dict, method_name: str, *args, **kwargs) -> None:
        for key, value in dictionary.items():
            if hasattr(value, method_name):
                getattr(value, method_name)(*args, **kwargs)

    def _connect(self, params=None, *args, **kwargs) -> None:
        connections = {
            "mongo": lambda *a, **k: self._connect_mongo(*a, **k),
            "postgres": lambda *a, **k: self._connect_postgres(*a, **k)
        }
        self._calls_methods(connections, "__call__", *args, **kwargs)

    def _connect_mongo(self, *args, **kwargs) -> None:
        try:
            self.mongo_client = self.pymongo.MongoClient(self.mongo_uri, *args, **kwargs)
            self.mongo_db = self.mongo_client[self.mongo_db_name]
            print(f"Connected to MongoDB: {self.mongo_db_name}")
        except Exception as e:
            print(f"Error connecting to mongo: {e}")
            self.sys.exit(1)

    def _connect_postgres(self, *args, **kwargs) -> None:
        try:
            conf = self.pg_conf.copy()
            conf.update(kwargs)
            self.pg_conn = self.psycopg2.connect(**conf)
            print(f"Connected to PostgreSQL: {conf['dbname']}")
        except Exception as e:
            print(f"Error connecting to postgres: {e}")
            self.sys.exit(1)

    def __init__(self, **kwargs) -> None:
        import psycopg2, pymongo, json, os, sys
        self.os = os
        self.sys = sys
        self.psycopg2 = psycopg2
        self.pymongo = pymongo

        self.pg_conf = {
            'host': kwargs.get('pg_host', os.environ.get('PG_HOST')),
            'port': kwargs.get('pg_port', os.environ.get('PG_PORT')),
            'user': kwargs.get('pg_user', os.environ.get('PG_USER')),
            'password': kwargs.get('pg_password', os.environ.get('PG_PASSWORD')),
            'dbname': kwargs.get('pg_database', os.environ.get('PG_DATABASE'))
        }

        self.mongo_uri = kwargs.get('mongo_uri', os.environ.get('MONGO_URI'))
        self.mongo_db_name = kwargs.get('mongo_db', os.environ.get('MONGO_DB'))
        self.schema_path = kwargs.get('schema_path', os.path.expanduser('~/equipements_schema_mapping.json'))

        self._connect(mongo_uri=self.mongo_uri, mongo_db_name=self.mongo_db_name)
        self._connect(pg_conf=self.pg_conf)

        try:
            self.schema_mapping = json.load(open(self.schema_path))['schemaMapping']
            print("Loaded schema mapping")
        except Exception as e:
            print(f"Error loading schema mapping: {e}"), sys.exit(1)

    def get_columns(self, table) -> list[str]:
        cur = self.pg_conn.cursor()
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table,))
        return [r[0] for r in cur.fetchall()]

    def migrate(self) -> None:
        cur = self.pg_conn.cursor()
        for pg_table, mapping in self.schema_mapping.items():
            coll = self.mongo_db[mapping['collection']]
            try:
                coll.delete_many({})
                columns = self.get_columns(pg_table)
                if not columns: print(f"No columns for {pg_table}"); continue

                fields = {col: mapping['fields'].get(col, col) for col in columns}
                cur.execute(f"SELECT {', '.join(columns)} FROM {pg_table}")

                docs = [
                    {fields[col] if not (col == 'id' and fields[col] == '_id') else '_id': (row[i].decode('utf-8', 'replace') if isinstance(row[i], (bytes, bytearray)) else row[i])
                     for i, col in enumerate(columns)}
                    for row in cur.fetchall()
                ]

                if docs:
                    try:
                        coll.insert_many(docs, ordered=False)
                        print(f"Migrated {len(docs)} from {pg_table} to {mapping['collection']}")
                    except Exception as e:
                        print(f"Insert error {mapping['collection']}: {getattr(e, 'details', e)}")
                else: print(f"No docs for {pg_table}")
            except Exception as e: print(f"Error processing {pg_table}: {e}")

if __name__ == "__main__":
    Migrator().migrate()
    print("Migration compléter waw incroyable bravo, trop fort gg merdouille raaaaahhhhh hh h ehehe!")
EOF