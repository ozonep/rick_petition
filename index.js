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
// TODO Fix date!
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
app.use(csurf({ cookie: false }));
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    res.status(403);
    res.send('form tampered with');
});

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
    } else if (req.session.signatureId) {
        res.redirect("/thanks");
    } else {
        res.render("home", {
            title: "Petition",
            csrfToken: req.csrfToken(),
            helpers: {
                err: function () {
                    if (empty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                }
            }
        });
    }
});

app.get("/profile", (req, res) => {
    if (!req.session.user) {
        res.redirect("/register");
    } else if (req.session.profile) {
        res.redirect("/profile/edit");
    } else {
        res.render("profile", {
            title: "Profile",
            csrfToken: req.csrfToken()
        });
        req.session.profile = true;
    }
});

app.get("/profile/edit", (req, res) => {

});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});

app.get("/register", (req, res) => {
    if (!req.session.user) {
        res.render("register", {
            title: "Registration",
            csrfToken: req.csrfToken(),
            helpers: {
                err: function () {
                    if (empty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                }
            }
        });
    }
    else {
        res.redirect("/");
    }
});

app.get("/login", (req, res) => {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("login", {
            title: "Log in",
            csrfToken: req.csrfToken(),
            helpers: {
                err: function () {
                    if (empty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                }
            }
        });
    }
});

app.get("/signers/:city", (req, res) => {
    if (req.session.signatureId) {
        const text = 'SELECT * FROM users JOIN user_profiles ON users.id = user_profiles.user_id WHERE user_profiles.city = $1';
        const values = [req.params.city];
        db.query(text, values).then((results) => {
            let citizens = results.rows;
            res.render("city", {
                city: req.params.city,
                citizens: citizens,
            });
        });
    } else {
        res.redirect("/");
    }
});

app.get("/thanks", (req, res) => {
    if (req.session.signatureId) {
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
    } else {
        res.redirect("/");
    }
});

app.get("/signers", (req, res) => {
    if (req.session.signatureId) {
        db.query('SELECT * FROM users JOIN signatures ON users.id = signatures.user_id LEFT JOIN user_profiles ON signatures.user_id = user_profiles.user_id').then(function(results) {
            let voters = results.rows;
            console.log(voters);
            res.render("signers", {
                title: "Signers",
                voters: voters,
                helpers: {
                    signs: function (age, city) {
                        if (city && age) {
                            return `(${age}, <a href="/signers/${city}">${city}</a>)`;
                        } else if (!age && !city) {
                            return "";
                        } else if (!age && city) {
                            return `(<a href="/signers/${city}">${city}</a>)`;
                        } else {
                            return `(${age})`;
                        }
                    }
                }
            });
        }).catch((err) => {
            console.log(err);
        });
    } else {
        res.redirect("/");
    }
});

app.post("/profile", (req, res) => {
    let data = req.body;
    const text = "INSERT INTO user_profiles (age, city, url, user_id) VALUES (NULLIF($1, '')::integer, $2, $3, $4)";
    const values = [data.age, data.city, data.url, req.session.user.id];
    db.query(text, values).then((results) => {
        console.log(results.rows);
        res.redirect("/");
        empty = false;
    }).catch((err) => {
        console.log(err);
    });
});

app.post("/login", (req, res) => {
    let result;
    let data = req.body;
    if (data.email && data.pass) {
        const text = 'SELECT * FROM users WHERE email = $1';
        const value = [data.email];
        db.query(text, value).then((results) => {
            if (results.rows[0]) {
                result = results.rows[0];
                checkPassword(data.pass, result.password).then((doesMatch) => {
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
                        empty = true;
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
            res.redirect("/profile");
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

app.listen(8080);