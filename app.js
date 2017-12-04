// app.js
// Mattias Henricson 2017

var http = require('http');
var ip = require("ip");
var pgp = require('pg-promise')();
var url = require('url');



// ---------------- database connection ----------------

var sqlConn = pgp({
    user: 'ah1311',             
    password: 'f7qz5x2r',       
    database: 'booking',        
    host: 'pgserver.mah.se',
    client_encoding: 'UTF8'     
});

// ---------------- service handlers ----------------

var sendBasePage = function(resp) {
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Välkommen</title>");
    resp.write("Välkommen till denna <strong>webbplats</strong>\n<ul>")
    resp.write("<li><a href='allabokningar.html'>Alla bokningar</a></li>\n");
    resp.write("<li><a href='epostlista.html'>Kunder och epostadresser</a></li>\n");

    resp.write("<form action=bokningar method='GET'>\n");
    resp.write("<input type='radio' name='elbilsplats' value=1 checked> Visa Elbilsbokningar<br>\n");
    resp.write("<input type='radio' name='elbilsplats' value=0> Visa alla bokningar<br>\n");
    resp.write("<input type='submit' value='Ok'>\n");
    resp.write("</form>\n");

    resp.end("<ul>");
}

var sendNotFound = function(url, resp) {
    resp.statusCode = 404;
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Hittar inte</title>");
    resp.write("Kan inte hitta "+url)
    resp.end();
}

var sendAllaBokningar = function(resp) {
    var handleAllaBokningar = function(rows) {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Alla bokningar</title>\n");
        resp.write("<table><tr><th>Namn</th><th>Parkeringsplats</th></tr>\n")

        for (i = 0; i < rows.length; i++) {
            resp.write("<tr><td>" + rows[i].namn+" </td><td> "+rows[i].objektnamn + "</td></tr>\n");
        }

        resp.end("</table>");
    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
    }

    sqlConn.any('select namn, objektnamn, starttid from ((objekt join bokning on objekt.objektid=bokning.objektID) bokning join kund on bokning.pnr=kund.pnr)')
        .then(handleAllaBokningar)
        .catch(handleError);
}

var sendNamnEpost = function(resp) {
     var handleNamnEpost = function(rows) {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>E-postadresslista</title>\n");
        resp.write("<ul>\n")
        for (i = 0; i < rows.length; i++) {
            resp.write("<li>"+rows[i].namn+": <code>"+rows[i].epost+"</code></li>\n");
        }
        resp.end("</ul>");
    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
    }

    sqlConn.any('select namn, epost from kund')
        .then(handleNamnEpost)
        .catch(handleError);
}

var sendBokningar = function(elbilsplats, resp) {
    var handleBokningar = function(rows) {
/*
        var defineElbil = "";
        function defineElbilsplats(elbilsplats) {
          if (elbilsplats=1) {
          defineElbil = "elbilsbokningar"
        } else {
          defineElbil = "bokningar"
        }
*/

        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bokningar</title>\n");
        resp.write("<h1>Bokningar:</h1>");
        resp.write("<ul>\n")



        for (i = 0; i < rows.length; i++) {

          //Formattera Starttid från DateTime variablen
          var dateStartFromDatabase = rows[i].starttid;

          var localStartDate = new Date(dateStartFromDatabase);
          var localStartDateString = localStartDate.toLocaleDateString();

          //Formattera Sluttid från DateTime variabeln

          var dateEndFromDatabase = rows[i].sluttid;

          var localEndDate = new Date(dateEndFromDatabase);
          var localEndDateString = localEndDate.toLocaleDateString();


          //Formattera starttid
          var localStartTimeString = localStartDate.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
          })
          //Formattera sluttid
          var localEndTimeString = localEndDate.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'

          })

            resp.write("<br><li>"+localStartDateString+" - "+localEndDateString+" "+rows[i].objektnamn+" "+"<br>"+"Platsen är bokad från "+localStartTimeString+" till "+localEndTimeString +"</li>\n");
        }
        resp.end("</ul>");
    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
    }

//    sqlConn.any("select kurs from läser where student='"+student+"'")
    sqlConn.any('select * from ((objekt join bokning on objekt.objektid=bokning.objektID)bokning right join kund on bokning.pnr=kund.pnr) objekt where elbilsplats=$1;', [elbilsplats])
        .then(handleBokningar)
        .catch(handleError);
}

// ---------------- the core request handler ----------------

var handleWebRequest = function(req, resp) {
    var parsed = url.parse(req.url, true);
    var param;

    for (param in parsed.query) {
        console.log("Parameter: "+param+", värde: "+parsed.query[param]);
    }

    if (req.url == "/" || req.url == "/index.html") {
        sendBasePage(resp);
    } else if (req.url == "/allabokningar.html") {
        sendAllaBokningar(resp);
    } else if (req.url == "/epostlista.html") {
        sendNamnEpost(resp);
    } else if (parsed.pathname == "/bokningar") {
        sendBokningar(parsed.query.elbilsplats, resp);
    } else {
        sendNotFound(req.url, resp);
    }
}

// ---------------- get it started! ----------------

var httpConn = http.createServer(handleWebRequest);
var port = 8888;
httpConn.listen(port);
console.log("Väntar på att någon ska surfa in på http://" + ip.address() + ":" + port);
