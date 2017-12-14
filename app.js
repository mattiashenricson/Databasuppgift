//Gruppuppgift: Pauline, Olliver och Mattias

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


// ------------ vvv Style functions below vvv---------



// ------------ Navbar ---------
function showNavbar(resp, err){
  resp.write("<body><link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css' integrity='sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u' crossorigin='anonymous'>\n");
  resp.write("<nav class='navbar navbar-default'>");
  resp.write("<div class='container-fluid'>");
  resp.write("<div class='navbar-header'>");
  resp.write("<a class='navbar-brand' href='/'>");
  resp.write("<button type='button' class='btn btn-primary'>Hem</button>");
  resp.write("</a></div></div></nav>");
}

// ------------ Footer ---------
function showFooter(resp, err){
resp.write("<div class='fixed-bottom'>");
resp.write("<img src='http://www.stockholmparkering.se/SiteAssets/siluett_med_byggkranar_gra_bg_h375.png' class='img-responsive' height=50% width=100%>");
resp.write("</div>");
}

// ------------ Handle Error ---------
var handleError = function(resp, err) {
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Fel!</title>");
    showNavbar(err)

    resp.write("<div class='container-fluid'>");
    resp.write("<div class='row'>")
    resp.write("<div class='col-sm-6'>")

    resp.write("<h1>Ojdå, något gick fel!</h1><br><br>\n");
    resp.write("<h3>Det blev fel! " + err+"</h3>");

    showFooter(err);

    resp.write("</div></div></div></body>");
    resp.end();

}


// ---------------- service handlers ----------------
var sendBasePage = function(resp) {

    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Välkommen</title>");


    showNavbar(resp);

    resp.write("<div class='container-fluid'>");
    resp.write("<div class='row'>");
    resp.write("<div class='col-sm-6'>");
    resp.write("<h1>Parkeringshuset</h1></div></div>\n");

    resp.write("<p><div class='row'>")
    resp.write("<div class='col-sm-3'><ul class='list-group'>");
    resp.write("<li class='list-group-item'><a href='allabokningar.html'>Alla bokningar</a></li>\n");
    resp.write("<li class='list-group-item'><a href='epostlista.html'>Kunder och epostadresser</a></li>\n");
    resp.write("<li class='list-group-item'><a href='sok_kund'>Sök bokning</a></li>\n");

    resp.write("</p></div");
    resp.write("</ul></div>");


    showFooter(resp);

    resp.end("</div></body>");

}

var sendNotFound = function(url, resp) {
    resp.statusCode = 404;
    resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Hittar inte</title>");
    showNavbar(resp);
    resp.write("<div class='container-fluid'>");
    resp.write("<div class='row'>")
    resp.write("<div class='col-sm-6'>")
    resp.write("<h1>Ojdå, något gick fel!</h1><br><br>\n");
    resp.write("<h3>Kan inte hitta sidan: "+url+"</div></div></h3>\n");

    showFooter(resp);

    resp.write("</div></body>");
}


//----- ALLA BOKNINGAR --------
var sendAllaBokningar = function(resp) {
    var handleAllaBokningar = function(rows) {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Alla bokningar</title>");

        showNavbar(resp);

        resp.write("<div class='container-fluid'>");
        resp.write("<div class='row'>")
        resp.write("<div class='col-sm-6'>")
        resp.write("<h1>Alla bokningar</h1></div></div>\n");

        resp.write("<table class='table table-striped'><thead><tr><th scope='col'>Bokningsnummer</th><th scope='col'>Bokad av</th><th scope='col'>Plats</th><th scope='col'>Startdatum</th><th scope='col'>Slutdatum</th></tr></thead>\n");
        resp.write("<tbody>")

        for (i = 0; i < rows.length; i++) {

          //Formattera startdatum
          var dateStartFromDatabase = rows[i].startdatum;
          var localStartDate = new Date(dateStartFromDatabase);
          var localStartDateString = localStartDate.toLocaleDateString();

          //Formattera slutdatum
          var dateEndFromDatabase = rows[i].slutdatum;
          var localEndDate = new Date(dateEndFromDatabase);
          var localEndDateString = localEndDate.toLocaleDateString();

            resp.write("<tr><td>" + rows[i].bokningsnr+" </td><td>" + rows[i].namn+" </td><td>" + rows[i].objektnamn+" </td><td>" + localStartDateString+" </td><td>" + localEndDateString+" </td></tr>\n");
        }

        resp.write("</tbody></table></div>")

        showFooter(resp);

        resp.end("</div></body>");
    }

    sqlConn.any('select namn, objektnamn, startdatum, slutdatum, bokningsnr from ((objekt join bokning on objekt.objektid=bokning.objektID) bokning join kund on bokning.pnr=kund.pnr)')
        .then(handleAllaBokningar)
        .catch(handleError);
}

