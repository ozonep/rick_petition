const express = require('express');
const router = new express.Router();
const spicedPg = require('spiced-pg');
const bcrypt = require('bcryptjs');
// var dbUrl = process.env.DATABASE_URL || 'postgres://ivanmalkov:password@localhost:5432/pet';
const db = spicedPg(process.env.DATABASE_URL);

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

router.route("/")
    .get((req, res) => {
        req.session.cookie.maxAge = 3600000;
        console.log(req.session);
        if (!req.session.user) {
            res.redirect("/register");
        } else if (req.session.signatureId) {
            res.redirect("/thanks");
        } else {
            console.log(req.session);
            res.render("home", {
                title: "Petition",
                csrfToken: req.csrfToken(),
                helpers: {
                    err: function () {
                        if (req.session.isEmpty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                    }
                }
            });
        }
    })
    .post((req, res) => {
        let data = req.body;
        console.log(data);
        if (data.canvasimg) {
            const text = 'INSERT INTO signatures (signature, user_id) VALUES ($1, $2) RETURNING *';
            const values = [data.canvasimg, req.session.user.id];
            db.query(text, values).then((results) => {
                console.log(results.rows[0]);
                req.session.signatureId = true;
            }).then(() => {
                req.session.isEmpty = false;
                res.redirect("/thanks");
            }).catch((err) => {
                console.log(err);
            });
        } else {
            req.session.isEmpty = true;
            res.redirect("/");
        }
    })
;

router.route("/profile")
    .get((req, res) => {
        if (!req.session.user) {
            res.redirect("/register");
        } else if (req.session.profile) {
            res.redirect("/profile/edit");
        } else {
            res.render("profile", {
                title: "Profile",
                csrfToken: req.csrfToken()
            });
        }
    })
    .post((req, res) => {
        let data = req.body;
        req.session.profile = true;
        const text = "INSERT INTO user_profiles (age, city, url, user_id) VALUES (NULLIF($1, '')::integer, $2, $3, $4)";
        const values = [data.age, data.city, data.url, req.session.user.id];
        db.query(text, values).then(() => {
            req.session.isEmpty = false;
            res.redirect("/");
        }).catch((err) => {
            console.log(err);
        });
    })
;

router.route("/profile/edit")
    .get((req, res) => {
        if (!req.session.user) {
            res.redirect("/register");
        } else if (!req.session.profile) {
            res.redirect("/profile");
        } else {
            const text = 'SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1';
            const values = [req.session.user.id];
            db.query(text, values).then((results) => {
                let data = results.rows[0];
                res.render("profedit", {
                    title: "Profile Editing",
                    csrfToken: req.csrfToken(),
                    first: data.first,
                    last: data.last,
                    email: data.email,
                    age: data.age,
                    city: data.city,
                    url: data.url
                });
            });
        }
    })
    .post((req, res) => {
        let data = req.body;
        const text_two = 'INSERT INTO user_profiles (user_id, age, city, url) values ($1, $2::integer, $3, $4) ON CONFLICT (user_id) DO UPDATE SET (age, city, url) = ($2::integer, $3, $4) RETURNING *';
        const values_two = [req.session.user.id, data.age, data.city, data.url];
        if (data.pass) {
            hashPassword(data.pass).then((hash) => {
                const text = 'UPDATE users SET (first, last, email, password) = ($1,$2, $3, $4) WHERE id = $5 RETURNING *';
                const values = [data.name, data.surname, data.email, hash, req.session.user.id];
                db.query(text, values).then((results) => {
                    console.log(results.rows);
                    req.session.user.first = results.rows[0].first;
                    req.session.user.last = results.rows[0].last;
                    req.session.isEmpty = false;
                    db.query(text_two, values_two).then(() => {
                        res.redirect("/");
                    });
                }).catch((err) => {
                    console.log(err);
                });
            }).catch((err) => {
                console.log(err);
            });
        } else {
            const text_one = 'UPDATE users SET (first, last, email) = ($1,$2, $3) WHERE id = $4 RETURNING *';
            const values_one = [data.name, data.surname, data.email, req.session.user.id];
            db.query(text_one, values_one).then((results) => {
                console.log(results.rows);
                req.session.user.first = results.rows[0].first;
                req.session.user.last = results.rows[0].last;
                req.session.isEmpty = false;
                db.query(text_two, values_two).then(() => {
                    res.redirect("/");
                });
            }).catch((err) => {
                console.log(err);
            });
        }
    })
;

router.route("/register")
    .get((req, res) => {
        if (!req.session.user) {
            res.render("register", {
                title: "Registration",
                csrfToken: req.csrfToken(),
                helpers: {
                    err: function () {
                        if (req.session.isEmpty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                    }
                }
            });
        } else {
            res.redirect("/");
        }
    })
    .post((req, res) => {
        let data = req.body;
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
                req.session.isEmpty = false;
                res.redirect("/profile");
            }).catch((err) => {
                console.log(err);
            });
        } else {
            req.session.isEmpty = true;
            res.redirect("/register");
        }
    })
