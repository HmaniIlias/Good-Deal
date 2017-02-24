//importing modules
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );

//creating a new express server
var app = express();

//Coder la fonction gooDeal : Est ce que le rapport qualité prix est supérieur ou inférieur aux appart vendu dans cet arrondssement

//setting EJS as the templating engine
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)
app.use( '/assets', express.static( 'assets' ) );


//makes the server respond to the '/' route and serving the 'home.ejs' template in the 'views' directory
app.get( '/', function ( req, res ) {
    res.render( 'home', {
        message: 'The Home Page!'
    });
});

//En cliquant sur submit avec un input ou il y l'url
app.get('/process', function (req, res){
  const url = req.query.lbcUrl //créée une constante lbcurl ??

  if(url){
    getLBCData(url, res, getMAEstimation)
  }
  else{
    res.render('home', { //????? Pourquoi ?
      error: 'URL is empty'
    });
  }
});

//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});


//function:
function getLBCData(lbcURL, routeResponse, callback){
  request(lbcURL, function(error, response, html){
    if(!error){
      let $ = cheerio.load(html);

      const lbcData = parseLBCData(html)

      if(lbcData){
        console.log('LBC Data;', lbcData)
        callback(lbcData, routeResponse)
      }
      else{
        routeResponse.render('home',{
          error: 'No data found'
        });
      }
    }
    else{
      routeResponse.render('pages/index',{
        error: 'Error loading the given URL.'
      });
    }
  });
}

function getMAEstimation( lbcData, routeResponse){
  
  if( lbcData.city && lbcData.postalCode && lbcData.surface && lbcData.price){
    const url = 'https://www.meilleursagents.com/prix-immobilier/{city}-{postalCode}/'
    .replace('{city}', lbcData.city.replace(/\_/g, '-') )
    .replace( '{postalCode}', lbcData.postalCode);
    
    console.log( 'MA URL :', url)
    
    request(url, function ( error, response, html){
      if (!error){
        let $ = cheerio.load(html);
        
        if($('meta[name=description]' ).get().length === 1 
           && $('meta[name=description]' ).get()[0].attribs 
           && $('meta[name=description]' ).get()[0].attribs.content){
          
          const maData = parseMAData($('meta[name=description]' ).get()[0].attribs.content ); 
          
          console.log( 'MA Data:', maData);
          
          if( maData.priceAppart && maData.priceHouse){
            routeResponse.render( 'home', { //Pourquoi 'pages/index' et pas home.ejs
              data: {
                lbcData,
                maData,
                deal: {
                  good: isGoodDeal(lbcData, maData)
                }
              }
            });
          }
        }
      }
    });
  }
}


function parseLBCData( html ){
	const $ = cheerio.load( html )

	const lbcDataArray = $( 'section.properties span.value' )

  //console.log(lbcDataArray.get(0) );

	return lbcData = {
		price: parseInt( $( lbcDataArray.get(0) ).text().replace( /\s/g, ''), 10),
		city : $( lbcDataArray.get(1)).text().trim().toLowerCase().replace(/\_|\s/g, '-').replace(/\-\d+/, ''),
		postalCode: $(lbcDataArray.get(1)).text().trim().toLowerCase().replace( /\D|\-/g, ''),
		type: $( lbcDataArray.get(2) ).text().toLowerCase(),
		surface: parseInt( $(lbcDataArray.get(4)).text().replace(/\s/g, ''), 10),
	}
}

function parseMAData( html ) {

    const priceAppartRegex = /\bappartement\b : (\d+) €/mi
    const priceHouseRegex = /\bmaison\b : (\d+) €/mi

    if ( html ) {
        const priceAppart = priceAppartRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceAppartRegex.exec( html )[1] : 0
        const priceHouse = priceHouseRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceHouseRegex.exec( html )[1] : 0

        return {
            priceAppart: parseInt( priceAppart, 10 ),
            priceHouse: parseInt( priceHouse, 10 )
        }
    }

    return {}

}

function isGoodDeal(lbcData, maData){

  var lbc_price_m = lbcData.price / lbcData.surface;

  if(lbcData.type == 'appartement'){
    var price_m_type = maData.priceAppart;
    var estimation = lbcData.surface * maData.priceAppart;
  }
  else {
    var price_m_type = maData.priceAppart;
    var estimation = lbcData.surface * maData.priceHouse;
  }

  if(lbcData.price > estimation){
    return {
      conclusion: "It's not a good deal !",
      price_m_type,
      estimation,
      lbc_price_m
    }
  }
  return {
    conclusion: "It's a good deal !",
    price_m_type,
    estimation,
    lbc_price_m
  }
}


