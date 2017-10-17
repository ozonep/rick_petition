const express = require("express");
const app = express();
const hb = require("express-handlebars");
const spicedPg = require('spiced-pg');
const querystring = require('querystring');
const cookieSession = require("cookie-session");
const db = spicedPg('postgres:ivanmalkov:password@localhost:5432/pet');
const bcrypt = require('bcryptjs');
var empty = false;
var date = new Date();

app.engine('handlebars', hb({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(cookieSession({
    secret: 'something stupid',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));
app.use('/public', express.static(__dirname + '/public'));

function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}

app.get("/", (req, res) => {
    if (!req.session.user) {
        res.redirect("/register");
    } else {
        res.render("home", {
            title: "Petition",
            helpers: {
                err: function () {
                    if (empty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                }
            }
        });
    }
});

app.get("/register", (req, res) => {
    res.render("register", {
        title: "registration",
        helpers: {
            err: function () {
                if (empty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
            }
        }
    });
});

app.get("/login", (req, res) => {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("login", {
            title: "Log in",
            helpers: {
                err: function () {
                    if (empty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                }
            }
        });
    }
});

app.post("/login", (req, res) => {
    let result;
    let data = querystring.parse(req.body);
    if (data.email && data.pass) {
        const text = 'SELECT * FROM users WHERE email = $1';
        const value = [data.email];
        db.query(text, value).then((results) => {
            result = results.rows[0];
            return checkPassword(data.pass, result.password);
        }).then((doesMatch) => {
            console.log(doesMatch);
            if (doesMatch) {
                req.session.user = {
                    first: result.first,
                    last: result.last
                };
            } else {
                res.redirect("/login");
            }
        }).then(() => {
            empty = false;
            res.redirect("/");
        }).catch(function(err) {
            console.log(err);
        });
    }
});

app.post("/register", (req, res) => {
    let data = querystring.parse(req.body);
    console.log(data);
    if (data.name && data.surname && data.email && data.pass) {
        hashPassword(data.pass).then((hash) => {
            const text = 'INSERT INTO users (first, last, email, password) VALUES ($1, $2, $3, $4) RETURNING *';
            const values = [data.name, data.surname, data.email, hash];
            return db.query(text, values);
        }).then(() => {
            req.session.user = {
                first: data.name,
                last: data.surname
            };
        }).then(() => {
            res.redirect("/");
            empty = false;
        }).catch((err) => {
            console.log(err);
        });
    } else {
        res.redirect("/register");
        empty = true;
    }
});

app.post("/form", (req, res) => {
    let data = querystring.parse(req.body);
    console.log(data);
    if (data.name && data.surname && data.canvasimg) {
        const text = 'INSERT INTO signatures (first, last, signature, date) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [data.name, data.surname, data.canvasimg, date];
        db.query(text, values).then((results) => {
            console.log(results.rows[0]);
            req.session.signatureId = results.rows[0].id;
        }).then(() => {
            res.redirect("/thanks");
            empty = false;
        }).catch(function(err) {
            console.log(err);
        });
    } else {
        empty = true;
        res.redirect("/");
    }
});

app.get("/thanks", (req, res) => {
    db.query('SELECT id, signature FROM signatures').then(function(results) {
        let voterNumber = results.rows.length;
        let myImg = results.rows[req.session.signatureId - 1].signature;
        res.render("thanks", {
            title: "Thank you!",
            number: voterNumber,
            sign: myImg
        });
    }).catch(function(err) {
        console.log(err);
    });
});

app.get("/signers", (req, res) => {
    db.query('SELECT first, last FROM signatures').then(function(results) {
        let voters = results.rows;
        console.log(voters);
        res.render("signers", {
            title: "Signers",
            voters: voters,
        });
    }).catch(function(err) {
        console.log(err);
    });
});

app.listen(8080);