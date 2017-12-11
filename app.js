// ws03.js
// Jesper Larsson 2016

var http = require('http');
var ip = require("ip");
var pgp = require('pg-promise')();
var url = require('url');

 // ---------------- Övriga funktioner ----------------


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
    resp.write("<body><link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css' integrity='sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u' crossorigin='anonymous'>\n");
    resp.write("<div class='container'>");

    resp.write("<div class='row'>")
    resp.write("<div class='col-sm-6'>")
    resp.write("<h1>Välkommen till denna <strong>webbplats</strong></h1></div></div>\n");

    resp.write("<div class='row'>")
    resp.write("<div class='col-sm-3'><ul class='list-group'>");
    resp.write("<li class='list-group-item'><a href='allabokningar.html'>Alla bokningar</a></li>\n");
    resp.write("<li class='list-group-item'><a href='epostlista.html'>Kunder och epostadresser</a></li>\n");
    resp.write("<li class='list-group-item'><a href='boka'>Boka garageplats</a></li>\n");
    resp.write("</ul></div></div>");

    resp.write("<div class='row'>")
    resp.write("<div class='col-sm-8'>")
    resp.write("<form action=bokningar method='GET'><div class='form-check'><label class='form-check-label'>\n");
    resp.write("<input class='form-check-input' type='radio' name='elbilsplats' value=1 checked> Visa Elbilsbokningar<br></label>\n");
    resp.write("<label class='form-check-label'><input class='form-check-input' type='radio' name='elbilsplats' value=0> Visa alla bokningar<br></label>\n");
    resp.write("<input type='submit' class='btn btn-primary' value='Ok'>\n");
    resp.write("</div></form>\n");


    resp.end("</div></div></body>");

}

var sendNotFound = function(url, resp) {
    resp.statusCode = 404;
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Hittar inte</title>");
    resp.write("Kan inte hitta "+url);
    resp.end();
}

var sendAllaBokningar = function(resp) {
    var handleAllaBokningar = function(rows) {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Alla bokningar</title>\n");
        resp.write("<table><tr><th>Namn</th><th>Parkeringsplats</th></tr>\n");

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
        resp.write("<ul>\n");
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

        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bokningar</title>\n");
        resp.write("<h1>Bokningar:</h1>");
        resp.write("<ul>\n");



        for (i = 0; i < rows.length; i++) {

          /*//Formattera Starttid från DateTime variablen
          var dateStartFromDatabase = rows[i].starttid;

          var localStartDate = new Date(dateStartFromDatabase);
          var localStartDateString = localStartDate.toLocaleDateString();

          //Formattera Sluttid från DateTime variabeln

          var dateEndFromDatabase = rows[i].sluttid;

          var localEndDate = new Date(dateEndFromDatabase);
          var localEndDateString = localEndDate.toLocaleDateString();


          //Formattera starttid - klockslag
          var localStartTimeString = localStartDate.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
          })
          //Formattera sluttid - klockslag
          var localEndTimeString = localEndDate.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'

          })*/

            resp.write("<br><li>"+rows[i].startdatum+" - "+rows[i].slutdatum+" "+rows[i].objektnamn+"</li>\n");
}
        resp.end("</ul>");
    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
}

//
    sqlConn.any('select * from ((objekt join bokning on objekt.objektid=bokning.objektID)bokning right join kund on bokning.pnr=kund.pnr) objekt where elbilsplats=$1;', [elbilsplats])
        .then(handleBokningar)
        .catch(handleError);

}

// --------------------- Skapa bokning: STEP 1 ------------------

    var sendSkapaBokning_step1 = function(resp) {

      resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bokningar</title>\n");
      resp.write("<h1>Skapa bokning:</h1>\n");
      resp.write("<p><form method='GET'>" + "Startdatum: "+"<input type='date' name='startdatum'>\n");
      resp.write("Slutdatum: "+"<input type='date' name='slutdatum'><br>\n");
      resp.write("<input type='submit' value='Sök lediga parkeringsplatser'></form>\n");

    /* var handleSkapaBokning_step1 = function(rows) {





            resp.write("<ul>\n");
            for (i = 0; i < rows.length; i++) {
                resp.write("<li>"+rows[i].namn+": <code>"+rows[i].epost+"</code></li>\n");
            }
            resp.end("</ul>");
        } */

        var handleError = function(err) {
            resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
        }
        resp.end();
/*
      sqlConn.any('select objektnamn from (objekt join bokning on objekt.objektid!=bokning.objektID)where startdatum=$1 && slutdatum=$2'[startdatum, slutdatum])
            .then(handleSkapaBokningar)
            .catch(handleError); */
}
// ---------------- Skapa bokning: STEP 2

var sendSkapaBokning_step2 = function(startdatum, slutdatum, resp) {

  console.log("hej");


var handleSkapaBokning_step2 = function(rows) {
  resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bokningar</title>\n");
  resp.write("<h1>Skapa bokning - Steg 2</h1>\n");
  resp.write("<h5>Följande platser är bokningsbara:</h5><ul>\n");




          for (i = 0; i < rows.length; i++) {

            resp.write("<br><li>"+rows[i].startdatum+" "+rows[i].slutdatum+"</li>\n");
  }
        resp.end("</ul>");
    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
  }
  //ON_ERROR_STOP on

        sqlConn.any('select objekt.objektNamn from objekt where objekt.objektID not in (select bokning.objektID from (bokning join objekt on bokning.objektID = objekt.objektID) where (bokning.startdatum <= $1  and bokning.slutdatum >= $1) or (bokning.startdatum < $2 and bokning.slutdatum >= $2) or ($1 <= bokning.startdatum and $2 >= bokning.startdatum)', [startdatum, slutdatum])

          //.then(console.log(result.rows[0].objektNamn));
          .then(handleSkapaBokning_step2)
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
    } else if (req.url == "/boka"){
          sendSkapaBokning_step1(resp);
    } else if (parsed.pathname == "/boka"){
        sendSkapaBokning_step2(parsed.query.startdatum.slutdatum, resp);
    } else {
        sendNotFound(req.url, resp);
    }
}

// ---------------- get it started! ----------------

var httpConn = http.createServer(handleWebRequest);
var port = 8888;
httpConn.listen(port);
console.log("Väntar på att någon ska surfa in på http://" + ip.address() + ":" + port);
