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


UPDATE users SET (first, last, email, password) = ($1,$2, $3, $4) WHERE id = req.session.id;
INSERT INTO user_profiles (user_id, age, city, url) values ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET (age, city, url) = ($2, $3, $4);
