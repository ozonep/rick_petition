DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY ,
  first VARCHAR(10) NOT NULL ,
  last VARCHAR(10) NOT NULL ,
  email VARCHAR(20) NOT NULL UNIQUE ,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY ,
  age INTEGER ,
  city VARCHAR(20) ,
  url TEXT ,
  user_id INTEGER REFERENCES users (id)
);

CREATE TABLE signatures (
  id SERIAL PRIMARY KEY ,
  signature TEXT not NULL ,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ,
  user_id INTEGER REFERENCES users (id)
);
