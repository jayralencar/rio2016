var cheerio = require( 'cheerio' )
  , request = require( 'request' )
  , url     = require( 'url' )
  , replay  = require( 'request-replay' )
  , fs      = require( 'fs' )
  , async = require('async');

exports.calendar = function(mode, lang, callback ){
	switch( lang ){
		case 'pt_br':
			url = 'https://www.rio2016.com/calendario-e-resultados';
			break;
		case 'en':
			url = 'https://www.rio2016.com/en/schedule-and-results';
			break;
		case 'es':
			url = 'https://www.rio2016.com/es/calendario-y-resultados';
			break;
		case 'fr':
			url = 'https://www.rio2016.com/fr/calendrier-et-resultats';
			break;
	}
	replay(request(url, function( err, res, body ){
		if( err ){
			callback( err );
		}else{
			$ = cheerio.load(body);
			calendar = [];
			days = '.static-sport-daily-calendar__days';
			sports = '.schedule-general-table__sports.active tr';
			sportName = '.schedule-general-table__td--name';
			sportsDay = '.schedule-general-table__td';
			$( days ).each(function( index ){
				sportJSON = {};
				day = index + 3;
				$( sports ).each(function(){
					sport = $( this ).find( sportName ).text().trim();
					sportEvent = $( this ).find( sportsDay ).slice( index + 1 ).first().find( 'span' ).attr( 'class' );
					if( sportEvent ){
						if( sportEvent.search( "medal" ) > 0 ){
							sportJSON[sport] = "medal";
						}
						if( sportEvent.search( "competition" ) > 0 ){
							sportJSON[sport] = "competition";
						}
						if( sportEvent.search( "star" ) > 0 ){
							sportJSON[sport] = "cerimony";
						}
					}
				});
				calendar.push({
					day: day,
					events: sportJSON
				});
			});

			if( mode == 'full' ){
				callback( JSON.stringify( calendar ) );
			}

			if( !isNaN( mode ) ){
				for (var i = 0; i < calendar.length; i++) {
					if( calendar[i]['day'] == mode )
						callback( JSON.stringify( calendar[i]['events'] ) );
				}
			}
		}
	}));
}

exports.sport = function( mode, lang, callbackSport ){
	switch( lang ){
		case 'pt_br':
			url = 'https://www.rio2016.com/calendario-e-resultados';
			break;
		case 'en':
			url = 'https://www.rio2016.com/en/schedule-and-results';
			break;
		case 'es':
			url = 'https://www.rio2016.com/es/calendario-y-resultados';
			break;
		case 'fr':
			url = 'https://www.rio2016.com/fr/calendrier-et-resultats';
			break;
	}
	sportsJSON = [];
	sportsQueue = async.queue(function(task, callback){
		replay(request( task.url, function( err, res, body ){
			if( err ){
				callback( err );
			}else{
				$ = cheerio.load( body );
				base = 'https://www.rio2016.com/';
				sports = '.schedule-general-table__sports.active tr';
				sportName = '.schedule-general-table__td--name';
				$( sports ).each(function( index ){
					sport = $( this ).find( sportName ).text().trim();
					page = $( this ).find( sportName ).find( 'a' ).attr( 'href' );
					if( page !== undefined ){
						sportURL = base + page.replace( '/', '');
						sportQueue.push({url: sportURL, name: sport});
					}
				});
				callback();
			}
		}));
	}, 5);
	sportsQueue.push({url: url, mode: mode});
	
	sportQueue = async.queue(function(task, callback){
		request( task.url, function( err, res, body ){
			if( err ){
				callback();
			}else{
				$ = cheerio.load( body );
				description = $( '.page-info-paragraph' ).text().trim();
				maleJSON = [];
				femaleJSON = [];
				maleDOM = '.top-medalists-table__male-medalists table tbody tr';
				femaleDOM = '.top-medalists-table__female-medalists table tbody tr';
				$( maleDOM ).each(function(){
					maleJSON.push({
						name: $( this ).find( '.top-medalist-table__medalist-name' ).text().trim(),
						nationality: $( this ).find( '.top-medalist-table__medalist-country' ).text().trim(),
						gold: $( this ).find( '.top-medalist-table__gold-medal .top-medalist-table__number-medals' ).text().trim(),
						silver: $( this ).find( '.top-medalist-table__silver-medal .top-medalist-table__number-medals' ).text().trim(),
						bronze: $( this ).find( '.top-medalist-table__bronze-medal .top-medalist-table__number-medals' ).text().trim()
					})
				});
				$( femaleDOM ).each(function(){
					femaleJSON.push({
						name: $( this ).find( '.top-medalist-table__medalist-name' ).text().trim(),
						nationality: $( this ).find( '.top-medalist-table__medalist-country' ).text().trim(),
						gold: $( this ).find( '.top-medalist-table__gold-medal .top-medalist-table__number-medals' ).text().trim(),
						silver: $( this ).find( '.top-medalist-table__silver-medal .top-medalist-table__number-medals' ).text().trim(),
						bronze: $( this ).find( '.top-medalist-table__bronze-medal .top-medalist-table__number-medals' ).text().trim()
					})
				});
				sportsJSON.push({
					name: task.name,
					description: description,
					records: {
						male: maleJSON,
						female: femaleJSON,
					}
				});
				callback();
			}
		});
	}, 5);

	sportQueue.drain = function(){
		if( mode == 'all' ){
			callbackSport( JSON.stringify( sportsJSON ) );
		}else{
			for (var i = 0; i < sportsJSON.length; i++) {
				sportName = sportsJSON[i]['name'];
				if( sportName.toLowerCase() == mode.toLowerCase() ){
					callbackSport( JSON.stringify( sportsJSON[i] ) );
				}
			}
		}
	}
}