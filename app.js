//Bokningsapp av Pauline, Olliver och Mattias

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


// ------------ Helper functions ---------


/*
$('#exampleModal').on('show.bs.modal', function (event) {
  var button = $(event.relatedTarget) // Button that triggered the modal
  var recipient = button.data('whatever') // Extract info from data-* attributes
  // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
  // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
  var modal = $(this)
  modal.find('.modal-title').text('New message to ' + recipient)
  modal.find('.modal-body input').val(recipient)
})*/

// ------------ Navbar ---------
function showNavbar(resp, err){
  resp.write("<body><link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css' integrity='sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u' crossorigin='anonymous'>\n");
  resp.write("<nav class='navbar navbar-default'>");
  resp.write("<div class='container-fluid'>");
  resp.write("<div class='navbar-header'>");
  resp.write("<a class='navbar-brand' href='/'>");
  resp.write("<button type='button' class='btn btn-primary'>Home</button>");
  resp.write("</a></div></div></nav>");
}

// ------------ Footer ---------
function showFooter(resp, err){
resp.write("<div class='fixed-bottom'>");
resp.write("<img src='http://www.stockholmparkering.se/SiteAssets/siluett_med_byggkranar_gra_bg_h375.png' class='img-responsive' height=50% width=100%>");
resp.write("</div>");
}

// ------------ Footer ---------
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
    resp.write("<li class='list-group-item'><a href='boka'>Boka garageplats</a></li>\n");
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

    resp.write("</div></div></div></body>");
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

// --------------------- Skapa bokning: STEP 1 ------------------

    var sendSkapaBokning_step1 = function(resp) {

      resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bokningar</title>\n");
      resp.write("<h1>Skapa bokning:</h1>\n");
      resp.write("<p><form method='GET'>" + "Startdatum: "+"<input type='date' name='startdatum'>\n");
      resp.write("Slutdatum: "+"<input type='date' name='slutdatum'><br>\n");
      resp.write("<input type='submit' value='Sök lediga parkeringsplatser'></form>\n");

        var handleError = function(err) {
            resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
        }
        resp.end();
}
// ---------------- Skapa bokning: STEP 2

var sendSkapaBokning_step2 = function(startdatum, slutdatum, resp) {
var handleSkapaBokning_step2 = function(rows) {

  resp.write("<!DOCTYPE html><meta charset='UTF-8'><title>Bokningar</title>\n");
  resp.write("<h1>Skapa bokning - Steg 2</h1>\n");
  resp.write("<h5>Följande platser är bokningsbara:</h5><ul>\n");

          for (i = 0; i < rows.length; i++) {

            resp.write("<br><li>"+rows[i].objektnamn+"</li>\n");
  }

        resp.end("</ul>");

    }

    var handleError = function(err) {
        resp.end("<!DOCTYPE html><title>Fel!</title>Det blev fel! " + err);
  }

        sqlConn.any('select objekt.objektNamn, objektID from objekt where objekt.objektID not in (select bokning.objektID from (bokning join objekt on bokning.objektID = objekt.objektID) where bokning.startdatum <= $1  and bokning.slutdatum >= $1)', [startdatum, slutdatum])

          .then(data => {
          console.log('DATA', data)
          handleSkapaBokning_step2(); // print data;
          })
          .catch(error => {
          console.log('ERROR:', error);
          });

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
        resp.write("<input type='text' class='form-control' name='kundnummer' placeholer='Personnummer'>\n");
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
