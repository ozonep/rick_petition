const express = require("express");
const hb = require("express-handlebars");
const spicedPg = require('spiced-pg');
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcryptjs');
const csurf = require("csurf");
const app = express();
const db = spicedPg('postgres:ivanmalkov:password@localhost:5432/pet');
var empty = false;
var date = new Date();
// var countries = require ('countries-cities').getCountries();
// var cities = require ('countries-cities').getCities(country_name);


app.engine('handlebars', hb({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(cookieSession({
    secret: 'something stupid',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(__dirname + '/public'));
// app.use(csurf({ cookie: false }));

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

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
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
    let data = req.body;
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
                    last: result.last,
                    id: result.id
                };
                empty = false;
                res.redirect("/");
            } else {
                res.redirect("/login");
            }
        }).catch((err) => {
            console.log(err);
        });
    } else {
        empty = true;
        res.redirect("/login");
    }
});

app.post("/register", (req, res) => {
    let data = req.body;
    console.log(data);
    if (data.name && data.surname && data.email && data.pass) {
        hashPassword(data.pass).then((hash) => {
            const text = 'INSERT INTO users (first, last, email, password) VALUES ($1, $2, $3, $4) RETURNING *';
            const values = [data.name, data.surname, data.email, hash];
            return db.query(text, values);
        }).then((results) => {
            console.log(results.rows);
            req.session.user = {
                first: results.rows[0].first,
                last: results.rows[0].last,
                id: results.rows[0].id
            };
        }).then(() => {
            res.redirect("/");
            empty = false;
        }).catch((err) => {
            console.log(err);
        });
    } else {
        empty = true;
        res.redirect("/register");
    }
});

app.post("/form", (req, res) => {
    let data = req.body;
    console.log(data);
    if (data.canvasimg) {
        const text = 'INSERT INTO signatures (signature, user_id) VALUES ($1, $2) RETURNING *';
        const values = [data.canvasimg, req.session.user.id];
        db.query(text, values).then((results) => {
            console.log(results.rows[0]);
            req.session.signatureId = results.rows[0].id;
        }).then(() => {
            res.redirect("/thanks");
            empty = false;
        }).catch((err) => {
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
    }).catch((err) => {
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
    }).catch((err) => {
        console.log(err);
    });
});

app.listen(8080);