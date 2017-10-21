const express = require("express");
const app = express();
const hb = require("express-handlebars");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const router = require("./routers/router");

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
app.use(router);

app.listen(8080);