;

router.route("/login")
    .get((req, res) => {
        if (req.session.user) {
            res.redirect("/");
        } else {
            res.render("login", {
                title: "Log in",
                csrfToken: req.csrfToken(),
                helpers: {
                    err: function () {
                        if (req.session.isEmpty) return "Sorry, you didn't fill all necessary fields or used inappropriate characters";
                    }
                }
            });
        }
    })
    .post((req, res) => {
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
                                id: result.id,
                            };
                            req.session.isEmpty = false;
                            req.session.profile = true;
                            let value = [req.session.user.id];
                            db.query('SELECT id, signature FROM signatures WHERE user_id = $1', value). then((results) => {
                                if (results.rows[0].signature) {
                                    req.session.signatureId = true;
                                    console.log("After login", req.session);
                                    res.redirect("/");
                                } else {
                                    console.log("After login TEST", req.session);
                                    res.redirect("/");
                                }
                            });
                        } else {
                            req.session.isEmpty = true;
                            res.redirect("/login");
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                } else {
                    req.session.isEmpty = true;
                    res.redirect("/login");
                }
            });
        } else {
            req.session.isEmpty = true;
            res.redirect("/login");
        }
    })
;

router.get("/logout", (req, res) => {
    req.session.destroy(function() {
        res.redirect("/login");
    });
});

router.get("/deletesig", (req, res) => {
    const text = 'DELETE FROM signatures WHERE user_id = $1';
    const values = [req.session.user.id];
    db.query(text, values).then(() => {
        req.session.signatureId = false;
        res.redirect("/");
    });
});

router.get("/signers/:city", (req, res) => {
    if (req.session.signatureId) {
        const text = 'SELECT * FROM users JOIN user_profiles ON users.id = user_profiles.user_id WHERE user_profiles.city = $1';
        const values = [req.params.city];
        db.query(text, values).then((results) => {
            let citizens = results.rows;
            res.render("city", {
                title: "Cities",
                city: req.params.city,
                citizens: citizens,
            });
        });
    } else {
        res.redirect("/");
    }
});

router.get("/thanks", (req, res) => {
    if (req.session.signatureId) {
        const text = 'SELECT id, signature FROM signatures WHERE user_id = $1';
        const value = [req.session.user.id];
        let voterNumber;
        let myImg;
        db.query(text, value).then(function(results) {
            myImg = results.rows[0].signature;
            return db.query('SELECT id, signature FROM signatures');
        }).then((results) => {
            voterNumber = results.rows.length;
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

router.get("/signers", (req, res) => {
    //  client.get('city', function(err, data) {
    //         if (err) {
    //             return console.log(err);
    //         }
    //         console.log('The value of the "city" key is ' + data);
    //     });
    // });
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

module.exports = router;