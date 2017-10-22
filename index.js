const express = require("express");
const app = express();
const hb = require("express-handlebars");
const bodyParser = require("body-parser");
const csurf = require("csurf");
const router = require("./routers/router");
const redis = require('redis');
const client = redis.createClient({
    host: 'localhost',
    port: 6379
});
const session = require('express-session');
const Store = require('connect-redis')(session);
// var countries = require ('countries-cities').getCountries();
// var cities = require ('countries-cities').getCities(country_name);

app.engine('handlebars', hb({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(session({
    store: new Store({
        ttl: 3600,
        host: 'localhost',
        port: 6379
    }),
    resave: false,
    saveUninitialized: true,
    secret: 'something stupid'
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(__dirname + '/public'));
app.use(csurf({ cookie: false }));
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    res.status(403);
    res.send('form tampered with');
});
client.on('error', (err) => {
    console.log(err);
});
app.use(router);

app.listen(process.env.PORT || 8080);