// --------------- E-POSTLISTA -----------------
var sendNamnEpost = function(resp) {
     var handleNamnEpost = function(rows) {

       resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>E-postadresser</title>");

       showNavbar(resp);

       resp.write("<div class='container-fluid'>");
       resp.write("<div class='row'>")
       resp.write("<div class='col-sm-6'>")
       resp.write("<h1>E-postadresser</h1></div></div>\n");

       resp.write("<table class='table table-striped'><thead><tr><th scope='col'>Namn</th><th scope='col'>E-postadress</th></tr></thead>\n");
       resp.write("<tbody>")

        for (i = 0; i < rows.length; i++) {
            resp.write("<tr><td>"+rows[i].namn+"</td><td>"+rows[i].epost+"</tr></td>\n");
        }
        resp.write("</tbody></table>")

        showFooter(resp)

        resp.end("</div></body>");
    }



    sqlConn.any('select namn, epost from kund')
        .then(handleNamnEpost)
        .catch(handleError);
}


  // --------------------- Sök bokningar på kundnummer - STEG 1 ------------------

        var sendSokBokning = function(resp) {
        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Välkommen</title>");

        showNavbar(resp);

        resp.write("<div class='container-fluid'>");
        resp.write("<div class='row'>");
        resp.write("<div class='col-sm-6'>");
        resp.write("<h1>Sök bokningar</h1></div></div>\n");

        resp.write("<p><div class='row'>");
        resp.write("<div class='col-sm-4'>");

        resp.write("<p><form method='GET'><div class='form-group'>");
        resp.write("Ange personnummer på den person vars bokningar du önskar visa.")
        resp.write("<input type='text' class='form-control' name='kundnummer' placeholder='Personnummer'>\n");
        resp.write("</div>")
        resp.write("<div class='form-group mx-sm-3'>")
        resp.write("<button type='input' class='btn btn-primary'>Sök bokningar</button>")
        resp.write("</div>")

          var handleError = function(err) {
              resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
          }
          resp.write("</div></div></div><p>");
          showFooter(resp);
          resp.end("</div></body>");
  }
// ----------------- Sök kund på kundnummer / Visa resultat - STEG 2 --------------

var sendSearchKund = function(kundnummer, resp) {
    var handleSearch_Kund = function(rows) {

        resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Sök kund</title>\n");

        showNavbar(resp);

        resp.write("<div class='container-fluid'>");
        resp.write("<div class='row'>")
        resp.write("<div class='col-sm-12'>")


        resp.write("<h1>Visar alla bokningar gjorda av "+rows[0].namn+" ("+kundnummer+")"+"</h1></div></div>");
        resp.write("<table class='table table-hover'><thead><tr><th scope='col'>Bokningsnummer</th><th scope='col'>Plats</th><th scope='col'>Startdatum</th><th scope='col'>Slutdatum</th><th scope='col'>Elbilsplats</th></tr></thead>\n");
        resp.write("<tbody>")

        for (i = 0; i < rows.length; i++) {

        //Formattera startdatum
        var dateStartFromDatabase = rows[i].startdatum;
        var localStartDate = new Date(dateStartFromDatabase);
        var localStartDateString = localStartDate.toLocaleDateString();

        //Formattera slutdatum
        var dateEndFromDatabase = rows[i].slutdatum;
        var localEndDate = new Date(dateEndFromDatabase);
        var localEndDateString = localEndDate.toLocaleDateString();

        var defineElbilsplats = function(){
          if (rows[i].elbilsplats == 0){
              return 'Nej';
          }   else {
                return 'Ja';
          }
        }


        resp.write("<tr><td>" + rows[i].bokningsnr+" </td><<td>" + rows[i].objektnamn+" </td><td>" + localStartDateString+" </td><td>" + localEndDateString+" </td><td>" + defineElbilsplats()+" </td></tr>\n");
      }
      resp.write("</tbody></table></div>");

      showFooter(resp);

      resp.end("</div></body>");
    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
}
    sqlConn.any('select kund.namn, bokning.startdatum, bokning.slutdatum, bokning.bokningsnr, objekt.objektNamn, objekt.elbilsplats from ((kund join bokning on bokning.pnr=kund.pnr) inner join objekt on objekt.objektID=bokning.objektID) where bokning.pnr=$1;', [kundnummer])
        .then(handleSearch_Kund)
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
    } else if (req.url == "/sok_kund"){
            sendSokBokning(resp);
    } else if (parsed.pathname == "/sok_kund") {
            sendSearchKund(parsed.query.kundnummer, resp);
    } else {
        sendNotFound(req.url, resp);
    }
}

// ---------------- get it started! ----------------

var httpConn = http.createServer(handleWebRequest);
var port = 8888;
httpConn.listen(port);
console.log("Väntar på att någon ska surfa in på http://" + ip.address() + ":" + port);
